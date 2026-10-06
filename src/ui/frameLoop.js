/** Clamp per-frame delta so a stalled frame or resumed tab can't make animations jump. */
export const MAX_DELTA_S = 0.1;

/**
 * The app's single requestAnimationFrame loop. Subscribers run in registration
 * order inside the same callback. main.js registers the game tick first and
 * the scene render last, so a cue that fires in a frame is rendered in that frame.
 */
export function createFrameLoop({
  requestFrame = (callback) => requestAnimationFrame(callback),
  cancelFrame = (id) => cancelAnimationFrame(id),
} = {}) {
  const subscribers = [];
  let frameId = null;
  let lastTime = null;

  function onFrame(time) {
    // Schedule first so one throwing subscriber can't kill the loop.
    frameId = requestFrame(onFrame);
    const dt = lastTime === null ? 0 : Math.min((time - lastTime) / 1000, MAX_DELTA_S);
    lastTime = time;
    // Indexed loop: no iterator/closure allocation per frame.
    for (let i = 0; i < subscribers.length; i += 1) subscribers[i](time, dt);
  }

  return {
    add(subscriber) {
      subscribers.push(subscriber);
      return () => {
        const index = subscribers.indexOf(subscriber);
        if (index !== -1) subscribers.splice(index, 1);
      };
    },
    start() {
      if (frameId !== null) return;
      lastTime = null;
      frameId = requestFrame(onFrame);
    },
    stop() {
      if (frameId === null) return;
      cancelFrame(frameId);
      frameId = null;
    },
    get running() {
      return frameId !== null;
    },
  };
}
