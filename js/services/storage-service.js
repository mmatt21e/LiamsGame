/*
 * StorageService — defensive IndexedDB wrapper.
 * Stores: 'profiles' (game progress), 'tracks' (custom tracks), 'meta' (app state).
 * If IndexedDB is unavailable or broken, falls back to an in-memory store so the
 * game keeps working (progress just won't survive a reload — the UI warns about it).
 * A save failure must NEVER crash the game: every operation resolves.
 */

const DB_NAME = 'mtg-db';
const DB_VERSION = 1;
const STORES = ['profiles', 'tracks', 'meta'];

class StorageService {
  constructor() {
    this.db = null;
    this.mode = 'unknown';         // 'idb' | 'memory'
    this.memory = { profiles: new Map(), tracks: new Map(), meta: new Map() };
    this.lastSaveTime = null;
    this.lastError = null;
  }

  async init() {
    if (typeof indexedDB === 'undefined') {
      this.mode = 'memory';
      return this.mode;
    }
    try {
      this.db = await new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          // Schema v1. Future versions: add migration steps here keyed on
          // event.oldVersion before creating new stores/indexes.
          for (const name of STORES) {
            if (!db.objectStoreNames.contains(name)) {
              db.createObjectStore(name, { keyPath: name === 'meta' ? 'key' : 'id' });
            }
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error || new Error('IndexedDB open failed'));
        req.onblocked = () => reject(new Error('IndexedDB blocked'));
        setTimeout(() => reject(new Error('IndexedDB open timeout')), 6000);
      });
      this.db.onversionchange = () => { try { this.db.close(); } catch (e) { /* ignore */ } };
      this.mode = 'idb';
    } catch (err) {
      this.lastError = String(err && err.message || err);
      this.mode = 'memory';
    }
    return this.mode;
  }

  _tx(store, mode, fn) {
    return new Promise((resolve) => {
      if (this.mode !== 'idb' || !this.db) {
        resolve(fn ? fn(null) : null);
        return;
      }
      let settled = false;
      const done = (v) => { if (!settled) { settled = true; resolve(v); } };
      try {
        const tx = this.db.transaction(store, mode);
        const os = tx.objectStore(store);
        const result = fn(os);
        tx.oncomplete = () => done(result && result.__req ? result.__req.result : result);
        tx.onerror = () => { this.lastError = String(tx.error); done(null); };
        tx.onabort = () => { this.lastError = String(tx.error); done(null); };
      } catch (err) {
        this.lastError = String(err && err.message || err);
        done(null);
      }
    });
  }

  async get(store, key) {
    if (this.mode !== 'idb') return this.memory[store].get(key) ?? null;
    return this._tx(store, 'readonly', (os) => ({ __req: os.get(key) }));
  }

  async getAll(store) {
    if (this.mode !== 'idb') return [...this.memory[store].values()];
    const result = await this._tx(store, 'readonly', (os) => ({ __req: os.getAll() }));
    return Array.isArray(result) ? result : [];
  }

  async put(store, value) {
    this.lastSaveTime = Date.now();
    if (this.mode !== 'idb') {
      const key = store === 'meta' ? value.key : value.id;
      this.memory[store].set(key, value);
      return true;
    }
    const ok = await this._tx(store, 'readwrite', (os) => { os.put(value); return true; });
    return !!ok;
  }

  async delete(store, key) {
    if (this.mode !== 'idb') { this.memory[store].delete(key); return true; }
    const ok = await this._tx(store, 'readwrite', (os) => { os.delete(key); return true; });
    return !!ok;
  }

  async clearStore(store) {
    if (this.mode !== 'idb') { this.memory[store].clear(); return true; }
    const ok = await this._tx(store, 'readwrite', (os) => { os.clear(); return true; });
    return !!ok;
  }

  async clearAll() {
    for (const s of STORES) await this.clearStore(s);
    return true;
  }

  get available() { return this.mode === 'idb'; }
}

/* Parse JSON without ever throwing. Returns fallback on any problem. */
export function safeParse(text, fallback = null) {
  try {
    const v = JSON.parse(text);
    return v === null || v === undefined ? fallback : v;
  } catch (e) {
    return fallback;
  }
}

export const storage = new StorageService();
