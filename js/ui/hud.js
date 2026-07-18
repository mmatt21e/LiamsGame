/*
 * HUD — DOM overlay during gameplay: top bar, touch controls, countdown,
 * feedback messages and the pause menu. Values are updated in place
 * (no per-frame DOM churn beyond textContent of two chips).
 */

import { audio } from '../services/audio-service.js';

export class Hud {
  constructor(hudEl) {
    this.el = hudEl;
    this._lastTimeText = '';
    this._feedbackAt = 0;
  }

  build({ settings, freeDrive, input, onPause }) {
    this.el.innerHTML = '';
    this.el.classList.toggle('hud-mirrored', !!settings.leftHanded);
    this.el.classList.toggle('hud-big-controls', !!settings.largeUI);

    // --- Top bar ---
    const top = document.createElement('div');
    top.className = 'hud-top';

    const pauseBtn = document.createElement('button');
    pauseBtn.className = 'hud-pause-btn';
    pauseBtn.textContent = '⏸';
    pauseBtn.setAttribute('aria-label', 'Pause game');
    pauseBtn.addEventListener('click', () => { audio.click(); onPause(); });
    top.appendChild(pauseBtn);

    this.timerChip = document.createElement('div');
    this.timerChip.className = 'hud-chip hud-timer';
    this.timerChip.textContent = freeDrive ? '🛠️ Free Drive' : '⏱️ 0:00.0';
    top.appendChild(this.timerChip);

    this.boltChip = document.createElement('div');
    this.boltChip.className = 'hud-chip hud-bolts';
    this.boltChip.textContent = '🔩 0';
    top.appendChild(this.boltChip);

    if (!freeDrive) {
      this.progress = document.createElement('div');
      this.progress.className = 'hud-progress';
      this.progress.setAttribute('role', 'progressbar');
      this.progress.setAttribute('aria-label', 'Checkpoints');
      this.progressFill = document.createElement('div');
      this.progressFill.className = 'hud-progress-fill';
      this.progress.appendChild(this.progressFill);
      top.appendChild(this.progress);
    }
    this.el.appendChild(top);

    // --- Touch controls ---
    const steer = document.createElement('div');
    steer.className = 'touch-cluster touch-cluster-steer';
    steer.appendChild(this._touchBtn('◀', 'Steer left', 'left', input, '', 'Left'));
    steer.appendChild(this._touchBtn('▶', 'Steer right', 'right', input, '', 'Right'));
    this.el.appendChild(steer);

    const pedals = document.createElement('div');
    pedals.className = 'touch-cluster touch-cluster-pedals';

    this.boostMeterEl = document.createElement('div');
    this.boostMeterEl.className = 'hud-boost-meter';
    this.boostFill = document.createElement('div');
    this.boostFill.className = 'hud-boost-fill';
    this.boostMeterEl.appendChild(this.boostFill);
    pedals.appendChild(this.boostMeterEl);

    const row = document.createElement('div');
    row.className = 'pedal-row';
    this.boostBtn = this._touchBtn('🚀', 'Boost', 'boost', input, 'touch-btn-boost');
    row.appendChild(this.boostBtn);
    row.appendChild(this._touchBtn('🛑', 'Brake and reverse', 'brake', input, 'touch-btn-brake'));
    if (!settings.autoAccel) {
      row.appendChild(this._touchBtn('🟢', 'Accelerate', 'gas', input, 'touch-btn-gas'));
    }
    pedals.appendChild(row);
    this.el.appendChild(pedals);

    // --- Keyboard hint (desktop only, hidden by CSS on touch) ---
    const hint = document.createElement('div');
    hint.className = 'hud-keys-hint';
    hint.textContent = '⌨️ Arrows / WASD drive · Space = boost · R = back on track · Esc = pause';
    this.el.appendChild(hint);
  }

