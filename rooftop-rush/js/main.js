/*
 * ROOFTOP RUSH — orchestration: state machine (menu / running / paused /
 * gameover / shop), scoring, saves, crew shop, and the render loop.
 */

import { World } from './world.js';
import { Track, themeAt } from './track.js';
import { Runner, buildRunner } from './runner.js';
import { Input } from './input.js';
import { audio } from './audio.js';

/* ---------- crew (skins) ---------- */

const CREW = [
  { id: 'dash', name: 'DASH', color: 0xe05a3a, desc: 'The original. Never stops.', price: 0 },
  { id: 'volt', name: 'VOLT', color: 0xf0c030, desc: 'Fast hands, faster feet.', price: 150 },
  { id: 'frost', name: 'FROST', color: 0x50b8e8, desc: 'Ice in the veins.', price: 400 },
  { id: 'shadow', name: 'SHADOW', color: 0x33334a, desc: 'You never saw them coming.', price: 800 },
  { id: 'ember', name: 'EMBER', color: 0xd82a6a, desc: 'Leaves a trail of sparks.', price: 1500 }
];

/* ---------- save ---------- */

const SAVE_KEY = 'rooftop-rush-save';

function loadSave() {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (raw && typeof raw === 'object') {
      return {
        best: Math.max(0, Number(raw.best) || 0),
        coins: Math.max(0, Number(raw.coins) || 0),
        skin: CREW.some((c) => c.id === raw.skin) ? raw.skin : 'dash',
        owned: Array.isArray(raw.owned) ? raw.owned.filter((id) => CREW.some((c) => c.id === id)) : [],
        muted: !!raw.muted
      };
    }
  } catch (e) { /* fresh save */ }
  return { best: 0, coins: 0, skin: 'dash', owned: [], muted: false };
}
function store() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* blocked — play on */ }
}
const save = loadSave();

/* ---------- boot ---------- */

const world = new World(document.getElementById('gl'));
const track = new Track(world.scene);
const input = new Input();
input.attach(document.getElementById('gl'));
audio.setMuted(save.muted);

let runnerModel = null;
let runner = null;

function rebuildRunner() {
  if (runnerModel) world.scene.remove(runnerModel.group);
  const skin = CREW.find((c) => c.id === save.skin) || CREW[0];
  runnerModel = buildRunner(skin.color);
  world.scene.add(runnerModel.group);
  runner = new Runner(runnerModel);
}
rebuildRunner();

const ui = {};
for (const id of ['menu', 'shop', 'hud', 'pause', 'gameover', 'loading']) ui[id] = document.getElementById(id);
const show = (id) => { for (const k of Object.keys(ui)) ui[k].hidden = (k !== id); };
const el = (id) => document.getElementById(id);

let state = 'menu';
let speed = 0;
let runCoins = 0;
let magnetT = 0;
let shieldOn = false;
let lastDistShown = -1;

/* ---------- run lifecycle ---------- */

function startRun() {
  track.reset();
  runner.reset();
  runCoins = 0;
  magnetT = 0;
  shieldOn = false;
  speed = 10;
  lastDistShown = -1;
  el('hud-coins').textContent = '0';
  el('hud-power').hidden = true;
  state = 'running';
  show('hud');
  audio.unlock();
  audio.bedStart();
  hudMsg('GO!');
}

