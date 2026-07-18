/*
 * InputManager — merges keyboard and touch-button input into one state.
 * Keyboard: arrows / WASD, Space = boost, Escape or P = pause, R = reset.
 * Touch buttons call setTouch('left'|'right'|'gas'|'brake'|'boost', pressed).
 */

export class InputManager {
  constructor() {
    this.keys = new Set();
    this.touch = { left: false, right: false, gas: false, brake: false, boost: false };
    this._boostEdge = false;
    this._pauseEdge = false;
    this._resetEdge = false;
    this._prevBoostHeld = false;
    this._onKeyDown = (e) => this._keyDown(e);
    this._onKeyUp = (e) => this._keyUp(e);
    this._onBlur = () => this.clear();
  }

  attach() {
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
  }

  detach() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
    this.clear();
  }

  clear() {
    this.keys.clear();
    for (const k of Object.keys(this.touch)) this.touch[k] = false;
  }

  _keyDown(e) {
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k) || k === 'spacebar') {
      e.preventDefault();
    }
    if (k === 'escape' || k === 'p') { this._pauseEdge = true; return; }
    if (k === 'r' && !e.repeat) { this._resetEdge = true; return; }
    this.keys.add(k);
  }

  _keyUp(e) {
    this.keys.delete(e.key.toLowerCase());
  }

  setTouch(control, pressed) {
    if (control in this.touch) this.touch[control] = pressed;
  }

  /* Edge-triggered flags consumed once per read. */
  consumePause() { const v = this._pauseEdge; this._pauseEdge = false; return v; }
  consumeReset() { const v = this._resetEdge; this._resetEdge = false; return v; }

  getState(settings) {
    const k = this.keys;
    const left = k.has('arrowleft') || k.has('a') || this.touch.left;
    const right = k.has('arrowright') || k.has('d') || this.touch.right;
    const up = k.has('arrowup') || k.has('w') || this.touch.gas;
    const down = k.has('arrowdown') || k.has('s') || this.touch.brake;
    const boostHeld = k.has(' ') || k.has('spacebar') || this.touch.boost;

    // Boost is edge-triggered so holding doesn't re-fire.
    const boost = boostHeld && !this._prevBoostHeld;
    this._prevBoostHeld = boostHeld;

    let throttle = up ? 1 : 0;
    if (settings && settings.autoAccel && !down) throttle = 1;

    return {
      steer: (right ? 1 : 0) - (left ? 1 : 0),
      throttle,
      brake: down ? 1 : 0,
      boost
    };
  }
}
