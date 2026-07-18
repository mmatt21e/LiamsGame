/*
 * GameEngine — runs one race (or free-drive session):
 * countdown → racing → finished. Owns the requestAnimationFrame loop,
 * fixed-timestep physics, scoring, checkpoints and finish detection.
 * Talks to the outside world only through callbacks.
 */

import { DIFFICULTY } from '../config.js';
import { parseTrack, resetTrackState, cellOf } from './track.js';
import { physicsParams, createVehicleState, stepPhysics, respawn } from './physics.js';
import { collideObjects } from './collision.js';
import { Renderer } from './renderer.js';
import { InputManager } from './input-manager.js';
import { customOption } from '../data/vehicles.js';
import { audio } from '../services/audio-service.js';

const FIXED_DT = 1 / 60;

export class GameEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.input = new InputManager();
    this.state = 'idle';   // idle | countdown | racing | paused | finished
    this._raf = 0;
    this._visBound = () => { if (document.hidden && this.state === 'racing') this.pause(); };
  }

  start({ trackDef, vehicleDef, custom, settings, callbacks }) {
    this.stop();
    this.trackDef = trackDef;
    this.vehicleDef = vehicleDef;
    this.custom = custom;
    this.settings = settings;
    this.cb = callbacks || {};
    this.difficulty = DIFFICULTY[settings.difficulty] || DIFFICULTY.easy;

    this.track = parseTrack(trackDef);
    resetTrackState(this.track);
    this.params = physicsParams(vehicleDef, customOption('tires', custom.tires));
    this.vehicle = createVehicleState(this.track);
    this.renderer.snapTo(this.vehicle.x, this.vehicle.y);
    this.renderer.particles.length = 0;
    this.renderer.resize();

    this.raceTime = 0;
    this.score = { bolts: 0, boxes: 0, cones: 0, jumps: 0, bigJumps: 0, hidden: 0 };
    this._accum = 0;
    this._lastTs = 0;
    this._finishHold = 0;

    this.input.attach();
    document.addEventListener('visibilitychange', this._visBound);

    audio.engineStart();
    audio.startMusic('race');

    if (this.track.freeDrive) {
      this.state = 'racing';
      this._notifyHud();
      if (this.cb.onCountdown) this.cb.onCountdown('GO!');
      audio.go();
    } else {
      this.state = 'countdown';
      this.countdownValue = 3;
      this.countdownTimer = 0;
      if (this.cb.onCountdown) this.cb.onCountdown('3');
      audio.countdown();
    }

    this._raf = requestAnimationFrame((ts) => this._frame(ts));
  }

  stop() {
    cancelAnimationFrame(this._raf);
    this._raf = 0;
    this.input.detach();
    document.removeEventListener('visibilitychange', this._visBound);
    audio.engineStop();
    audio.stopMusic();
    this.state = 'idle';
  }

  pause() {
    if (this.state !== 'racing' && this.state !== 'countdown') return;
    this._stateBeforePause = this.state;
    this.state = 'paused';
    audio.engineStop();
    audio.stopMusic();
    if (this.cb.onPause) this.cb.onPause();
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = this._stateBeforePause || 'racing';
    this._lastTs = 0;
    audio.engineStart();
    audio.startMusic('race');
  }

  respawnVehicle() {
    respawn(this.vehicle);
    this.renderer.snapTo(this.vehicle.x, this.vehicle.y);
  }

  _frame(ts) {
    this._raf = requestAnimationFrame((t) => this._frame(t));

    if (!this._lastTs) { this._lastTs = ts; return; }
    let dt = (ts - this._lastTs) / 1000;
    this._lastTs = ts;
    if (dt > 0.25) dt = 0.25; // tab was hidden or hiccup — don't teleport

    if (this.input.consumePause()) {
      if (this.state === 'paused') { /* HUD owns resume */ }
      else this.pause();
    }
    if (this.state === 'paused') return;

    if (this.input.consumeReset() && this.state === 'racing') {
      this.respawnVehicle();
      if (this.cb.onFeedback) this.cb.onFeedback('Back on track! 🔄');
    }

    if (this.state === 'countdown') this._tickCountdown(dt);

    const driving = this.state === 'racing';
    const inputState = driving
      ? this.input.getState(this.settings)
      : { steer: 0, throttle: 0, brake: 0, boost: false };

    // Fixed-timestep physics.
    this._accum += dt;
    let steps = 0;
    while (this._accum >= FIXED_DT && steps < 5) {
      this._accum -= FIXED_DT;
      steps++;
      if (this.state === 'racing' || this.state === 'finished') {
        this._step(inputState, FIXED_DT);
      }
    }
    if (steps === 5) this._accum = 0;

    if (this.state === 'racing' && !this.track.freeDrive) {
      this.raceTime += dt;
      if (this.cb.onTime) this.cb.onTime(this.raceTime);
    }

    // Engine audio pitch.
    const speed = Math.hypot(this.vehicle.vx, this.vehicle.vy);
    audio.engineUpdate(Math.min(1, speed / this.params.maxSpeed), this.vehicle.airborne);

    if (this.cb.onBoostMeter) this.cb.onBoostMeter(this.vehicle.boostMeter);

    this.renderer.render(this.track, this.vehicle, this.vehicleDef, this.custom, {}, dt);

    // Trail dust while driving fast on loose ground.
    if (driving && speed > 120 && !this.vehicle.airborne) {
      const s = this.vehicle.surface;
      if (s === '.' || s === 'S' || s === 'D') {
        this.renderer.spawn('dust', this.vehicle.x, this.vehicle.y, { count: 1, size: 5, life: 0.5, color: 'rgba(190,170,120,0.6)' });
      } else if (s === 'M') {
        this.renderer.spawn('dust', this.vehicle.x, this.vehicle.y, { count: 1, size: 6, life: 0.5, color: 'rgba(80,60,30,0.7)' });
      }
    }

    if (this.state === 'finished') {
      this._finishHold -= dt;
      if (this._finishHold <= 0) {
        const results = this._results;
        this.stop();
        if (this.cb.onFinish) this.cb.onFinish(results);
      }
    }
  }

  _tickCountdown(dt) {
    this.countdownTimer += dt;
    if (this.countdownTimer >= 1) {
      this.countdownTimer = 0;
      this.countdownValue--;
      if (this.countdownValue > 0) {
        if (this.cb.onCountdown) this.cb.onCountdown(String(this.countdownValue));
        audio.countdown();
      } else {
        this.state = 'racing';
        if (this.cb.onCountdown) this.cb.onCountdown('GO!');
        audio.go();
        this._notifyHud();
      }
    }
  }

  _notifyHud() {
    if (this.cb.onBolts) this.cb.onBolts(this.score.bolts);
    if (this.cb.onProgress) {
      const total = this.track.checkpoints.length;
      this.cb.onProgress(0, total);
    }
  }

  _step(input, dt) {
    const v = this.vehicle;
    const events = stepPhysics(v, input, this.track, this.params, this.difficulty, dt);
    const shakeOn = this.settings.screenShake && this._motionOk();

    for (const e of events) {
      switch (e) {
        case 'jump':
          audio.jump();
          break;
        case 'land':
          audio.land();
          if (v.landedAirTime > 0.35) {
            this.score.jumps++;
            if (this.cb.onFeedback) this.cb.onFeedback('Nice air! 🪂');
          }
          this.renderer.spawn('dust', v.x, v.y, { count: 8, size: 6, life: 0.5 });
          this.renderer.addShake(4, shakeOn);
          break;
        case 'bigLand':
          audio.bigLand();
          this.score.jumps++;
          this.score.bigJumps++;
          if (this.cb.onFeedback) this.cb.onFeedback('HUGE JUMP! 🤩');
          this.renderer.spawn('dust', v.x, v.y, { count: 14, size: 8, life: 0.7 });
          this.renderer.addShake(10, shakeOn);
          break;
        case 'boost':
          audio.boost();
          break;
        case 'boostPad':
          audio.boost();
          if (this.cb.onFeedback) this.cb.onFeedback('BOOST! 💨');
          break;
        case 'bonk':
          audio.bonk();
          this.renderer.addShake(5, shakeOn);
          break;
        case 'splash':
          audio.splash();
          break;
        case 'recovered':
          this.renderer.snapTo(v.x, v.y);
          if (this.cb.onFeedback) this.cb.onFeedback('Back on track! 🔄');
          break;
      }
    }

    // Objects.
    const hits = collideObjects(v, this.track, this.params, this.difficulty);
    for (const h of hits) {
      if (h.type === 'bolt') {
        this.score.bolts++;
        audio.bolt();
        this.renderer.spawn('spark', h.object.x, h.object.y, { count: 6, size: 4, life: 0.4, color: '#ffd23f' });
        if (this.cb.onBolts) this.cb.onBolts(this.score.bolts);
      } else if (h.type === 'box') {
        this.score.boxes++;
        audio.breakBox();
        this.renderer.spawn('dust', h.object.x, h.object.y, { count: 10, size: 7, life: 0.6, color: '#c98d4a' });
        if (this.cb.onFeedback) this.cb.onFeedback('Smash! 📦');
      } else if (h.type === 'cone') {
        this.score.cones++;
        audio.cone();
      } else if (h.type === 'tires') {
        audio.bounce();
        this.renderer.addShake(3, shakeOn);
      } else if (h.type === 'hidden') {
        this.score.hidden++;
        audio.star();
        this.renderer.confetti(h.object.x, h.object.y);
        if (this.cb.onFeedback) this.cb.onFeedback('Hidden star! 🌟');
      }
    }

    // Checkpoints + finish (skip in free drive).
    if (!this.track.freeDrive && this.state === 'racing') {
      const { cx, cy } = cellOf(this.track, v.x, v.y);
      for (const cp of this.track.checkpoints) {
        if (!cp.hit && cp.cells.some((c) => c.cx === cx && c.cy === cy)) {
          cp.hit = true;
          audio.checkpoint();
          const hit = this.track.checkpoints.filter((c) => c.hit).length;
          if (this.cb.onProgress) this.cb.onProgress(hit, this.track.checkpoints.length);
          if (this.cb.onFeedback) this.cb.onFeedback('Checkpoint! ✅');
        }
      }
      const allHit = this.track.checkpoints.every((c) => c.hit);
      if (allHit && this.track.finishCells.some((c) => c.cx === cx && c.cy === cy)) {
        this._finish();
      }
    }
  }

  _motionOk() {
    const rm = this.settings.reducedMotion;
    if (rm === 'on') return false;
    if (rm === 'auto' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    return true;
  }

  _finish() {
    this.state = 'finished';
    this._finishHold = 1.8;
    audio.finish();
    this.renderer.confetti(this.vehicle.x, this.vehicle.y);
    if (this.cb.onCountdown) this.cb.onCountdown('FINISH! 🏁');

    const par = (this.track.parSeconds || 60) * this.difficulty.parMultiplier;
    let stars = 1; // finishing is always a win
    if (this.raceTime <= par) stars = 3;
    else if (this.raceTime <= par * 1.4) stars = 2;

    this._results = {
      trackId: this.track.id,
      trackName: this.track.name,
      timeMs: Math.round(this.raceTime * 1000),
      stars,
      bolts: this.score.bolts,
      boxes: this.score.boxes,
      cones: this.score.cones,
      jumps: this.score.jumps,
      bigJumps: this.score.bigJumps,
      hidden: this.score.hidden
    };
  }
}
