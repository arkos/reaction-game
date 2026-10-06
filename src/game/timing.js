export const DEFAULT_MIN_DELAY_MS = 1000;
export const DEFAULT_MAX_DELAY_MS = 5000;
export const AVERAGE_HUMAN_MS = 250;

/** Max age of an event timestamp we still trust (guards against legacy epoch-based timestamps). */
const MAX_EVENT_AGE_MS = 1000;

/** Uniform random delay in [minMs, maxMs). `random` is injected so tests are deterministic. */
export function randomDelay(random, minMs = DEFAULT_MIN_DELAY_MS, maxMs = DEFAULT_MAX_DELAY_MS) {
  if (!(Number.isFinite(minMs) && Number.isFinite(maxMs) && maxMs >= minMs)) {
    throw new RangeError(`Invalid delay range: ${minMs}–${maxMs}`);
  }
  const r = Math.min(Math.max(random(), 0), 1 - Number.EPSILON);
  return minMs + r * (maxMs - minMs);
}

/**
 * Milliseconds between the cue and the response, or null when the response
 * happened before the cue, which is a false start, not a 0 ms reaction.
 */
export function reactionTime(cueAt, responseAt) {
  const elapsed = responseAt - cueAt;
  return elapsed >= 0 ? elapsed : null;
}

/**
 * Prefer the input event's own timestamp: it records when the OS/browser received
 * the input, so it excludes time the event spent queued behind other work on the
 * main thread. Both values share the performance.now() time origin. Falls back
 * to `nowMs` if the timestamp looks invalid.
 */
export function resolveInputTime(eventTimeStamp, nowMs) {
  const isValid =
    Number.isFinite(eventTimeStamp) &&
    eventTimeStamp > 0 &&
    eventTimeStamp <= nowMs &&
    nowMs - eventTimeStamp <= MAX_EVENT_AGE_MS;
  return isValid ? eventTimeStamp : nowMs;
}

export const REACTION_TIERS = Object.freeze([
  { id: 'elite', belowMs: 180 },
  { id: 'fast', belowMs: 230 },
  { id: 'average', belowMs: 300 },
  { id: 'slow', belowMs: Infinity },
]);

export function classifyReaction(ms) {
  return REACTION_TIERS.find((tier) => ms < tier.belowMs).id;
}

export function formatMs(ms) {
  return ms == null ? '—' : String(Math.round(ms));
}
