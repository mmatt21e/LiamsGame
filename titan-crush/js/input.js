/*
 * Input: keyboard (WASD / arrows / space / R / Esc) merged with the
 * on-screen touch buttons. Read once per frame via getState().
 */

export class Input {
  constructor() {
    this.keys = new Set();
    this.touch = { left: false, right: false, gas: false, brake: false };
    this.resetEdge = false;
    this.pauseEdge = false;
    this._down = (e) => {
      const k = e.key.toLowerCase();
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
      if (k === 'escape' || k === 'p') { this.pauseEdge = true; return; }
      if (k === 'r' && !e.repeat) { this.resetEdge = true; return; }
      this.keys.add(k);
    };
    this._up = (e) => this.keys.delete(e.key.toLowerCase());
    this._blur = () => this.clear();
  }

  attach() {
    window.addEventListener('keydown', this._down);
    window.addEventListener('keyup', this._up);
    window.addEventListener('blur', this._blur);
    // Touch buttons (press & hold).
    const bind = (id, control) => {
      const el = document.getElementById(id);
      if (!el) return;
      const on = (e) => { e.preventDefault(); el.classList.add('held'); this.touch[control] = true; };
      const off = () => { el.classList.remove('held'); this.touch[control] = false; };
      el.addEventListener('pointerdown', on);
      el.addEventListener('pointerup', off);
      el.addEventListener('pointercancel', off);
      el.addEventListener('pointerleave', off);
      el.addEventListener('contextmenu', (e) => e.preventDefault());
    };
    bind('t-left', 'left');
    bind('t-right', 'right');
    bind('t-gas', 'gas');
    bind('t-brake', 'brake');
    const reset = document.getElementById('t-reset');
    if (reset) reset.addEventListener('click', () => { this.resetEdge = true; });
  }

  clear() {
    this.keys.clear();
    for (const k of Object.keys(this.touch)) this.touch[k] = false;
  }

  consumeReset() { const v = this.resetEdge; this.resetEdge = false; return v; }
  consumePause() { const v = this.pauseEdge; this.pauseEdge = false; return v; }

  getState() {
    const k = this.keys;
    return {
      steer: ((k.has('d') || k.has('arrowright') || this.touch.right) ? 1 : 0) -
             ((k.has('a') || k.has('arrowleft') || this.touch.left) ? 1 : 0),
      throttle: (k.has('w') || k.has('arrowup') || k.has(' ') || this.touch.gas) ? 1 : 0,
      brake: (k.has('s') || k.has('arrowdown') || this.touch.brake) ? 1 : 0
    };
  }
}
