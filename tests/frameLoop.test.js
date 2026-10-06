import { describe, expect, it } from 'vitest';
import { MAX_DELTA_S, createFrameLoop } from '../src/ui/frameLoop.js';

/** Fake rAF that runs frames only when told to. */
function fakeRaf() {
  let pending = new Map();
  let nextId = 1;
  return {
    requestFrame: (callback) => {
      const id = nextId++;
      pending.set(id, callback);
      return id;
    },
    cancelFrame: (id) => pending.delete(id),
    frame(time) {
      const callbacks = [...pending.values()];
      pending = new Map();
      callbacks.forEach((callback) => callback(time));
    },
    get pendingCount() {
      return pending.size;
    },
  };
}

describe('createFrameLoop', () => {
  it('runs subscribers in registration order within one frame (game tick before render)', () => {
    const raf = fakeRaf();
    const loop = createFrameLoop(raf);
    const order = [];
    loop.add(() => order.push('game.tick'));
    loop.add(() => order.push('scene.render'));
    loop.start();
    raf.frame(16);
    expect(order).toEqual(['game.tick', 'scene.render']);
  });

  it('passes a clamped delta in seconds, starting at 0', () => {
    const raf = fakeRaf();
    const loop = createFrameLoop(raf);
    const deltas = [];
    loop.add((_time, dt) => deltas.push(dt));
    loop.start();
    raf.frame(1000);
    raf.frame(1016);
    raf.frame(5000);
    expect(deltas[0]).toBe(0);
    expect(deltas[1]).toBeCloseTo(0.016, 6);
    expect(deltas[2]).toBe(MAX_DELTA_S);
  });

  it('stops and restarts cleanly without a delta spike after resuming', () => {
    const raf = fakeRaf();
    const loop = createFrameLoop(raf);
    const deltas = [];
    loop.add((_time, dt) => deltas.push(dt));
    loop.start();
    raf.frame(0);
    loop.stop();
    expect(loop.running).toBe(false);
    expect(raf.pendingCount).toBe(0);

    loop.start();
    raf.frame(60_000);
    expect(deltas).toEqual([0, 0]);
  });

  it('removes subscribers', () => {
    const raf = fakeRaf();
    const loop = createFrameLoop(raf);
    let calls = 0;
    const remove = loop.add(() => {
      calls += 1;
    });
    loop.start();
    raf.frame(0);
    remove();
    raf.frame(16);
    expect(calls).toBe(1);
  });
});
