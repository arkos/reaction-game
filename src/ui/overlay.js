import { formatMs } from '../game/timing.js';
import { describeState } from './copy.js';

function setText(node, text) {
  // Skip no-op writes: avoids needless style/layout work on every emission.
  if (node.textContent !== text) node.textContent = text;
}

function withUnit(ms) {
  return ms == null ? '—' : `${formatMs(ms)} ms`;
}

/** Renders game snapshots into the DOM overlay. Owns no game rules. */
export function createOverlay(doc = document) {
  const byId = (id) => doc.getElementById(id);
  const el = {
    root: doc.documentElement,
    label: byId('status-label'),
    display: byId('display'),
    message: byId('message'),
    hint: byId('hint'),
    announcer: byId('announcer'),
    best: byId('stat-best'),
    average: byId('stat-average'),
    rounds: byId('stat-rounds'),
    personalBest: byId('stat-personal-best'),
  };

  let lastAnnouncement = '';
  let padRepeat = false;

  function announce(text) {
    // Live regions ignore unchanged text, so alternate an invisible suffix on repeats.
    padRepeat = text === lastAnnouncement ? !padRepeat : false;
    lastAnnouncement = text;
    el.announcer.textContent = padRepeat ? `${text} ` : text;
  }

  function render(snapshot, previousState) {
    const copy = describeState(snapshot);

    // One attribute drives all state styling (card, CSS fallback backdrop).
    el.root.dataset.state = snapshot.state;
    setText(el.label, copy.label);
    setText(el.display, copy.display);
    setText(el.message, copy.message);
    setText(el.hint, copy.hint);
    el.display.classList.toggle('is-digits', copy.isDigits);

    const { stats, personalBest } = snapshot;
    setText(el.best, withUnit(stats.best));
    setText(el.average, withUnit(stats.average));
    setText(el.rounds, String(stats.roundsPlayed));
    setText(el.personalBest, withUnit(personalBest));

    // previousState is null for the initial render: don't announce on page load.
    if (previousState != null && previousState !== snapshot.state) announce(copy.announcement);
  }

  return { render };
}
