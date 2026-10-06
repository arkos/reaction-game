import { resolveInputTime } from '../game/timing.js';

const ACTIVATION_CODES = new Set(['Space', 'Enter', 'NumpadEnter']);
/** Window during which a synthetic click is assumed to duplicate a handled key/pointer press. */
const DUPLICATE_GUARD_MS = 400;
const OTHER_CONTROLS = 'a[href], button, input, select, textarea, [contenteditable="true"]';

function isActivationKey(event) {
  return ACTIVATION_CODES.has(event.code) || event.key === ' ' || event.key === 'Enter';
}

/**
 * Wires every input path to one `onPress(timestamp)` callback.
 *
 * - pointerdown (not click): fires on touch contact with no tap delay or
 *   "click on release" latency; covers mouse, touch and pen.
 * - keydown Space/Enter (not the button's native click, which for Space only
 *   fires on keyup and would add the key-hold time to every reaction).
 * - click with detail === 0: assistive tech (e.g. screen readers) often
 *   activates controls with only a synthetic click; deduped against the above.
 */
export function bindInput({ surface, onPress, now = () => performance.now(), target = window }) {
  let lastHandledAt = -Infinity;

  function fire(event) {
    const t = now();
    lastHandledAt = t;
    onPress(resolveInputTime(event.timeStamp, t));
  }

  function targetsOtherControl(event) {
    const node = event.target;
    return node instanceof Element && node !== surface && node.closest(OTHER_CONTROLS) !== null;
  }

  function onPointerDown(event) {
    if (!event.isPrimary || event.button !== 0) return;
    fire(event);
  }

  function onKeyDown(event) {
    if (!isActivationKey(event) || event.altKey || event.ctrlKey || event.metaKey) return;
    if (targetsOtherControl(event)) return;
    event.preventDefault(); // no page scroll, no delayed native button activation
    if (event.repeat) return; // holding the key must not spam presses
    fire(event);
  }

  function onKeyUp(event) {
    if (!isActivationKey(event) || targetsOtherControl(event)) return;
    event.preventDefault();
    lastHandledAt = now();
  }

  function onClick(event) {
    if (event.detail !== 0) return; // real pointer clicks were handled on pointerdown
    if (now() - lastHandledAt < DUPLICATE_GUARD_MS) return;
    fire(event);
  }

  const preventDefault = (event) => event.preventDefault();

  surface.addEventListener('pointerdown', onPointerDown, { passive: true });
  surface.addEventListener('click', onClick);
  surface.addEventListener('contextmenu', preventDefault); // long-press menu on mobile
  target.addEventListener('keydown', onKeyDown);
  target.addEventListener('keyup', onKeyUp);

  return function unbind() {
    surface.removeEventListener('pointerdown', onPointerDown);
    surface.removeEventListener('click', onClick);
    surface.removeEventListener('contextmenu', preventDefault);
    target.removeEventListener('keydown', onKeyDown);
    target.removeEventListener('keyup', onKeyUp);
  };
}
