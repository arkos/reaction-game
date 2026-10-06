export const STORAGE_KEY = 'reaction-timer:personal-best-ms';

/**
 * Persists the all-time personal best. `storage` is any Web Storage-like object
 * (or null). Every access is wrapped: private mode, disabled cookies or a full
 * quota must never break the game. It just stops remembering.
 */
export function createBestTimeStore(storage, key = STORAGE_KEY) {
  return {
    load() {
      try {
        const raw = storage?.getItem(key);
        if (raw == null) return null;
        const value = Number(raw);
        return Number.isFinite(value) && value > 0 ? value : null;
      } catch {
        return null;
      }
    },

    save(ms) {
      if (!storage || !(Number.isFinite(ms) && ms > 0)) return false;
      try {
        storage.setItem(key, String(Math.round(ms * 10) / 10));
        return true;
      } catch {
        return false;
      }
    },
  };
}
