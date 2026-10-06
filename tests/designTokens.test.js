import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { COLORS } from '../src/config/colors.js';
import { burstIntensity } from '../src/scene/burst.js';

describe('design tokens', () => {
  it('keeps CSS custom properties and the JS scene palette in sync', () => {
    const css = readFileSync(new URL('../src/styles/main.css', import.meta.url), 'utf8');
    for (const [name, hex] of Object.entries(COLORS)) {
      const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
      expect(match, `--${name} missing from main.css`).not.toBeNull();
      expect(match[1].toUpperCase()).toBe(hex.toUpperCase());
    }
  });
});

describe('burstIntensity', () => {
  it('gives faster reactions a bigger celebration, clamped to [0.2, 1]', () => {
    expect(burstIntensity(120)).toBe(1);
    expect(burstIntensity(150)).toBe(1);
    expect(burstIntensity(275)).toBeCloseTo(0.5, 6);
    expect(burstIntensity(400)).toBe(0.2);
    expect(burstIntensity(900)).toBe(0.2);
    expect(burstIntensity(Number.NaN)).toBe(0.2);
    expect(burstIntensity(200)).toBeGreaterThan(burstIntensity(300));
  });
});
