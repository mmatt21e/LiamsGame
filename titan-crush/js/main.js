/*
 * TITAN CRUSH — main game orchestration.
 * State machine: loading → menu → (select) → playing → paused/results.
 * Owns the render loop, scoring, saves (localStorage) and all menus.
 */

import * as THREE from 'three';
import {
  createWorld, createTruck, driveTruck, getForwardSpeed, getForwardDir,
  wheelsOnGround, isUpsideDown, resetTruck, createCarBody,
  TRUCKS, PAINTS, CAR_SPOTS, CANNON
} from './physics.js';
import { World } from './world.js';
import { Input } from './input.js';
import { Hud } from './hud.js';
import { audio } from './audio.js';

/* ---------- save data (localStorage, offline-safe) ---------- */

const SAVE_KEY = 'titan-crush-save';

function loadSave() {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (raw && typeof raw === 'object') {
      return {
        highScore: Math.max(0, Number(raw.highScore) || 0),
        totalCrushed: Math.max(0, Number(raw.totalCrushed) || 0),
        truck: TRUCKS.some((t) => t.id === raw.truck) ? raw.truck : 'titan',
        paint: PAINTS.includes(raw.paint) ? raw.paint : PAINTS[0]
      };
    }
  } catch (e) { /* corrupted or blocked storage → fresh save */ }
  return { highScore: 0, totalCrushed: 0, truck: 'titan', paint: PAINTS[0] };
}

function storeSave(save) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* storage blocked — play on */ }
}

/* ---------- boot ---------- */

const save = loadSave();
const canvas = document.getElementById('gl');
const world3d = new World(canvas);
const hud = new Hud();
const input = new Input();
input.attach();

const { world, groundMat } = createWorld();

// UI elements
const ui = {};
for (const id of ['menu', 'truck-select', 'hud', 'pause', 'results', 'loading']) {
  ui[id] = document.getElementById(id);
}
const show = (id) => { for (const k of Object.keys(ui)) ui[k].hidden = (k !== id); };

let state = 'menu';
let mode = 'freestyle';        // 'freestyle' | 'practice'

/* ---------- session (one run) ---------- */

const CARS = [];               // { body, mesh, crushed, respawnAt }
let truck = null;              // { spec, chassisBody, vehicle, model }
let score = 0;
let timeLeft = 90;
let running = false;
let counts = { crushed: 0, flips: 0, airBonus: 0, bestAir: 0 };
let combo = 0, comboAt = 0;
let airTime = 0, airborne = false, rotAccum = 0, flipsThisJump = 0;
let prevQuat = new CANNON.Quaternion();
let countdown = 0;
let lastTick = -1;

function spawnCars() {
  // Clear old
  for (const c of CARS) {
    world3d.scene.remove(c.mesh);
    try { world.removeBody(c.body); } catch (e) { /* already removed */ }
  }
  CARS.length = 0;
  const colors = [0x2f7fd0, 0xd0d0d8, 0x3fa04a, 0xc9c93a, 0xb04ad0, 0xd07a2f];
  CAR_SPOTS.forEach(([x, z, ry], i) => {
    const body = createCarBody(world, x, z, ry);
    const mesh = world3d.buildCar(colors[i % colors.length]);
    const car = { body, mesh, crushed: false, respawnAt: 0, spot: [x, z, ry] };
    body.addEventListener('collide', (ev) => onCarHit(car, ev));
    CARS.push(car);
  });
}

function onCarHit(car, ev) {
  if (!running || car.crushed || !truck) return;
  if (ev.body !== truck.chassisBody) return;
  const impact = Math.abs(ev.contact.getImpactVelocityAlongNormal());
  if (impact < 3.2) return;
  car.crushed = true;
  car.respawnAt = (mode === 'freestyle') ? 14 : 9;
  // Squash the mesh flat + shove the body away lightly before removal.
  combo = (performance.now() - comboAt < 3000) ? combo + 1 : 1;
  comboAt = performance.now();
  const pts = Math.round(100 * truck.spec.crushBonus * combo);
  addScore(pts);
  counts.crushed++;
  save.totalCrushed++;
  hud.popup(combo > 1 ? `CRUSHED! +${pts} ×${combo}` : `CRUSHED! +${pts}`, combo >= 3);
  audio.crush();
  world3d.puff(car.mesh.position, 8, 4, true);
  world3d.addShake(0.35);
}

function addScore(pts) {
  score += pts;
  hud.setScore(score);
}

/* ---------- truck lifecycle ---------- */

