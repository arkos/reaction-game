const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** Tracks prefers-reduced-motion and reports live changes. */
export function watchReducedMotion(onChange) {
  const query = typeof window.matchMedia === 'function' ? window.matchMedia(REDUCED_MOTION_QUERY) : null;
  if (!query) return { matches: false, dispose() {} };

  const handler = (event) => onChange(event.matches);
  query.addEventListener?.('change', handler);
  return {
    get matches() {
      return query.matches;
    },
    dispose: () => query.removeEventListener?.('change', handler),
  };
}

/** Calls onHidden / onVisible as the tab visibility changes. */
export function watchVisibility({ onHidden, onVisible }) {
  const handler = () => (document.hidden ? onHidden() : onVisible());
  document.addEventListener('visibilitychange', handler);
  return () => document.removeEventListener('visibilitychange', handler);
}

/** Even reading `window.localStorage` can throw (e.g. storage blocked), so guard it. */
export function getLocalStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
