const FASTEST_MS = 150;
const SLOWEST_MS = 400;
const MIN_INTENSITY = 0.2;

/**
 * Maps a reaction time to a celebration intensity in [0.2, 1]:
 * 150 ms or faster → 1 (biggest burst), 400 ms or slower → 0.2.
 * Pure (no Three.js) so it is unit-tested.
 */
export function burstIntensity(ms) {
  if (!Number.isFinite(ms)) return MIN_INTENSITY;
  const t = (SLOWEST_MS - ms) / (SLOWEST_MS - FASTEST_MS);
  return Math.min(1, Math.max(MIN_INTENSITY, t));
}