function buildPlayerTruck() {
  if (truck) {
    world3d.removeTruck(truck.model);
    truck.vehicle.removeFromWorld(world);
    try { world.removeBody(truck.chassisBody); } catch (e) { /* ok */ }
  }
  const spec = TRUCKS.find((t) => t.id === save.truck) || TRUCKS[0];
  const { chassisBody, vehicle } = createTruck(world, groundMat, spec);
  const model = world3d.buildTruck(spec, save.paint);
  truck = { spec, chassisBody, vehicle, model };
  prevQuat.copy(chassisBody.quaternion);
}

function syncTruckModel() {
  const { chassisBody, vehicle, model } = truck;
  model.group.position.copy(chassisBody.position);
  model.group.quaternion.copy(chassisBody.quaternion);
  for (let i = 0; i < 4; i++) {
    vehicle.updateWheelTransform(i);
    const t = vehicle.wheelInfos[i].worldTransform;
    model.wheels[i].position.copy(t.position);
    model.wheels[i].quaternion.copy(t.quaternion);
  }
}

/* ---------- game flow ---------- */

function startRun(selectedMode) {
  mode = selectedMode;
  score = 0;
  timeLeft = 90;
  counts = { crushed: 0, flips: 0, airBonus: 0, bestAir: 0 };
  combo = 0;
  airborne = false; airTime = 0; rotAccum = 0; flipsThisJump = 0;
  hud.setScore(0);
  hud.clearPopups();
  buildPlayerTruck();
  spawnCars();
  show('hud');
  state = 'playing';
  running = false;
  countdown = 3.2;
  lastTick = -1;
  audio.unlock();
  audio.engineStart();
}

function endRun() {
  running = false;
  state = 'results';
  audio.engineStop();
  audio.fanfare();

  const isRecord = mode === 'freestyle' && score > save.highScore;
  if (isRecord) save.highScore = score;
  storeSave(save);

  document.getElementById('final-score').textContent = String(score);
  document.getElementById('new-record').hidden = !isRecord;
  const list = document.getElementById('results-breakdown');
  list.innerHTML = '';
  const rows = [
    ['Cars crushed', `${counts.crushed}`],
    ['Flips landed', `${counts.flips}`],
    ['Air-time bonus', `${counts.airBonus}`],
    ['Longest air', `${counts.bestAir.toFixed(1)}s`],
    ['High score', `${save.highScore}`]
  ];
  for (const [k, v] of rows) {
    const li = document.createElement('li');
    const kEl = document.createElement('span');
    kEl.textContent = k;
    const vEl = document.createElement('b');
    vEl.textContent = v;
    li.appendChild(kEl); li.appendChild(vEl);
    list.appendChild(li);
  }

  // Unlock check.
  const unlockMsg = document.getElementById('unlock-msg');
  const newlyUnlocked = TRUCKS.filter((t) => t.unlockScore > 0 && save.highScore >= t.unlockScore &&
    !(save._seenUnlocks || []).includes(t.id));
  if (newlyUnlocked.length) {
    save._seenUnlocks = [...(save._seenUnlocks || []), ...newlyUnlocked.map((t) => t.id)];
    storeSave(save);
    unlockMsg.hidden = false;
    unlockMsg.textContent = `🔓 UNLOCKED: ${newlyUnlocked.map((t) => t.name).join(' + ')} — check the garage!`;
    audio.unlockJingle();
  } else {
    unlockMsg.hidden = true;
  }
  show('results');
}

function quitToMenu() {
  running = false;
  state = 'menu';
  audio.engineStop();
  refreshMenu();
  show('menu');
}

function refreshMenu() {
  const hs = document.getElementById('menu-highscore');
  hs.textContent = save.highScore > 0
    ? `★ HIGH SCORE: ${save.highScore} · CARS CRUSHED EVER: ${save.totalCrushed}`
    : 'NO RECORD YET — SET ONE.';
}

/* ---------- truck select UI ---------- */

