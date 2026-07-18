/*
 * Synthesized audio (Web Audio API) — footfall-free mix of wind, coin
 * pings, whooshes and a subway rumble bed. No audio files needed, which
 * keeps the offline cache tiny. Unlocks on first user gesture.
 */

class RushAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.bed = null;          // ambient rumble
    this.muted = false;
  }

  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    } catch (e) { /* optional */ }
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  _tone(freq, type, dur, vol, slide = 0, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
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
    const s = this.ctx.createBufferSource();
    s.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f).connect(g).connect(this.master);
    s.start(t);
  }

  /* Ambient bed: low rumble whose intensity follows speed/theme. */
  bedStart() {
    if (!this.ctx || this.bed) return;
    try {
      const o = this.ctx.createOscillator();
      const f = this.ctx.createBiquadFilter();
      const g = this.ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.value = 30;
      f.type = 'lowpass'; f.frequency.value = 120;
      g.gain.value = 0;
      o.connect(f).connect(g).connect(this.master);
      o.start();
      this.bed = { o, f, g };
    } catch (e) { this.bed = null; }
  }

  bedUpdate(intensity /* 0..1 */) {
    if (!this.bed || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.bed.g.gain.setTargetAtTime(0.03 + intensity * 0.07, t, 0.4);
    this.bed.o.frequency.setTargetAtTime(26 + intensity * 18, t, 0.4);
  }

  bedStop() {
    if (!this.bed || !this.ctx) { this.bed = null; return; }
    try {
      this.bed.g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      this.bed.o.stop(this.ctx.currentTime + 0.5);
    } catch (e) { /* ok */ }
    this.bed = null;
  }

  click()  { this._tone(620, 'triangle', 0.06, 0.22); }
  coin()   { this._tone(1150, 'square', 0.07, 0.22); this._tone(1540, 'square', 0.1, 0.18, 0, 0.05); }
  jump()   { this._noise(0.16, 0.25, 900); this._tone(330, 'triangle', 0.18, 0.2, 260); }
  slide()  { this._noise(0.24, 0.3, 500); }
  lane()   { this._noise(0.1, 0.16, 1400); }
  power()  { [520, 700, 1050].forEach((f, i) => this._tone(f, 'triangle', 0.14, 0.28, 0, i * 0.06)); }
  crash()  { this._noise(0.4, 0.8, 300); this._tone(110, 'square', 0.35, 0.5, -60); }
  fall()   { this._tone(600, 'sawtooth', 0.7, 0.35, -480); }
  record() { [523, 659, 784, 1047].forEach((f, i) => this._tone(f, 'square', 0.2, 0.3, 0, i * 0.1)); }
  theme()  { this._tone(440, 'triangle', 0.12, 0.2); this._tone(660, 'triangle', 0.16, 0.2, 0, 0.08); }
}

export const audio = new RushAudio();
