/*
 * All audio is synthesized live with the Web Audio API — no sound files.
 * The context unlocks on the first user gesture (browser autoplay rules).
 */

class GameAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.engine = null;
    this.muted = false;
  }

  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.55;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    } catch (e) { /* audio is optional */ }
  }

  _tone(freq, type, dur, vol, slide = 0, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  _noise(dur, vol, freq) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
  }

  /* Deep V8-ish rumble: two detuned oscillators through a lowpass. */
  engineStart() {
    if (!this.ctx || this.engine) return;
    try {
      const o1 = this.ctx.createOscillator();
      const o2 = this.ctx.createOscillator();
      const f = this.ctx.createBiquadFilter();
      const g = this.ctx.createGain();
      o1.type = 'sawtooth'; o2.type = 'square';
      o1.frequency.value = 42; o2.frequency.value = 21;
      f.type = 'lowpass'; f.frequency.value = 320;
      g.gain.value = 0;
      o1.connect(f); o2.connect(f); f.connect(g).connect(this.master);
      o1.start(); o2.start();
      this.engine = { o1, o2, f, g };
    } catch (e) { this.engine = null; }
  }

  engineUpdate(rpm /* 0..1 */, throttle) {
    if (!this.engine || !this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const base = 38 + rpm * 150 + throttle * 14;
    this.engine.o1.frequency.setTargetAtTime(base, t, 0.07);
    this.engine.o2.frequency.setTargetAtTime(base / 2, t, 0.07);
    this.engine.f.frequency.setTargetAtTime(260 + rpm * 1100, t, 0.09);
    this.engine.g.gain.setTargetAtTime(0.07 + rpm * 0.12 + throttle * 0.05, t, 0.08);
  }

  engineStop() {
    if (!this.engine || !this.ctx) { this.engine = null; return; }
    const t = this.ctx.currentTime;
    try {
      this.engine.g.gain.setTargetAtTime(0, t, 0.1);
      this.engine.o1.stop(t + 0.5); this.engine.o2.stop(t + 0.5);
    } catch (e) { /* ok */ }
    this.engine = null;
  }

  click()    { this._tone(600, 'triangle', 0.06, 0.25); }
  countdown(){ this._tone(392, 'square', 0.16, 0.3); }
  go()       { this._tone(620, 'square', 0.35, 0.35); this._tone(830, 'square', 0.3, 0.3, 0, 0.1); }
  crush()    { this._noise(0.28, 0.7, 700); this._tone(90, 'square', 0.2, 0.5, -40); }
  land(big)  { this._noise(big ? 0.35 : 0.2, big ? 0.8 : 0.45, 240); this._tone(60, 'sine', 0.25, big ? 0.7 : 0.4); }
  flip()     { [660, 880, 1320].forEach((f, i) => this._tone(f, 'triangle', 0.15, 0.35, 0, i * 0.07)); }
  air()      { this._tone(520, 'triangle', 0.3, 0.25, 340); }
  tick()     { this._tone(880, 'square', 0.05, 0.2); }
  fanfare()  { [523, 659, 784, 1047].forEach((f, i) => this._tone(f, 'square', 0.22, 0.32, 0, i * 0.11)); }
  unlockJingle() { [392, 523, 659, 784, 1047].forEach((f, i) => this._tone(f, 'triangle', 0.18, 0.35, 0, i * 0.09)); }
}

export const audio = new GameAudio();
