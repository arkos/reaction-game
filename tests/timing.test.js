import { describe, expect, it } from 'vitest';
import {
  classifyReaction,
  formatMs,
  randomDelay,
  reactionTime,
  resolveInputTime,
} from '../src/game/timing.js';

describe('randomDelay', () => {
  it('maps random() linearly onto [min, max)', () => {
    expect(randomDelay(() => 0)).toBe(1000);
    expect(randomDelay(() => 0.5)).toBe(3000);
    expect(randomDelay(() => 0.25, 2000, 6000)).toBe(3000);
  });

  it('never reaches max, even if random() misbehaves', () => {
    expect(randomDelay(() => 1)).toBeLessThan(5000);
    expect(randomDelay(() => 7)).toBeLessThan(5000);
    expect(randomDelay(() => -3)).toBe(1000);
  });

  it('rejects an invalid range', () => {
    expect(() => randomDelay(() => 0.5, 5000, 1000)).toThrow(RangeError);
    expect(() => randomDelay(() => 0.5, Number.NaN, 1000)).toThrow(RangeError);
  });
});

describe('reactionTime', () => {
  it('returns elapsed ms between cue and response', () => {
    expect(reactionTime(1000, 1234.5)).toBe(234.5);
    expect(reactionTime(1000, 1000)).toBe(0);
  });

  it('returns null when the response precedes the cue (false start)', () => {
    expect(reactionTime(1000, 999.9)).toBeNull();
  });
});

describe('resolveInputTime', () => {
  it('uses a valid event timestamp', () => {
    expect(resolveInputTime(990, 1000)).toBe(990);
  });

  it('falls back to now for missing, future, zero or stale (epoch-based) timestamps', () => {
    expect(resolveInputTime(undefined, 1000)).toBe(1000);
    expect(resolveInputTime(0, 1000)).toBe(1000);
    expect(resolveInputTime(1001, 1000)).toBe(1000);
    expect(resolveInputTime(1000 - 5000, 1000)).toBe(1000);
    expect(resolveInputTime(1_700_000_000_000, 1000)).toBe(1000);
  });
});

describe('classifyReaction', () => {
  it('buckets times into tiers at the boundaries', () => {
    expect(classifyReaction(150)).toBe('elite');
    expect(classifyReaction(180)).toBe('fast');
    expect(classifyReaction(229.9)).toBe('fast');
    expect(classifyReaction(230)).toBe('average');
    expect(classifyReaction(300)).toBe('slow');
    expect(classifyReaction(2000)).toBe('slow');
  });
});

describe('formatMs', () => {
  it('rounds to whole ms and shows a dash for missing values', () => {
    expect(formatMs(243.6)).toBe('244');
    expect(formatMs(null)).toBe('—');
    expect(formatMs(undefined)).toBe('—');
  });
});
