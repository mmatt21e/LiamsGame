/*
 * ProfileService — up to 4 local player profiles.
 * Owns: profile CRUD, bolts, unlocks, achievements, settings,
 * custom track CRUD, export/import with validation, schema migration.
 * Emits events: 'change' (current profile data changed),
 *               'achievement' (detail: achievement def),
 *               'bolts' (detail: {delta, total}).
 */

import { CONFIG, DEFAULT_SETTINGS, PRESET_NAMES, AVATARS } from '../config.js';
import { STARTER_VEHICLES, VEHICLES, CUSTOMIZATION, DEFAULT_CUSTOM } from '../data/vehicles.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { adventureTracks } from '../data/tracks.js';
import { storage, safeParse } from './storage-service.js';

const PROFILE_SCHEMA = 1;

function uid(prefix) {
  return prefix + '-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e6).toString(36);
}

function cleanString(value, maxLen, fallback = '') {
  if (typeof value !== 'string') return fallback;
  // Strip control chars, trim, clamp length. Never rendered as HTML (textContent only).
  const s = value.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, maxLen);
  return s || fallback;
}

function cleanInt(value, min, max, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function defaultStats() {
  return {
    races: 0, boxes: 0, bigJumps: 0, jumps: 0, boltsCollected: 0,
    hiddenStars: 0, tracksBuilt: 0, customized: 0, playMs: 0,
    vehiclesTried: []
  };
}

export function defaultProfile(name, avatar) {
  return {
    id: uid('p'),
    schema: PROFILE_SCHEMA,
    name: cleanString(name, CONFIG.maxNameLength, 'Racer'),
    avatar: AVATARS.includes(avatar) ? avatar : AVATARS[0],
    bolts: 0,
    unlockedVehicles: [...STARTER_VEHICLES],
    selectedVehicle: STARTER_VEHICLES[0],
    customization: {},          // vehicleId -> {color, wheels, tires, decal, accessory, glow}
    ownedItems: [],             // "category:id" for purchased cosmetics
    completedTracks: {},        // trackId -> {bestTime, stars, boltsEarned, times}
    achievements: [],           // achievement ids
    settings: { ...DEFAULT_SETTINGS },
    stats: defaultStats(),
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

/*
 * Validate + repair anything claiming to be a profile (from disk or import).
 * Unknown fields are dropped; missing fields get safe defaults; bad values are
 * clamped. Returns a fresh clean object or null if it's not usable at all.
 */
export function sanitizeProfile(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const base = defaultProfile('Racer', AVATARS[0]);
  const p = base;

  if (typeof raw.id === 'string' && /^[\w-]{1,40}$/.test(raw.id)) p.id = raw.id;
  p.name = cleanString(raw.name, CONFIG.maxNameLength, 'Racer');
  if (AVATARS.includes(raw.avatar)) p.avatar = raw.avatar;
  p.bolts = cleanInt(raw.bolts, 0, 999999, 0);

  const vehicleIds = VEHICLES.map((v) => v.id);
  if (Array.isArray(raw.unlockedVehicles)) {
    p.unlockedVehicles = [...new Set([
      ...STARTER_VEHICLES,
      ...raw.unlockedVehicles.filter((v) => vehicleIds.includes(v))
    ])];
  }
  if (vehicleIds.includes(raw.selectedVehicle) && p.unlockedVehicles.includes(raw.selectedVehicle)) {
    p.selectedVehicle = raw.selectedVehicle;
  }

  if (raw.customization && typeof raw.customization === 'object') {
    for (const [vid, cust] of Object.entries(raw.customization)) {
      if (!vehicleIds.includes(vid) || !cust || typeof cust !== 'object') continue;
      const clean = { ...DEFAULT_CUSTOM };
      const catMap = { color: 'colors', wheels: 'wheels', tires: 'tires', decal: 'decals', accessory: 'accessories', glow: 'glows' };
      for (const [field, cat] of Object.entries(catMap)) {
        if (CUSTOMIZATION[cat].some((o) => o.id === cust[field])) clean[field] = cust[field];
      }
      p.customization[vid] = clean;
    }
  }

  if (Array.isArray(raw.ownedItems)) {
    p.ownedItems = raw.ownedItems.filter((s) => typeof s === 'string' && /^[a-z]+:[\w-]+$/.test(s)).slice(0, 200);
  }

  if (raw.completedTracks && typeof raw.completedTracks === 'object') {
    for (const [tid, rec] of Object.entries(raw.completedTracks)) {
      if (!/^[\w-]{1,40}$/.test(tid) || !rec || typeof rec !== 'object') continue;
      p.completedTracks[tid] = {
        bestTime: cleanInt(rec.bestTime, 0, 3600000, 0),
        stars: cleanInt(rec.stars, 1, 3, 1),
        times: cleanInt(rec.times, 1, 100000, 1)
      };
    }
  }

  const achIds = ACHIEVEMENTS.map((a) => a.id);
  if (Array.isArray(raw.achievements)) {
    p.achievements = [...new Set(raw.achievements.filter((a) => achIds.includes(a)))];
  }

  if (raw.settings && typeof raw.settings === 'object') {
    const s = { ...DEFAULT_SETTINGS };
    if (['easy', 'normal', 'challenge'].includes(raw.settings.difficulty)) s.difficulty = raw.settings.difficulty;
    for (const k of ['soundVolume', 'musicVolume']) {
      const n = Number(raw.settings[k]);
      if (Number.isFinite(n)) s[k] = Math.min(1, Math.max(0, n));
    }
    for (const k of ['muted', 'highContrast', 'largeUI', 'screenShake', 'leftHanded', 'autoAccel', 'tts']) {
      if (typeof raw.settings[k] === 'boolean') s[k] = raw.settings[k];
    }
    if (['auto', 'on', 'off'].includes(raw.settings.reducedMotion)) s.reducedMotion = raw.settings.reducedMotion;
    p.settings = s;
  }

  if (raw.stats && typeof raw.stats === 'object') {
    const st = defaultStats();
    for (const k of ['races', 'boxes', 'bigJumps', 'jumps', 'boltsCollected', 'hiddenStars', 'tracksBuilt', 'customized']) {
      st[k] = cleanInt(raw.stats[k], 0, 1e9, 0);
    }
    st.playMs = cleanInt(raw.stats.playMs, 0, 1e12, 0);
    if (Array.isArray(raw.stats.vehiclesTried)) {
      st.vehiclesTried = [...new Set(raw.stats.vehiclesTried.filter((v) => vehicleIds.includes(v)))];
    }
    p.stats = st;
  }

  p.createdAt = cleanInt(raw.createdAt, 0, 9e13, Date.now());
  p.updatedAt = Date.now();
  p.schema = PROFILE_SCHEMA;
  return p;
}

/* Migrate an older on-disk profile to the current schema. */
function migrateProfile(raw) {
  if (!raw || typeof raw !== 'object') return null;
  // v0 → v1 (and any future steps) all funnel through sanitizeProfile,
  // which fills defaults for fields introduced later.
  return sanitizeProfile(raw);
}

/* ---------- Custom track validation ---------- */

const TRACK_CHARS = /^[.#RDMSIBJZFK1bXCTH]+$/;

export function sanitizeCustomTrack(raw, profileId) {
  if (!raw || typeof raw !== 'object') return null;
  if (!Array.isArray(raw.grid) || raw.grid.length < 4 || raw.grid.length > 40) return null;
  const width = typeof raw.grid[0] === 'string' ? raw.grid[0].length : 0;
  if (width < 4 || width > 60) return null;
  let starts = 0;
  for (const row of raw.grid) {
    if (typeof row !== 'string' || row.length !== width || !TRACK_CHARS.test(row)) return null;
    starts += (row.match(/1/g) || []).length;
  }
  if (starts !== 1) return null;
  return {
    id: typeof raw.id === 'string' && /^[\w-]{1,40}$/.test(raw.id) ? raw.id : uid('t'),
    profileId,
    name: cleanString(raw.name, 24, 'My Track'),
    emoji: '🧩',
    theme: (raw.theme in { backyard: 1, construction: 1, desert: 1, mud: 1, arctic: 1, neon: 1, volcano: 1 }) ? raw.theme : 'backyard',
    parSeconds: cleanInt(raw.parSeconds, 0, 600, 0),
    custom: true,
    grid: [...raw.grid],
    createdAt: cleanInt(raw.createdAt, 0, 9e13, Date.now()),
    updatedAt: Date.now()
  };
}

/* ---------- The service ---------- */

class ProfileService extends EventTarget {
  constructor() {
    super();
    this.profiles = [];
    this.current = null;
    this._saveTimer = null;
  }

  async init() {
    const rows = await storage.getAll('profiles');
    this.profiles = rows.map(migrateProfile).filter(Boolean);
    const meta = await storage.get('meta', 'lastProfileId');
    const lastId = meta && meta.value;
    this.current = this.profiles.find((p) => p.id === lastId) || null;
  }

  get settings() {
    return this.current ? this.current.settings : { ...DEFAULT_SETTINGS };
  }

  async selectProfile(id) {
    const p = this.profiles.find((x) => x.id === id);
    if (!p) return false;
    this.current = p;
    await storage.put('meta', { key: 'lastProfileId', value: id });
    this._emitChange();
    return true;
  }

  async createProfile(name, avatar) {
    if (this.profiles.length >= CONFIG.maxProfiles) return null;
    const p = defaultProfile(name, avatar);
    this.profiles.push(p);
    await storage.put('profiles', p);
    await this.selectProfile(p.id);
    return p;
  }

  async deleteProfile(id) {
    const idx = this.profiles.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    this.profiles.splice(idx, 1);
    await storage.delete('profiles', id);
    // Remove that profile's custom tracks too.
    const tracks = await storage.getAll('tracks');
    for (const t of tracks) if (t.profileId === id) await storage.delete('tracks', t.id);
    if (this.current && this.current.id === id) this.current = null;
    this._emitChange();
    return true;
  }

  /* Debounced save — never write every frame. */
  save() {
    if (!this.current) return;
    this.current.updatedAt = Date.now();
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this.flush(), CONFIG.saveDebounceMs);
  }

  async flush() {
    clearTimeout(this._saveTimer);
    this._saveTimer = null;
    if (this.current) await storage.put('profiles', this.current);
  }

  _emitChange() {
    this.dispatchEvent(new CustomEvent('change'));
  }

  /* ---------- Bolts / unlocks ---------- */

  addBolts(amount) {
    if (!this.current || !Number.isFinite(amount) || amount <= 0) return;
    this.current.bolts += Math.round(amount);
    this.current.stats.boltsCollected += Math.round(amount);
    this.save();
    this.dispatchEvent(new CustomEvent('bolts', { detail: { delta: amount, total: this.current.bolts } }));
  }

  spendBolts(amount) {
    if (!this.current || this.current.bolts < amount) return false;
    this.current.bolts -= amount;
    this.save();
    this.dispatchEvent(new CustomEvent('bolts', { detail: { delta: -amount, total: this.current.bolts } }));
    return true;
  }

  unlockVehicle(vehicleId) {
    const v = VEHICLES.find((x) => x.id === vehicleId);
    if (!v || !this.current || this.current.unlockedVehicles.includes(vehicleId)) return false;
    if (!this.spendBolts(v.cost)) return false;
    this.current.unlockedVehicles.push(vehicleId);
    this.save();
    return true;
  }

  ownsItem(category, id) {
    const opt = CUSTOMIZATION[category].find((o) => o.id === id);
    if (!opt) return false;
    if (opt.cost === 0) return true;
    return this.current && this.current.ownedItems.includes(category + ':' + id);
  }

  buyItem(category, id) {
    const opt = CUSTOMIZATION[category].find((o) => o.id === id);
    if (!opt || !this.current || this.ownsItem(category, id)) return false;
    if (!this.spendBolts(opt.cost)) return false;
    this.current.ownedItems.push(category + ':' + id);
    this.save();
    return true;
  }

  getCustomization(vehicleId) {
    const c = this.current && this.current.customization[vehicleId];
    return { ...DEFAULT_CUSTOM, ...(c || {}) };
  }

  setCustomization(vehicleId, custom) {
    if (!this.current) return;
    this.current.customization[vehicleId] = { ...this.getCustomization(vehicleId), ...custom };
    if (this.current.stats.customized === 0) this.current.stats.customized = 1;
    else this.current.stats.customized += 1;
    this.save();
    this.checkAchievements();
  }

  /* ---------- Achievements ---------- */

  grantAchievement(id) {
    const a = ACHIEVEMENTS.find((x) => x.id === id);
    if (!a || !this.current || this.current.achievements.includes(id)) return null;
    this.current.achievements.push(id);
    this.save();
    this.dispatchEvent(new CustomEvent('achievement', { detail: a }));
    return a;
  }

  /* Run all achievement checks against current stats; returns newly earned. */
  checkAchievements() {
    if (!this.current) return [];
    const advIds = adventureTracks().map((t) => t.id);
    const earned = [];
    for (const a of ACHIEVEMENTS) {
      if (this.current.achievements.includes(a.id)) continue;
      let ok = false;
      try { ok = !!a.check(this.current, advIds); } catch (e) { ok = false; }
      if (ok) {
        const granted = this.grantAchievement(a.id);
        if (granted) earned.push(granted);
      }
    }
    return earned;
  }

  /* ---------- Custom tracks ---------- */

  async listCustomTracks() {
    if (!this.current) return [];
    const all = await storage.getAll('tracks');
    return all
      .map((t) => sanitizeCustomTrack(t, t.profileId))
      .filter((t) => t && t.profileId === this.current.id)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async saveCustomTrack(trackData) {
    if (!this.current) return null;
    const clean = sanitizeCustomTrack(trackData, this.current.id);
    if (!clean) return null;
    const existing = await this.listCustomTracks();
    const isNew = !existing.some((t) => t.id === clean.id);
    if (isNew && existing.length >= CONFIG.maxCustomTracks) return null;
    await storage.put('tracks', clean);
    if (isNew) {
      this.current.stats.tracksBuilt += 1;
      this.save();
      this.checkAchievements();
    }
    return clean;
  }

  async deleteCustomTrack(id) {
    return storage.delete('tracks', id);
  }

  async getCustomTrack(id) {
    const t = await storage.get('tracks', id);
    if (!t || !this.current || t.profileId !== this.current.id) return null;
    return sanitizeCustomTrack(t, t.profileId);
  }

  /* ---------- Export / import ---------- */

  async exportProfile() {
    if (!this.current) return null;
    await this.flush();
    const tracks = await this.listCustomTracks();
    return {
      type: 'monster-track-garage-save',
      schemaVersion: PROFILE_SCHEMA,
      exportedAt: new Date().toISOString(),
      appVersion: CONFIG.version,
      profile: this.current,
      customTracks: tracks
    };
  }

  async importProfile(jsonText) {
    const data = safeParse(jsonText);
    if (!data || data.type !== 'monster-track-garage-save' || !data.profile) {
      return { ok: false, reason: 'That file is not a Monster Track Garage save.' };
    }
    const profile = sanitizeProfile(data.profile);
    if (!profile) return { ok: false, reason: 'The save data inside the file is damaged.' };

    // Imported profile replaces one with the same id, or becomes a new slot.
    const existingIdx = this.profiles.findIndex((p) => p.id === profile.id);
    if (existingIdx === -1 && this.profiles.length >= CONFIG.maxProfiles) {
      return { ok: false, reason: 'All 4 profile slots are full. Delete one first.' };
    }
    if (existingIdx >= 0) this.profiles[existingIdx] = profile;
    else this.profiles.push(profile);
    await storage.put('profiles', profile);

    let trackCount = 0;
    if (Array.isArray(data.customTracks)) {
      for (const t of data.customTracks.slice(0, CONFIG.maxCustomTracks)) {
        const clean = sanitizeCustomTrack(t, profile.id);
        if (clean) { await storage.put('tracks', clean); trackCount++; }
      }
    }
    await this.selectProfile(profile.id);
    return { ok: true, name: profile.name, tracks: trackCount };
  }

  async resetProfile(id) {
    const p = this.profiles.find((x) => x.id === id);
    if (!p) return false;
    const fresh = defaultProfile(p.name, p.avatar);
    fresh.id = p.id;
    fresh.createdAt = p.createdAt;
    Object.assign(p, fresh);
    await storage.put('profiles', p);
    this._emitChange();
    return true;
  }

  async resetAll() {
    await storage.clearAll();
    this.profiles = [];
    this.current = null;
    this._emitChange();
    return true;
  }
}

export const profileService = new ProfileService();
export { PRESET_NAMES, AVATARS };
