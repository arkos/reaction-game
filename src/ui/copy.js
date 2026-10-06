import { STATES } from '../game/states.js';
import { AVERAGE_HUMAN_MS, formatMs } from '../game/timing.js';

const TIER_COPY = Object.freeze({
  elite: 'Elite reflexes!',
  fast: 'Fast, quicker than most people.',
  average: 'Solid, right around typical.',
  slow: 'Warming up. Practice helps a lot.',
});

const START_HINT = 'Tap, click, or press Space to start';
const REPLAY_HINT = 'Tap, click, or press Space to go again';

/**
 * Maps a game snapshot to all user-facing text. Pure, so it is unit-tested.
 * Every state has distinct wording, so the cue never relies on color alone.
 */
export function describeState({ state, lastRound, cancelReason }) {
  switch (state) {
    case STATES.WAITING:
      return {
        label: 'Get ready',
        display: 'Wait…',
        isDigits: false,
        message: 'Respond the moment you see GO.',
        hint: 'Responding early counts as a false start',
        announcement: 'Wait for it.',
      };

    case STATES.GO:
      return {
        label: 'Now!',
        display: 'GO!',
        isDigits: false,
        message: 'Tap, click, or press Space now!',
        hint: '',
        announcement: 'Go!',
      };

    case STATES.TOO_SOON:
      return {
        label: 'False start',
        display: 'Too soon!',
        isDigits: false,
        message: 'You responded before the cue, so this round wasn’t recorded.',
        hint: 'Tap, click, or press Space to retry',
        announcement: 'Too soon! Round not recorded. Press Space to retry.',
      };

    case STATES.RESULT: {
      const ms = formatMs(lastRound.ms);
      const verdict = TIER_COPY[lastRound.tier];
      const newBest = lastRound.isNewPersonalBest;
      return {
        label: newBest ? 'New personal best!' : 'Your reaction time',
        display: `${ms} ms`,
        isDigits: true,
        message: `${verdict} Average human: ~${AVERAGE_HUMAN_MS} ms.`,
        hint: REPLAY_HINT,
        announcement: `${ms} milliseconds. ${verdict}${newBest ? ' New personal best.' : ''}`,
      };
    }

    case STATES.IDLE:
    default: {
      const cancelled = cancelReason != null;
      return {
        label: 'Reaction test',
        display: 'Ready',
        isDigits: false,
        message:
          cancelReason === 'hidden'
            ? 'Round cancelled because the tab was hidden.'
            : 'Wait for the cue, then respond as fast as you can.',
        hint: START_HINT,
        announcement: cancelled ? 'Round cancelled. Press Space to start again.' : 'Ready.',
      };
    }
  }
}
