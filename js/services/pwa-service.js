/*
 * PwaService — service-worker registration, safe updates, offline status,
 * install prompt, and diagnostics info.
 */

import { CONFIG } from '../config.js';

class PwaService extends EventTarget {
  constructor() {
    super();
    this.registration = null;
    this.waitingWorker = null;
    this.installPromptEvent = null;
    this.swSupported = 'serviceWorker' in navigator;
    this.registerError = null;
  }

  async init() {
    window.addEventListener('online', () => this._emitNet());
    window.addEventListener('offline', () => this._emitNet());
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.installPromptEvent = e;
      this.dispatchEvent(new CustomEvent('installable'));
    });

    if (!this.swSupported) return;
    try {
      // Relative path → works from any GitHub Pages subdirectory.
      this.registration = await navigator.serviceWorker.register('service-worker.js');
      if (this.registration.waiting && navigator.serviceWorker.controller) {
        this._setWaiting(this.registration.waiting);
      }
      this.registration.addEventListener('updatefound', () => {
        const nw = this.registration.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            this._setWaiting(nw);
          } else if (nw.state === 'installed' && !navigator.serviceWorker.controller) {
            // First install completed — offline is now ready.
            this.dispatchEvent(new CustomEvent('offline-ready'));
          }
        });
      });
      let refreshed = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshed) return;
        refreshed = true;
        window.location.reload();
      });
    } catch (err) {
      this.registerError = String(err && err.message || err);
    }
  }

  _setWaiting(worker) {
    this.waitingWorker = worker;
    this.dispatchEvent(new CustomEvent('update-ready'));
  }

  /* Called by the "Reload to Update" button. */
  applyUpdate() {
    if (this.waitingWorker) {
      this.waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  }

  _emitNet() {
    this.dispatchEvent(new CustomEvent('network', { detail: { online: navigator.onLine } }));
  }

  get online() { return navigator.onLine; }

  get isInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.navigator.standalone === true;
  }

  async promptInstall() {
    if (!this.installPromptEvent) return 'unavailable';
    const ev = this.installPromptEvent;
    this.installPromptEvent = null;
    try {
      ev.prompt();
      const choice = await ev.userChoice;
      return choice && choice.outcome ? choice.outcome : 'dismissed';
    } catch (e) {
      return 'dismissed';
    }
  }

  /* Ask the active service worker for cache status (with timeout). */
  getSwStatus() {
    return new Promise((resolve) => {
      const fallback = {
        version: CONFIG.version, cacheName: '(none)', cachedCount: 0,
        precacheTotal: 0, offlineReady: false, controlled: false
      };
      if (!this.swSupported || !navigator.serviceWorker.controller) {
        resolve(fallback);
        return;
      }
      const timer = setTimeout(() => resolve({ ...fallback, controlled: true }), 2500);
      const onMsg = (event) => {
        if (event.data && event.data.type === 'SW_STATUS') {
          clearTimeout(timer);
          navigator.serviceWorker.removeEventListener('message', onMsg);
          resolve({ ...event.data, controlled: true });
        }
      };
      navigator.serviceWorker.addEventListener('message', onMsg);
      try {
        navigator.serviceWorker.controller.postMessage({ type: 'GET_STATUS' });
      } catch (e) {
        clearTimeout(timer);
        resolve({ ...fallback, controlled: true });
      }
    });
  }
}

export const pwa = new PwaService();