function endRun(reason) {
  state = 'gameover';
  runner.die();
  audio.bedStop();
  if (reason === 'fall') audio.fall(); else audio.crash();
  world.addShake(0.6);

  const dist = Math.floor(track.distance);
  const scoreV = dist + runCoins * 5;
  const isBest = scoreV > save.best;
  if (isBest) { save.best = scoreV; audio.record(); }
  save.coins += runCoins;
  store();

  el('go-title').textContent = reason === 'fall' ? 'LONG WAY DOWN!' : 'WIPED OUT!';
  el('go-score').textContent = String(scoreV);
  el('go-best').textContent = `BEST: ${save.best}`;
  el('go-record').hidden = !isBest;
  const stats = el('go-stats');
  stats.innerHTML = '';
  for (const [k, v] of [
    ['Distance', dist + 'm'],
    ['Coins grabbed', '+' + runCoins],
    ['Coin bank', String(save.coins)]
  ]) {
    const li = document.createElement('li');
    const s1 = document.createElement('span'); s1.textContent = k;
    const s2 = document.createElement('b'); s2.textContent = v;
    li.appendChild(s1); li.appendChild(s2);
    stats.appendChild(li);
  }
  // Let the crash flop play for a beat before the panel drops in.
  setTimeout(() => { if (state === 'gameover') show('gameover'); }, 900);
}

function quitToMenu() {
  state = 'menu';
  audio.bedStop();
  refreshMenu();
  show('menu');
}

function refreshMenu() {
  el('menu-best').textContent = save.best > 0
    ? `★ BEST ${save.best} · 🪙 ${save.coins}`
    : 'FIRST RUN — MAKE IT COUNT.';
  el('btn-mute').textContent = save.muted ? '🔇 SOUND OFF' : '🔊 SOUND ON';
}

/* ---------- HUD helpers ---------- */

let msgTimer = 0;
function hudMsg(text) {
  const m = el('hud-msg');
  m.textContent = text;
  m.hidden = false;
  clearTimeout(msgTimer);
  msgTimer = setTimeout(() => { m.hidden = true; }, 1200);
}

/* ---------- shop ---------- */

function renderShop() {
  el('shop-coins').textContent = `🪙 ${save.coins} COINS`;
  const wrap = el('shop-cards');
  wrap.innerHTML = '';
  for (const c of CREW) {
    const owned = c.price === 0 || save.owned.includes(c.id);
    const card = document.createElement('button');
    card.className = 'crew-card' + (save.skin === c.id ? ' selected' : '') + (owned ? '' : ' locked');
    const dot = document.createElement('span');
    dot.className = 'crew-dot';
    dot.style.background = '#' + c.color.toString(16).padStart(6, '0');
    card.appendChild(dot);
    const info = document.createElement('div');
    info.className = 'crew-info';
    const name = document.createElement('div');
    name.className = 'crew-name';
    name.textContent = c.name;
    info.appendChild(name);
    const desc = document.createElement('div');
    desc.className = 'crew-desc';
    desc.textContent = c.desc;
    info.appendChild(desc);
    card.appendChild(info);
    if (!owned) {
      const price = document.createElement('span');
      price.className = 'crew-price';
      price.textContent = `🪙 ${c.price}`;
      card.appendChild(price);
    }
    card.addEventListener('click', () => {
      audio.unlock(); audio.click();
      if (owned) {
        save.skin = c.id;
        store();
        rebuildRunner();
      } else if (save.coins >= c.price) {
        save.coins -= c.price;
        save.owned.push(c.id);
        save.skin = c.id;
        store();
        audio.power();
        rebuildRunner();
      }
      renderShop();
    });
    wrap.appendChild(card);
  }
}

/* ---------- main loop ---------- */

