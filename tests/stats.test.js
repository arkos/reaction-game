import { describe, expect, it } from 'vitest';
import { ROUND_OUTCOME, isNewPersonalBest, summarize } from '../src/game/stats.js';

const hit = (ms) => ({ outcome: ROUND_OUTCOME.HIT, ms });
const falseStart = () => ({ outcome: ROUND_OUTCOME.FALSE_START, ms: null });

describe('summarize', () => {
  it('returns empty stats for no rounds', () => {
    expect(summarize([])).toEqual({ best: null, average: null, roundsPlayed: 0, falseStarts: 0 });
  });

  it('computes best and average over hits', () => {
    expect(summarize([hit(300), hit(200), hit(250)])).toEqual({
      best: 200,
      average: 250,
      roundsPlayed: 3,
      falseStarts: 0,
    });
  });

  it('ignores false starts for best, average and rounds played', () => {
    const stats = summarize([falseStart(), hit(220), falseStart(), hit(280)]);
    expect(stats).toEqual({ best: 220, average: 250, roundsPlayed: 2, falseStarts: 2 });
  });

  it('keeps stats empty when every round was a false start', () => {
    expect(summarize([falseStart(), falseStart()])).toEqual({
      best: null,
      average: null,
      roundsPlayed: 0,
      falseStarts: 2,
    });
  });

  it('ignores malformed hits', () => {
    expect(summarize([hit(Number.NaN), hit(200)]).roundsPlayed).toBe(1);
  });
});

describe('isNewPersonalBest', () => {
  it('is true when there is no previous best or the time is faster', () => {
    expect(isNewPersonalBest(300, null)).toBe(true);
    expect(isNewPersonalBest(199, 200)).toBe(true);
  });

  it('is false for equal or slower times', () => {
    expect(isNewPersonalBest(200, 200)).toBe(false);
    expect(isNewPersonalBest(250, 200)).toBe(false);
  });
});