function renderTruckSelect() {
  const wrap = document.getElementById('truck-cards');
  wrap.innerHTML = '';
  for (const t of TRUCKS) {
    const locked = save.highScore < t.unlockScore;
    const card = document.createElement('button');
    card.className = 'truck-card' + (save.truck === t.id ? ' selected' : '') + (locked ? ' locked' : '');
    const em = document.createElement('span');
    em.className = 'truck-emoji';
    em.textContent = locked ? '🔒' : t.emoji;
    card.appendChild(em);
    const info = document.createElement('div');
    info.className = 'truck-info';
    const name = document.createElement('div');
    name.className = 'truck-name';
    name.textContent = t.name;
    info.appendChild(name);
    const desc = document.createElement('div');
    desc.className = 'truck-desc';
    desc.textContent = locked ? `Reach ${t.unlockScore.toLocaleString()} high score to unlock` : t.desc;
    info.appendChild(desc);
    const bars = document.createElement('div');
    bars.className = 'statbars';
    for (const [k, v] of Object.entries(t.stats)) {
      const b = document.createElement('span');
      b.className = 'statbar';
      const label = document.createElement('span');
      label.textContent = k + ' ';
      const val = document.createElement('b');
      val.textContent = '▮'.repeat(v) + '▯'.repeat(5 - v);
      b.appendChild(label); b.appendChild(val);
      bars.appendChild(b);
    }
    info.appendChild(bars);
    card.appendChild(info);
    if (!locked) {
      card.addEventListener('click', () => {
        audio.click();
        save.truck = t.id;
        storeSave(save);
        renderTruckSelect();
      });
    }
    wrap.appendChild(card);
  }

  const paintRow = document.getElementById('paint-row');
  paintRow.innerHTML = '';
  for (const p of PAINTS) {
    const sw = document.createElement('button');
    sw.className = 'paint' + (save.paint === p ? ' selected' : '');
    sw.style.background = p;
    sw.setAttribute('aria-label', 'Paint ' + p);
    sw.addEventListener('click', () => {
      audio.click();
      save.paint = p;
      storeSave(save);
      renderTruckSelect();
    });
    paintRow.appendChild(sw);
  }
}

/* ---------- per-frame update ---------- */

const FIXED = 1 / 60;
let accum = 0, lastTs = 0;

function frame(ts) {
  requestAnimationFrame(frame);
  if (!lastTs) { lastTs = ts; return; }
  let dt = (ts - lastTs) / 1000;
  lastTs = ts;
  if (dt > 0.25) dt = 0.25;

  if (input.consumePause()) {
    if (state === 'playing') pauseGame();
    else if (state === 'paused') resumeGame();
  }
  if (state !== 'playing') return;

  // Countdown before control unlocks.
  if (countdown > 0) {
    const before = Math.ceil(countdown);
    countdown -= dt;
    const after = Math.ceil(countdown);
    if (after !== before && after > 0) { hud.popup(String(after), true); audio.countdown(); }
    if (countdown <= 0) { hud.popup('GO!', true); audio.go(); running = true; }
    else if (before === 4) { hud.popup('3', true); audio.countdown(); }
  }

  const ctl = running ? input.getState() : { steer: 0, throttle: 0, brake: 1 };

  if (running && input.consumeReset()) {
    resetTruck(truck.chassisBody, false);
    hud.popup('RESET ↻');
  }

  // Fixed-step physics.
  accum += dt;
  let steps = 0;
  while (accum >= FIXED && steps < 4) {
    driveTruck(truck.vehicle, truck.chassisBody, truck.spec, ctl, FIXED);
    world.step(FIXED);
    accum -= FIXED;
    steps++;
  }
  if (steps === 4) accum = 0;

  updateScoring(dt, ctl);
  updateCars(dt);
  syncTruckModel();

  // Timer (freestyle only).
  if (running && mode === 'freestyle') {
    timeLeft -= dt;
    hud.setTimer(timeLeft, true);
    const s = Math.ceil(timeLeft);
    if (s <= 5 && s !== lastTick && s > 0) { lastTick = s; audio.tick(); }
    if (timeLeft <= 0) { endRun(); return; }
  } else {
    hud.setTimer(0, mode === 'freestyle');
  }

  // Speed + engine sound.
  const speed = Math.abs(getForwardSpeed(truck.chassisBody));
  hud.setSpeed(speed * 3.6);
  audio.engineUpdate(Math.min(1, speed / 28), ctl.throttle);

  // Camera + world dressing.
  const fwd = getForwardDir(truck.chassisBody);
  world3d.updateCamera(truck.chassisBody.position, fwd, dt, speed);
  world3d.updateDust(dt);

  // Rolling dust while driving fast on the ground.
  if (running && speed > 12 && wheelsOnGround(truck.vehicle) >= 2 && Math.random() < dt * 14) {
    world3d.puff(truck.model.group.position, 1, 2.2);
  }

  world3d.render();
}

