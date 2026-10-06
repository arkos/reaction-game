import { describe, expect, it } from 'vitest';
import { STORAGE_KEY, createBestTimeStore } from '../src/game/bestTimeStore.js';

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    data,
  };
}

const throwingStorage = {
  getItem() {
    throw new Error('SecurityError');
  },
  setItem() {
    throw new Error('QuotaExceededError');
  },
};

describe('createBestTimeStore', () => {
  it('round-trips a personal best', () => {
    const storage = memoryStorage();
    const store = createBestTimeStore(storage);
    expect(store.load()).toBeNull();
    expect(store.save(187.26)).toBe(true);
    expect(storage.data.get(STORAGE_KEY)).toBe('187.3');
    expect(store.load()).toBe(187.3);
  });

  it('ignores corrupt or nonsensical stored values', () => {
    for (const raw of ['', 'abc', '-5', '0', 'Infinity']) {
      expect(createBestTimeStore(memoryStorage({ [STORAGE_KEY]: raw })).load()).toBeNull();
    }
  });

  it('refuses to save invalid times', () => {
    const store = createBestTimeStore(memoryStorage());
    expect(store.save(Number.NaN)).toBe(false);
    expect(store.save(0)).toBe(false);
  });

  it('degrades gracefully when storage throws or is unavailable', () => {
    const broken = createBestTimeStore(throwingStorage);
    expect(broken.load()).toBeNull();
    expect(broken.save(200)).toBe(false);

    const missing = createBestTimeStore(null);
    expect(missing.load()).toBeNull();
    expect(missing.save(200)).toBe(false);
  });
});
