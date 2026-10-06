import { describe, expect, it } from 'vitest';
import { createReactionGame, DEFAULT_RESTART_LOCK_MS } from '../src/game/reactionGame.js';
import { STATES } from '../src/game/states.js';

/** Deterministic harness: manual clock, fixed random (0.5 → 3000 ms delay). */
function setup(options = {}) {
  let time = 0;
  const clock = {
    now: () => time,
    advance: (ms) => {
      time += ms;
    },
  };
  const game = createReactionGame({ now: clock.now, random: () => 0.5, ...options });
  const transitions = [];
  game.subscribe((snapshot, previous) => {
    if (previous !== null) transitions.push(`${previous}→${snapshot.state}`);
  });
  return { game, clock, transitions };
}

/** Starts a round (if needed) and advances ~60 Hz frames until the cue fires, as the frame loop would. */
function reachGo({ game, clock }, frameMs = 16) {
  if (game.getSnapshot().state !== STATES.WAITING) game.press();
  for (let frame = 0; frame < 1000; frame += 1) {
    if (game.tick()) return;
    clock.advance(frameMs);
  }
  throw new Error(`Cue never fired (state: ${game.getSnapshot().state})`);
}

describe('createReactionGame', () => {
  it('requires an injected clock', () => {
    expect(() => createReactionGame({})).toThrow(TypeError);
  });

  it('starts idle and emits the current snapshot on subscribe', () => {
    const game = createReactionGame({ now: () => 0 });
    const seen = [];
    game.subscribe((snapshot, previous) => seen.push([snapshot.state, previous]));
    expect(seen).toEqual([[STATES.IDLE, null]]);
  });

  it('moves idle → waiting on press, and waiting → go only once the delay elapses', () => {
    const h = setup();
    h.game.press();
    expect(h.game.getSnapshot().state).toBe(STATES.WAITING);

    h.clock.advance(2999);
    expect(h.game.tick()).toBe(false);
    expect(h.game.getSnapshot().state).toBe(STATES.WAITING);

    h.clock.advance(1);
    expect(h.game.tick()).toBe(true);
    expect(h.transitions).toEqual(['idle→waiting', 'waiting→go']);
  });

  it('draws the delay from the injected random within 1–5 s', () => {
    const atMin = setup({ random: () => 0 });
    atMin.game.press();
    atMin.clock.advance(999);
    expect(atMin.game.tick()).toBe(false);
    atMin.clock.advance(1);
    expect(atMin.game.tick()).toBe(true);

    const nearMax = setup({ random: () => 0.999999 });
    nearMax.game.press();
    nearMax.clock.advance(4990);
    expect(nearMax.game.tick()).toBe(false);
    nearMax.clock.advance(10);
    expect(nearMax.game.tick()).toBe(true);
  });

  it('measures reaction time from the cue timestamp stamped in tick()', () => {
    const h = setup();
    h.game.press();
    h.clock.advance(3010); // the frame that renders the cue lands 10 ms after the due time
    h.game.tick();
    h.game.press(3010 + 237.4); // input event timestamp

    const { state, lastRound } = h.game.getSnapshot();
    expect(state).toBe(STATES.RESULT);
    expect(lastRound.outcome).toBe('hit');
    expect(lastRound.ms).toBeCloseTo(237.4, 5);
    expect(lastRound.tier).toBe('average');
  });

  it('uses now() as the response time when no timestamp is given', () => {
    const h = setup();
    reachGo(h);
    h.clock.advance(180);
    h.game.press();
    expect(h.game.getSnapshot().lastRound.ms).toBe(180);
  });

  it('treats a press during waiting as a false start and does not record it', () => {
    const h = setup();
    h.game.press();
    h.clock.advance(1200);
    h.game.press();

    const { state, stats, lastRound } = h.game.getSnapshot();
    expect(state).toBe(STATES.TOO_SOON);
    expect(lastRound.outcome).toBe('falseStart');
    expect(stats).toMatchObject({ roundsPlayed: 0, best: null, average: null, falseStarts: 1 });
  });

  it('treats an input that happened before the cue frame as a false start', () => {
    const h = setup();
    reachGo(h);
    const cueAt = h.clock.now();
    h.game.press(cueAt - 5); // queued event dispatched after the cue frame
    expect(h.game.getSnapshot().state).toBe(STATES.TOO_SOON);
  });

  it('never fires the cue after a false start', () => {
    const h = setup();
    h.game.press();
    h.game.press();
    h.clock.advance(10_000);
    expect(h.game.tick()).toBe(false);
    expect(h.game.getSnapshot().state).toBe(STATES.TOO_SOON);
  });

  it('restarts from result or tooSoon with one press after a short lock', () => {
    const h = setup();
    h.game.press();
    h.game.press(); // false start
    expect(h.game.press(h.clock.now() + DEFAULT_RESTART_LOCK_MS - 1)).toBe(false);
    expect(h.game.getSnapshot().state).toBe(STATES.TOO_SOON);

    h.clock.advance(DEFAULT_RESTART_LOCK_MS);
    expect(h.game.press()).toBe(true);
    expect(h.game.getSnapshot()).toMatchObject({ state: STATES.WAITING, roundId: 2 });

    reachGo(h);
    h.clock.advance(200);
    h.game.press();
    h.clock.advance(DEFAULT_RESTART_LOCK_MS);
    h.game.press();
    expect(h.game.getSnapshot()).toMatchObject({ state: STATES.WAITING, roundId: 3 });
  });

  it('computes session stats from valid rounds only', () => {
    const h = setup({ restartLockMs: 0 });
    const play = (ms) => {
      reachGo(h);
      h.clock.advance(ms);
      h.game.press();
    };

    play(300);
    h.game.press();
    h.game.press(); // false start
    play(200);
    play(250);

    expect(h.game.getSnapshot().stats).toEqual({ best: 200, average: 250, roundsPlayed: 3, falseStarts: 1 });
  });

  it('tracks the all-time personal best, seeded from storage', () => {
    const h = setup({ personalBest: 210, restartLockMs: 0 });
    reachGo(h);
    h.clock.advance(250);
    h.game.press();
    expect(h.game.getSnapshot()).toMatchObject({ personalBest: 210, lastRound: { isNewPersonalBest: false } });

    h.game.press();
    h.clock.advance(3000);
    h.game.tick();
    h.clock.advance(190);
    h.game.press();
    expect(h.game.getSnapshot()).toMatchObject({ personalBest: 190, lastRound: { isNewPersonalBest: true } });
  });

  it('cancels an in-flight round back to idle without recording it', () => {
    const h = setup();
    h.game.press();
    expect(h.game.cancel('hidden')).toBe(true);
    expect(h.game.getSnapshot()).toMatchObject({ state: STATES.IDLE, cancelReason: 'hidden' });

    reachGo(h);
    expect(h.game.getSnapshot().cancelReason).toBeNull();
    expect(h.game.cancel('hidden')).toBe(true);
    expect(h.game.getSnapshot().stats.roundsPlayed).toBe(0);
    expect(h.game.getSnapshot().stats.falseStarts).toBe(0);
  });

  it('ignores cancel when no round is in flight', () => {
    const h = setup();
    expect(h.game.cancel()).toBe(false);
    expect(h.transitions).toEqual([]);
  });

  it('ignores tick() outside the waiting state', () => {
    const h = setup();
    h.clock.advance(10_000);
    expect(h.game.tick()).toBe(false);
    expect(h.game.getSnapshot().state).toBe(STATES.IDLE);
  });

  it('stops notifying after unsubscribe', () => {
    const game = createReactionGame({ now: () => 0 });
    let calls = 0;
    const unsubscribe = game.subscribe(() => {
      calls += 1;
    });
    unsubscribe();
    game.press();
    expect(calls).toBe(1); // only the initial emission
  });

  it('exposes immutable snapshots', () => {
    const h = setup();
    expect(Object.isFrozen(h.game.getSnapshot())).toBe(true);
  });
});
