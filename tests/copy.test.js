import { describe, expect, it } from 'vitest';
import { describeState } from '../src/ui/copy.js';
import { STATES } from '../src/game/states.js';

const result = (ms, extra = {}) => ({
  state: STATES.RESULT,
  lastRound: { outcome: 'hit', ms, tier: 'fast', isNewPersonalBest: false, ...extra },
});

describe('describeState', () => {
  it('gives every state distinct text, so the cue never relies on color alone', () => {
    const displays = [STATES.IDLE, STATES.WAITING, STATES.GO, STATES.TOO_SOON].map(
      (state) => describeState({ state }).display,
    );
    expect(new Set(displays).size).toBe(displays.length);
    expect(describeState({ state: STATES.GO }).display).toBe('GO!');
  });

  it('shows the rounded time and a human-average comparison on result', () => {
    const copy = describeState(result(212.6));
    expect(copy.display).toBe('213 ms');
    expect(copy.isDigits).toBe(true);
    expect(copy.message).toContain('Average human: ~250 ms');
    expect(copy.announcement).toContain('213 milliseconds');
  });

  it('celebrates a new personal best', () => {
    const copy = describeState(result(180, { isNewPersonalBest: true }));
    expect(copy.label).toMatch(/new personal best/i);
    expect(copy.announcement).toMatch(/new personal best/i);
  });

  it('explains a false start and that it was not recorded', () => {
    const copy = describeState({ state: STATES.TOO_SOON });
    expect(copy.display).toBe('Too soon!');
    expect(copy.message).toMatch(/wasn’t recorded/);
  });

  it('explains a round cancelled by a hidden tab', () => {
    const copy = describeState({ state: STATES.IDLE, cancelReason: 'hidden' });
    expect(copy.message).toMatch(/tab was hidden/);
  });
});