let lastTs = 0;
function frame(ts) {
  requestAnimationFrame(frame);
  if (!lastTs) { lastTs = ts; return; }
  let dt = (ts - lastTs) / 1000;
  lastTs = ts;
  if (dt > 0.1) dt = 0.1;

  if (input.consumePause()) {
    if (state === 'running') { state = 'paused'; audio.bedStop(); show('pause'); }
    else if (state === 'paused') { state = 'running'; audio.bedStart(); show('hud'); }
  }

  // Menus still render the idle scene behind them for a lively backdrop.
  if (state === 'menu' || state === 'shop') {
    runner.update(dt, 4);
    world.update(dt, runner.x, 4);
    world.render();
    return;
  }
  if (state === 'paused') return;

  if (state === 'running') {
    // Actions.
    for (const a of input.consumeActions()) {
      if (a === 'left' && runner.moveLane(-1)) audio.lane();
      else if (a === 'right' && runner.moveLane(1)) audio.lane();
      else if (a === 'jump' && runner.jump()) audio.jump();
      else if (a === 'slide' && runner.slide()) audio.slide();
    }

    // Difficulty curve: speed ramps with distance, capped.
    speed = Math.min(26, 10 + track.distance * 0.012);

    // Power-up timers.
    if (magnetT > 0) {
      magnetT -= dt;
      if (magnetT <= 0) el('hud-power').hidden = true;
    }

    const events = track.update(dt, speed, runner, magnetT > 0);
    for (const ev of events) {
      if (ev.type === 'coin') {
        runCoins++;
        el('hud-coins').textContent = String(runCoins);
        audio.coin();
        world.burst(ev.x, ev.y, 0, 0xffc63d, 5, 2);
      } else if (ev.type === 'power') {
        audio.power();
        if (ev.kind === 'magnet') {
          magnetT = 10;
          const p = el('hud-power');
          p.hidden = false;
          p.textContent = '🧲 MAGNET';
        } else {
          shieldOn = true;
          runnerModel.bubble.visible = true;
          hudMsg('🛡 SHIELD UP');
        }
      } else if (ev.type === 'theme') {
        audio.theme();
        hudMsg(ev.name === 'rooftop' ? '⬆ TO THE ROOFTOPS' : '⬇ INTO THE SUBWAY');
      } else if (ev.type === 'crash') {
        if (shieldOn) {
          shieldOn = false;
          runnerModel.bubble.visible = false;
          hudMsg('🛡 SHIELD SAVED YOU');
          audio.power();
          world.burst(runner.x, 1.2, 0, 0x35d0c0, 10, 4);
        } else {
          world.burst(runner.x, 1.0, 0, 0xd8d8e0, 12, 5);
          endRun('crash');
        }
      } else if (ev.type === 'fall') {
        endRun('fall');
      }
    }

    // HUD distance (throttled to whole metres).
    const d = Math.floor(track.distance);
    if (d !== lastDistShown) {
      lastDistShown = d;
      el('hud-dist').textContent = d + 'm';
    }

    // Ambience follows theme + speed.
    audio.bedUpdate(
      (themeAt(track.distance) === 'subway' ? 0.7 : 0.3) * Math.min(1, speed / 22)
    );
  }

  runner.update(dt, speed);
  world.update(dt, runner.x, speed);
  world.render();
}

/* ---------- wiring ---------- */

function wire(id, fn) {
  el(id).addEventListener('click', () => { audio.unlock(); audio.click(); fn(); });
}
wire('btn-run', startRun);
wire('btn-shop', () => { state = 'shop'; renderShop(); show('shop'); });
wire('btn-shop-back', quitToMenu);
wire('btn-mute', () => { save.muted = !save.muted; audio.setMuted(save.muted); store(); refreshMenu(); });
wire('btn-pause', () => { if (state === 'running') { state = 'paused'; audio.bedStop(); show('pause'); } });
wire('btn-resume', () => { state = 'running'; audio.bedStart(); show('hud'); });
wire('btn-quit', quitToMenu);
wire('btn-again', startRun);
wire('btn-go-shop', () => { state = 'shop'; renderShop(); show('shop'); });
wire('btn-go-menu', quitToMenu);

document.addEventListener('visibilitychange', () => {
  if (document.hidden && state === 'running') { state = 'paused'; audio.bedStop(); show('pause'); }
});

/* ---------- service worker (offline) ---------- */

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => { /* best-effort */ });
}

/* ---------- go ---------- */

refreshMenu();
show('menu');
requestAnimationFrame(frame);

// Debug handle for automated tests.
window.__rush = {
  get state() { return state; },
  get distance() { return track.distance; },
  get coins() { return runCoins; },
  get speed() { return speed; },
  get runner() { return runner; },
  startRun
};
