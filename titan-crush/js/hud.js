/*
 * HUD updates + animated score popups. Only textContent mutations per
 * frame — cheap enough to never affect the render loop.
 */

export class Hud {
  constructor() {
    this.scoreEl = document.getElementById('hud-score');
    this.timerEl = document.getElementById('hud-timer');
    this.timerCell = this.timerEl.closest('.hud-cell');
    this.speedEl = document.getElementById('hud-speed');
    this.airEl = document.getElementById('hud-air');
    this.popupsEl = document.getElementById('popups');
    this._score = -1;
    this._time = -1;
    this._speed = -1;
  }

  setScore(v) {
    if (v !== this._score) { this._score = v; this.scoreEl.textContent = String(v); }
  }

  setTimer(seconds, show) {
    this.timerCell.hidden = !show;
    if (!show) return;
    const s = Math.max(0, Math.ceil(seconds));
    if (s !== this._time) {
      this._time = s;
      this.timerEl.textContent = String(s);
      this.timerCell.classList.toggle('hurry', s <= 10);
    }
  }

  setSpeed(kmh) {
    const v = Math.round(kmh);
    if (v !== this._speed) { this._speed = v; this.speedEl.textContent = String(v); }
  }

  setAir(on, seconds) {
    this.airEl.hidden = !on;
    if (on) this.airEl.textContent = `AIR ✈ ${seconds.toFixed(1)}s`;
  }

  /* Animated popup, e.g. "CRUSHED! +100". big = gold & larger. */
  popup(text, big = false) {
    const el = document.createElement('div');
    el.className = 'popup' + (big ? ' big' : '');
    el.textContent = text;
    // Slight horizontal scatter so rapid popups don't stack exactly.
    el.style.marginLeft = (Math.random() * 120 - 60) + 'px';
    this.popupsEl.appendChild(el);
    setTimeout(() => el.remove(), 1050);
  }

  clearPopups() {
    this.popupsEl.innerHTML = '';
  }
}
