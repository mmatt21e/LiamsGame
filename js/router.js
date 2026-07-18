/*
 * Tiny screen router. Screens register a render function; go()/back()
 * manage a navigation stack. No URL routing — the game is a single page
 * and works identically offline and under any base path.
 */

export class Router {
  constructor(rootEl) {
    this.root = rootEl;
    this.screens = new Map();
    this.stack = [];
    this.currentCleanup = null;
  }

  register(id, renderFn) {
    this.screens.set(id, renderFn);
  }

  go(id, params = {}) {
    this.stack.push({ id, params });
    this._render(id, params);
  }

  replace(id, params = {}) {
    this.stack.pop();
    this.stack.push({ id, params });
    this._render(id, params);
  }

  back(fallbackId = 'main-menu') {
    this.stack.pop();
    const prev = this.stack[this.stack.length - 1];
    if (prev) {
      this._render(prev.id, prev.params);
    } else {
      this.go(fallbackId);
    }
  }

  /* Reset the stack and go home (used after races, profile switches…). */
  home(id = 'main-menu', params = {}) {
    this.stack = [];
    this.go(id, params);
  }

  get currentId() {
    const top = this.stack[this.stack.length - 1];
    return top ? top.id : null;
  }

  _render(id, params) {
    const fn = this.screens.get(id);
    if (!fn) return;
    if (typeof this.currentCleanup === 'function') {
      try { this.currentCleanup(); } catch (e) { /* screen cleanup must never break nav */ }
      this.currentCleanup = null;
    }
    this.root.innerHTML = '';
    this.root.scrollTop = 0;
    const cleanup = fn(this.root, params, this);
    if (typeof cleanup === 'function') this.currentCleanup = cleanup;
    // Move focus to the screen title for keyboard/screen-reader users.
    const h = this.root.querySelector('h1, h2, .screen-title');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }
}
