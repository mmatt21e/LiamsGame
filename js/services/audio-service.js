/*
 * AudioService — every sound is synthesized with the Web Audio API.
 * No audio files, no autoplay: the context starts on the first user gesture.
 * Volumes/mute come from profile settings. Also hosts optional text-to-speech.
 */

class AudioService {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.engineNodes = null;
    this.musicTimer = null;
    this.musicStep = 0;
    this.settings = { soundVolume: 0.8, musicVolume: 0.5, muted: false, tts: false };
    this._unlockBound = null;
  }

  /* Arm a one-time unlock on the first pointer/key interaction. */
  armUnlock() {
    if (this._unlockBound) return;
    this._unlockBound = () => this._ensureContext();
    window.addEventListener('pointerdown', this._unlockBound, { once: false, passive: true });
    window.addEventListener('keydown', this._unlockBound, { once: false, passive: true });
  }

  _ensureContext() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();
        this.musicGain = this.ctx.createGain();
        this.sfxGain.connect(this.master);
        this.musicGain.connect(this.master);
        this.master.connect(this.ctx.destination);
        this._applyVolumes();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return this.ctx;
    } catch (e) {
      return null;
    }
  }

  applySettings(s) {
    this.settings = {
      soundVolume: s.soundVolume, musicVolume: s.musicVolume,
      muted: s.muted, tts: s.tts
    };
    this._applyVolumes();
  }

  _applyVolumes() {
    if (!this.ctx) return;
    const m = this.settings.muted ? 0 : 1;
    this.sfxGain.gain.value = 0.6 * this.settings.soundVolume * m;
    this.musicGain.gain.value = 0.35 * this.settings.musicVolume * m;
  }

  /* ---------- tiny synth helpers ---------- */

  _tone({ freq = 440, type = 'square', dur = 0.15, vol = 0.5, slide = 0, delay = 0, dest = null }) {
    const ctx = this._ensureContext();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g).connect(dest || this.sfxGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  _noise({ dur = 0.2, vol = 0.4, freq = 1000, delay = 0 }) {
    const ctx = this._ensureContext();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter).connect(g).connect(this.sfxGain);
    src.start(t0);
  }

  /* ---------- named effects ---------- */

  click()    { this._tone({ freq: 700, type: 'triangle', dur: 0.07, vol: 0.35 }); }
  select()   { this._tone({ freq: 520, type: 'triangle', dur: 0.08, vol: 0.4 }); this._tone({ freq: 780, dur: 0.1, vol: 0.35, delay: 0.06, type: 'triangle' }); }
  back()     { this._tone({ freq: 420, type: 'triangle', dur: 0.09, vol: 0.3, slide: -140 }); }
  bolt()     { this._tone({ freq: 1180, type: 'square', dur: 0.09, vol: 0.3 }); this._tone({ freq: 1560, type: 'square', dur: 0.12, vol: 0.25, delay: 0.05 }); }
  jump()     { this._tone({ freq: 300, type: 'sawtooth', dur: 0.25, vol: 0.35, slide: 500 }); }
  land()     { this._noise({ dur: 0.18, vol: 0.5, freq: 300 }); this._tone({ freq: 90, type: 'sine', dur: 0.18, vol: 0.5 }); }
  bigLand()  { this._noise({ dur: 0.3, vol: 0.7, freq: 220 }); this._tone({ freq: 70, type: 'sine', dur: 0.3, vol: 0.65 }); }
  breakBox() { this._noise({ dur: 0.22, vol: 0.6, freq: 900 }); this._tone({ freq: 200, type: 'square', dur: 0.1, vol: 0.3 }); }
  cone()     { this._tone({ freq: 350, type: 'square', dur: 0.08, vol: 0.3, slide: -120 }); }
  bounce()   { this._tone({ freq: 240, type: 'sine', dur: 0.16, vol: 0.45, slide: 220 }); }
  splash()   { this._noise({ dur: 0.3, vol: 0.45, freq: 400 }); }
  boost()    { this._tone({ freq: 220, type: 'sawtooth', dur: 0.45, vol: 0.4, slide: 900 }); }
  bonk()     { this._noise({ dur: 0.12, vol: 0.4, freq: 500 }); this._tone({ freq: 130, type: 'square', dur: 0.12, vol: 0.35, slide: -50 }); }
  star()     { [880, 1100, 1320, 1760].forEach((f, i) => this._tone({ freq: f, type: 'triangle', dur: 0.14, vol: 0.3, delay: i * 0.07 })); }
  countdown(){ this._tone({ freq: 440, type: 'square', dur: 0.18, vol: 0.4 }); }
  go()       { this._tone({ freq: 660, type: 'square', dur: 0.4, vol: 0.45 }); this._tone({ freq: 880, type: 'square', dur: 0.35, vol: 0.35, delay: 0.1 }); }
  checkpoint(){ this._tone({ freq: 620, type: 'triangle', dur: 0.12, vol: 0.4 }); this._tone({ freq: 930, type: 'triangle', dur: 0.16, vol: 0.35, delay: 0.08 }); }

  finish() {
    [523, 659, 784, 1047].forEach((f, i) =>
      this._tone({ freq: f, type: 'square', dur: 0.22, vol: 0.4, delay: i * 0.12 }));
    this._noise({ dur: 0.5, vol: 0.3, freq: 2000, delay: 0.4 });
  }

  unlock() {
    [392, 523, 659, 784, 1047].forEach((f, i) =>
      this._tone({ freq: f, type: 'triangle', dur: 0.18, vol: 0.4, delay: i * 0.09 }));
  }

  achievement() {
    [660, 880, 1320].forEach((f, i) =>
      this._tone({ freq: f, type: 'triangle', dur: 0.2, vol: 0.4, delay: i * 0.1 }));
  }

  /* ---------- engine loop ---------- */

  engineStart() {
    const ctx = this._ensureContext();
    if (!ctx || this.engineNodes) return;
    try {
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc2.type = 'square';
      osc.frequency.value = 55;
      osc2.frequency.value = 27;
      filter.type = 'lowpass';
      filter.frequency.value = 400;
      g.gain.value = 0;
      osc.connect(filter);
      osc2.connect(filter);
      filter.connect(g).connect(this.sfxGain);
      osc.start(); osc2.start();
      this.engineNodes = { osc, osc2, filter, g };
    } catch (e) { this.engineNodes = null; }
  }

  /* speedRatio 0..1, airborne mutes a little */
  engineUpdate(speedRatio, airborne) {
    if (!this.engineNodes || !this.ctx) return;
    const t = this.ctx.currentTime;
    const f = 45 + speedRatio * 140;
    this.engineNodes.osc.frequency.setTargetAtTime(f, t, 0.08);
    this.engineNodes.osc2.frequency.setTargetAtTime(f / 2, t, 0.08);
    this.engineNodes.filter.frequency.setTargetAtTime(280 + speedRatio * 900, t, 0.1);
    const vol = (0.10 + speedRatio * 0.16) * (airborne ? 1.25 : 1);
    this.engineNodes.g.gain.setTargetAtTime(vol, t, 0.1);
  }

  engineStop() {
    if (!this.engineNodes || !this.ctx) { this.engineNodes = null; return; }
    const { osc, osc2, g } = this.engineNodes;
    const t = this.ctx.currentTime;
    try {
      g.gain.setTargetAtTime(0, t, 0.08);
      osc.stop(t + 0.4); osc2.stop(t + 0.4);
    } catch (e) { /* already stopped */ }
    this.engineNodes = null;
  }

  /* ---------- simple procedural music ---------- */

  startMusic(kind = 'menu') {
    this.stopMusic();
    const ctx = this._ensureContext();
    if (!ctx) return;
    // Bouncy pentatonic loop; race version is faster.
    const scale = [262, 294, 330, 392, 440, 523, 587, 659];
    const pattern = kind === 'race'
      ? [0, 4, 2, 4, 5, 4, 7, 4, 0, 4, 2, 4, 5, 7, 5, 4]
      : [0, 2, 4, 2, 5, 4, 2, 0, 4, 5, 7, 5, 4, 2, 4, 2];
    const stepMs = kind === 'race' ? 170 : 240;
    this.musicStep = 0;
    this.musicTimer = setInterval(() => {
      if (!this.ctx || this.ctx.state !== 'running') return;
      const idx = pattern[this.musicStep % pattern.length];
      this._tone({ freq: scale[idx], type: 'triangle', dur: stepMs / 1000 * 0.9, vol: 0.5, dest: this.musicGain });
      if (this.musicStep % 4 === 0) {
        this._tone({ freq: scale[idx] / 2, type: 'sine', dur: stepMs / 1000 * 1.6, vol: 0.6, dest: this.musicGain });
      }
      this.musicStep++;
    }, stepMs);
  }

  stopMusic() {
    if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; }
  }

  /* ---------- text to speech (optional helper, off by default) ---------- */

  speak(text, force = false) {
    if (!force && !this.settings.tts) return;
    try {
      if (!('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.95;
      u.pitch = 1.1;
      window.speechSynthesis.speak(u);
    } catch (e) { /* speech is best-effort */ }
  }

  stopSpeech() {
    try { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
  }

  get ttsAvailable() {
    return 'speechSynthesis' in window;
  }
}

export const audio = new AudioService();
