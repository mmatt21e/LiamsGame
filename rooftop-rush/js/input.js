/*
 * Input: swipe gestures (left/right/up/down) + keyboard equivalents.
 * Actions are queued and consumed once per frame by main.js so a fast
 * swipe right before a frame boundary is never lost.
 */

export class Input {
  constructor() {
    this.queue = [];
    this.pauseEdge = false;
    this._touchStart = null;

    this._down = (e) => {
      const k = e.key.toLowerCase();
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
      if (e.repeat) return;
      if (k === 'escape' || k === 'p') { this.pauseEdge = true; return; }
      if (k === 'arrowleft' || k === 'a') this.queue.push('left');
      else if (k === 'arrowright' || k === 'd') this.queue.push('right');
      else if (k === 'arrowup' || k === 'w' || k === ' ') this.queue.push('jump');
      else if (k === 'arrowdown' || k === 's') this.queue.push('slide');
    };
  }

  attach(surface) {
    window.addEventListener('keydown', this._down);

    // Swipes anywhere on the game canvas.
    surface.addEventListener('touchstart', (e) => {
      const t = e.changedTouches[0];
      this._touchStart = { x: t.clientX, y: t.clientY, at: performance.now() };
    }, { passive: true });

    surface.addEventListener('touchend', (e) => {
      if (!this._touchStart) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - this._touchStart.x;
      const dy = t.clientY - this._touchStart.y;
      this._touchStart = null;
      const adx = Math.abs(dx), ady = Math.abs(dy);
      if (Math.max(adx, ady) < 24) { this.queue.push('jump'); return; } // tap = jump
      if (adx > ady) this.queue.push(dx > 0 ? 'right' : 'left');
      else this.queue.push(dy > 0 ? 'slide' : 'jump');
    }, { passive: true });
  }

  consumeActions() {
    const q = this.queue;
    this.queue = [];
    return q;
  }

  consumePause() { const v = this.pauseEdge; this.pauseEdge = false; return v; }
}