/* Air time, flips, landings. */
function updateScoring(dt) {
  if (!truck) return;
  const onGround = wheelsOnGround(truck.vehicle) > 0;

  if (!airborne && !onGround) {
    airborne = true;
    airTime = 0;
    rotAccum = 0;
    flipsThisJump = 0;
    prevQuat.copy(truck.chassisBody.quaternion);
  } else if (airborne && !onGround) {
    airTime += dt;
    hud.setAir(airTime > 0.4, airTime);
    // Accumulate total rotation while airborne → flips.
    const q = truck.chassisBody.quaternion;
    let dot = Math.abs(prevQuat.x * q.x + prevQuat.y * q.y + prevQuat.z * q.z + prevQuat.w * q.w);
    dot = Math.min(1, dot);
    rotAccum += 2 * Math.acos(dot);
    prevQuat.copy(q);
    if (rotAccum > 5.9) {
      rotAccum -= 6.28;
      flipsThisJump++;
      if (running) {
        addScore(250);
        counts.flips++;
        hud.popup(`FLIP! +250`, true);
        audio.flip();
      }
    }
  } else if (airborne && onGround) {
    airborne = false;
    hud.setAir(false, 0);
    if (airTime > 0.5 && running) {
      const bonus = Math.round(airTime * 60);
      addScore(bonus);
      counts.airBonus += bonus;
      counts.bestAir = Math.max(counts.bestAir, airTime);
      hud.popup(`AIR ${airTime.toFixed(1)}s +${bonus}`);
      audio.air();
      const big = airTime > 1.2;
      audio.land(big);
      world3d.puff(truck.model.group.position, big ? 12 : 6, 4.5);
      world3d.addShake(big ? 0.8 : 0.35);
    }
    airTime = 0;
  }

  // Stuck upside down? Auto-rescue after 2.5s.
  if (isUpsideDown(truck.chassisBody)) {
    truck._flipTimer = (truck._flipTimer || 0) + dt;
    if (truck._flipTimer > 2.5) {
      truck._flipTimer = 0;
      resetTruck(truck.chassisBody, false);
      hud.popup('BACK ON THE WHEELS ↻');
    }
  } else {
    truck._flipTimer = 0;
  }
}

/* Crushed-car visuals + respawn. */
function updateCars(dt) {
  for (const c of CARS) {
    if (c.crushed) {
      // Squash animation: flatten fast.
      if (c.mesh.scale.y > 0.22) {
        c.mesh.scale.y = Math.max(0.22, c.mesh.scale.y - dt * 5);
        c.mesh.position.copy(c.body.position);
        c.mesh.quaternion.copy(c.body.quaternion);
      } else if (c.body.world) {
        world.removeBody(c.body); // flattened wreck stays as a visual only
      }
      c.respawnAt -= dt;
      if (c.respawnAt <= 0 && running) {
        // Fresh car back on its spot.
        const [x, z, ry] = c.spot;
        c.crushed = false;
        c.mesh.scale.y = 1;
        c.body = createCarBody(world, x, z, ry);
        c.body.addEventListener('collide', (ev) => onCarHit(c, ev));
        c.mesh.position.copy(c.body.position);
      }
    } else {
      c.mesh.position.copy(c.body.position);
      c.mesh.quaternion.copy(c.body.quaternion);
    }
  }
}

/* ---------- pause ---------- */

function pauseGame() {
  if (state !== 'playing') return;
  state = 'paused';
  audio.engineStop();
  show('pause');
}

function resumeGame() {
  if (state !== 'paused') return;
  state = 'playing';
  audio.engineStart();
  show('hud');
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden && state === 'playing') pauseGame();
});

/* ---------- menu wiring ---------- */

function wire(id, fn) {
  document.getElementById(id).addEventListener('click', () => { audio.unlock(); audio.click(); fn(); });
}

wire('btn-freestyle', () => startRun('freestyle'));
wire('btn-practice', () => startRun('practice'));
wire('btn-trucks', () => { renderTruckSelect(); show('truck-select'); });
wire('btn-select-back', () => { refreshMenu(); show('menu'); });
wire('btn-pause', () => pauseGame());
wire('btn-resume', () => resumeGame());
wire('btn-restart', () => startRun(mode));
wire('btn-quit', () => quitToMenu());
wire('btn-again', () => startRun(mode));
wire('btn-results-menu', () => quitToMenu());

/* ---------- service worker (offline) ---------- */

if ('serviceWorker' in navigator) {
  // Relative path → correct scope on GitHub Pages subfolders.
  navigator.serviceWorker.register('sw.js').catch(() => { /* offline install is best-effort */ });
}

/* ---------- go ---------- */

refreshMenu();
show('menu');
requestAnimationFrame(frame);

// Tiny debug handle for automated tests (harmless in production).
window.__titan = {
  get state() { return state; },
  get score() { return score; },
  get truck() { return truck; },
  forwardSpeed: () => (truck ? getForwardSpeed(truck.chassisBody) : 0)
};