  _touchBtn(icon, label, control, input, extraClass = '', shortLabel = null) {
    const b = document.createElement('button');
    b.className = 'touch-btn ' + extraClass;
    b.setAttribute('aria-label', label);
    const i = document.createElement('span');
    i.textContent = icon;
    b.appendChild(i);
    const s = document.createElement('small');
    s.textContent = shortLabel || label.split(' ')[0];
    b.appendChild(s);

    const press = (e) => {
      e.preventDefault();
      b.classList.add('touch-active');
      input.setTouch(control, true);
    };
    const release = () => {
      b.classList.remove('touch-active');
      input.setTouch(control, false);
    };
    b.addEventListener('pointerdown', press);
    b.addEventListener('pointerup', release);
    b.addEventListener('pointercancel', release);
    b.addEventListener('pointerleave', release);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
    return b;
  }

  setTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = (seconds % 60).toFixed(1).padStart(4, '0');
    const text = `⏱️ ${m}:${s}`;
    if (text !== this._lastTimeText) {
      this._lastTimeText = text;
      this.timerChip.textContent = text;
    }
  }

  setBolts(n) {
    this.boltChip.textContent = `🔩 ${n}`;
  }

  setProgress(hit, total) {
    if (!this.progressFill) return;
    const pct = total === 0 ? 100 : Math.round((hit / total) * 100);
    this.progressFill.style.width = pct + '%';
    this.progress.setAttribute('aria-valuenow', String(pct));
  }

  setBoostMeter(v) {
    if (!this.boostFill) return;
    this.boostFill.style.width = Math.round(v * 100) + '%';
    if (this.boostBtn) this.boostBtn.classList.toggle('boost-ready', v >= 0.99);
  }

  showCountdown(text) {
    this._removeCenter();
    const el = document.createElement('div');
    el.className = 'hud-center-msg';
    el.textContent = text;
    this.el.appendChild(el);
    this._centerEl = el;
    setTimeout(() => { if (this._centerEl === el) { el.remove(); this._centerEl = null; } }, 950);
  }

  showFeedback(text) {
    const now = performance.now();
    if (now - this._feedbackAt < 700) return; // don't spam
    this._feedbackAt = now;
    const el = document.createElement('div');
    el.className = 'hud-feedback';
    el.textContent = text;
    this.el.appendChild(el);
    setTimeout(() => el.remove(), 1150);
  }

  _removeCenter() {
    if (this._centerEl) { this._centerEl.remove(); this._centerEl = null; }
  }

  /* ---------- Pause menu ---------- */

  showPauseMenu({ freeDrive, onResume, onRestart, onReset, onExit }) {
    this.hidePauseMenu();
    const overlay = document.createElement('div');
    overlay.className = 'pause-overlay';
    const panel = document.createElement('div');
    panel.className = 'pause-panel';
    const h = document.createElement('h2');
    h.textContent = 'Paused ⏸';
    panel.appendChild(h);

    const mk = (label, cls, fn) => {
      const b = document.createElement('button');
      b.className = 'btn ' + cls;
      b.style.width = '100%';
      b.style.marginBottom = '10px';
      b.textContent = label;
      b.addEventListener('click', () => { audio.click(); fn(); });
      panel.appendChild(b);
      return b;
    };

    const resumeBtn = mk('▶️ Keep Driving', 'btn-green', () => { this.hidePauseMenu(); onResume(); });
    mk('🔄 Back on Track', 'btn-blue', () => { this.hidePauseMenu(); onReset(); onResume(); });
    if (!freeDrive) mk('🔁 Restart Race', '', () => { this.hidePauseMenu(); onRestart(); });
    mk('🚪 Exit to Menu', 'btn-ghost', () => { this.hidePauseMenu(); onExit(); });

    overlay.appendChild(panel);
    this.el.appendChild(overlay);
    this._pauseOverlay = overlay;
    resumeBtn.focus();

    // Escape resumes.
    this._pauseKeyHandler = (e) => {
      if (e.key === 'Escape') { this.hidePauseMenu(); onResume(); }
    };
    window.addEventListener('keydown', this._pauseKeyHandler);
  }

  hidePauseMenu() {
    if (this._pauseOverlay) { this._pauseOverlay.remove(); this._pauseOverlay = null; }
    if (this._pauseKeyHandler) {
      window.removeEventListener('keydown', this._pauseKeyHandler);
      this._pauseKeyHandler = null;
    }
  }

  destroy() {
    this.hidePauseMenu();
    this.el.innerHTML = '';
  }
}
