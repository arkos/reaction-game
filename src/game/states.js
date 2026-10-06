export const STATES = Object.freeze({
  IDLE: 'idle',
  WAITING: 'waiting',
  GO: 'go',
  RESULT: 'result',
  TOO_SOON: 'tooSoon',
});

/**
 * Every legal transition. Anything not listed is a programming error.
 * go → tooSoon covers an input whose event timestamp precedes the cue
 * (it happened before the cue frame but was dispatched after it).
 * waiting/go → idle is a cancellation (e.g. the tab was hidden).
 */
export const TRANSITIONS = Object.freeze({
  [STATES.IDLE]: [STATES.WAITING],
  [STATES.WAITING]: [STATES.GO, STATES.TOO_SOON, STATES.IDLE],
  [STATES.GO]: [STATES.RESULT, STATES.TOO_SOON, STATES.IDLE],
  [STATES.RESULT]: [STATES.WAITING],
  [STATES.TOO_SOON]: [STATES.WAITING],
});

export function canTransition(from, to) {
  return TRANSITIONS[from]?.includes(to) ?? false;
}
