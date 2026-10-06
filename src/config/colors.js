/**
 * Single JS source of truth for the palette, used by the Three.js scene.
 * Mirrors the CSS custom properties on :root in src/styles/main.css;
 * tests/designTokens.test.js fails if the two drift apart.
 */
export const COLORS = Object.freeze({
  bg: '#0F1115',
  surface: '#1A1D24',
  text: '#F2F4F7',
  muted: '#9AA3B2',
  accent: '#7C5CFF',
  wait: '#2B2F6B',
  go: '#2EE59D',
  early: '#FF6B6B',
});
