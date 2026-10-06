import { STATES, canTransition } from './states.js';
import {
  DEFAULT_MAX_DELAY_MS,
  DEFAULT_MIN_DELAY_MS,
  classifyReaction,
  randomDelay,
  reactionTime,
} from './timing.js';
import { ROUND_OUTCOME, isNewPersonalBest, summarize } from './stats.js';

/**
 * Ignore restart presses this soon after a round settles, so one double-tap
 * or a burst of early mashing can't skip straight past the result screen.
 */
export const DEFAULT_RESTART_LOCK_MS = 250;

/**
 * The reaction game as an explicit state machine:
 *   idle → waiting → go → result → waiting …
 *            └──→ tooSoon → waiting …
 *
 * Pure logic: no DOM, no Three.js, no timers. Time comes from the injected
 * `now()`. The cue fires from `tick()`, which the app calls once per animation
 * frame. That ties the cue timestamp to the frame that renders it.
 */
export function createReactionGame({
  now,
  random = Math.random,
  minDelayMs = DEFAULT_MIN_DELAY_MS,
  maxDelayMs = DEFAULT_MAX_DELAY_MS,
  restartLockMs = DEFAULT_RESTART_LOCK_MS,
  personalBest = null,
} = {}) {
  if (typeof now !== 'function') {
    throw new TypeError('createReactionGame: `now` must be a function');
  }

  const listeners = new Set();
  const rounds = [];

  let state = STATES.IDLE;
  let roundId = 0;
  let cueDueAt = null;
  let cueAt = null;
  let settledAt = -Infinity;
  let lastRound = null;
  let cancelReason = null;
  let best = personalBest;
  let stats = summarize(rounds);
  let snapshot = buildSnapshot();

  function buildSnapshot() {
    return Object.freeze({ state, roundId, lastRound, stats, personalBest: best, cancelReason });
  }

  function transition(to) {
    if (!canTransition(state, to)) {
      throw new Error(`Invalid transition: ${state} → ${to}`);
    }
    const from = state;
    state = to;
    snapshot = buildSnapshot();
    for (const listener of [...listeners]) listener(snapshot, from);
  }

  function startRound() {
    roundId += 1;
    cueDueAt = now() + randomDelay(random, minDelayMs, maxDelayMs);
    cueAt = null;
    cancelReason = null;
    transition(STATES.WAITING);
  }

  function settle(round, nextState) {
    rounds.push(round);
    stats = summarize(rounds);
    lastRound = Object.freeze(round);
    cueDueAt = null;
    settledAt = now();
    transition(nextState);
  }

  function recordFalseStart() {
    settle({ outcome: ROUND_OUTCOME.FALSE_START, ms: null, tier: null, isNewPersonalBest: false }, STATES.TOO_SOON);
  }

  function recordHit(ms) {
    const isNewBest = isNewPersonalBest(ms, best);
    if (isNewBest) best = ms;
    settle({ outcome: ROUND_OUTCOME.HIT, ms, tier: classifyReaction(ms), isNewPersonalBest: isNewBest }, STATES.RESULT);
  }

  /**
   * The single player action (click / tap / key). `at` is the input's timestamp
   * on the performance.now() timeline; defaults to now(). Returns whether the
   * press was handled.
   */
  function press(at = now()) {
    switch (state) {
      case STATES.IDLE:
        startRound();
        return true;
      case STATES.RESULT:
      case STATES.TOO_SOON:
        if (at - settledAt < restartLockMs) return false;
        startRound();
        return true;
      case STATES.WAITING:
        recordFalseStart();
        return true;
      case STATES.GO: {
        const ms = reactionTime(cueAt, at);
        if (ms === null) recordFalseStart();
        else recordHit(ms);
        return true;
      }
      default:
        return false;
    }
  }

  /**
   * Call once per animation frame, before rendering. When the delay has elapsed
   * it switches to `go` and stamps the cue time. Listeners (DOM + scene) run
   * synchronously, so the go state is painted by the frame this call is in.
   */
  function tick() {
    if (state !== STATES.WAITING) return false;
    const t = now();
    if (t < cueDueAt) return false;
    cueAt = t;
    transition(STATES.GO);
    return true;
  }

  /** Abort an in-flight round (waiting or go) without recording it. */
  function cancel(reason = 'cancelled') {
    if (state !== STATES.WAITING && state !== STATES.GO) return false;
    cueDueAt = null;
    cueAt = null;
    cancelReason = reason;
    transition(STATES.IDLE);
    return true;
  }

  /** Subscribe to state changes. The listener is called immediately with the current snapshot. */
  function subscribe(listener) {
    listeners.add(listener);
    listener(snapshot, null);
    return () => listeners.delete(listener);
  }

  return {
    press,
    tick,
    cancel,
    subscribe,
    getSnapshot: () => snapshot,
  };
}
