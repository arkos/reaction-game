export const ROUND_OUTCOME = Object.freeze({
  HIT: 'hit',
  FALSE_START: 'falseStart',
});

/**
 * Session statistics. Only valid hits count toward best/average/roundsPlayed;
 * false starts are tracked separately so they can never skew the numbers.
 */
export function summarize(rounds) {
  let best = null;
  let total = 0;
  let hits = 0;
  let falseStarts = 0;

  for (const round of rounds) {
    if (round.outcome === ROUND_OUTCOME.HIT && Number.isFinite(round.ms)) {
      hits += 1;
      total += round.ms;
      if (best === null || round.ms < best) best = round.ms;
    } else if (round.outcome === ROUND_OUTCOME.FALSE_START) {
      falseStarts += 1;
    }
  }

  return Object.freeze({
    best,
    average: hits > 0 ? total / hits : null,
    roundsPlayed: hits,
    falseStarts,
  });
}

export function isNewPersonalBest(ms, personalBest) {
  return personalBest == null || ms < personalBest;
}
