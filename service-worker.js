/*
 * Monster Track Garage — service worker.
 * Strategy: version-named cache, precache every app file on install,
 * cache-first for same-origin requests, index.html fallback for navigations.
 * The cache name includes APP_VERSION (js/version.js); bumping the version
 * installs a fresh cache and the old one is deleted on activate.
 */
'use strict';

importScripts('js/version.js');

const CACHE_NAME = 'mtg-cache-v' + self.APP_VERSION;

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './css/game.css',
  './css/accessibility.css',
  './js/version.js',
  './js/app.js',
  './js/config.js',
  './js/router.js',
  './js/game/game-engine.js',
  './js/game/input-manager.js',
  './js/game/physics.js',
  './js/game/renderer.js',
  './js/game/vehicle.js',
  './js/game/track.js',
  './js/game/collision.js',
  './js/data/vehicles.js',
  './js/data/tracks.js',
  './js/data/achievements.js',
  './js/services/storage-service.js',
  './js/services/audio-service.js',
  './js/services/pwa-service.js',
  './js/services/profile-service.js',
  './js/ui/screens.js',
  './js/ui/dialogs.js',
  './js/ui/hud.js',
  './assets/icons/favicon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/maskable-512.png',
  './assets/icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      // Do NOT auto-skipWaiting: the page shows a "Reload to Update" button
      // and only then asks us to take over, so a mid-game update never
      // swaps files under the player.
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((name) => name.startsWith('mtg-cache-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (data.type === 'GET_STATUS' && event.source) {
    caches.open(CACHE_NAME)
      .then((cache) => cache.keys())
      .then((keys) => {
        event.source.postMessage({
          type: 'SW_STATUS',
          version: self.APP_VERSION,
          cacheName: CACHE_NAME,
          cachedCount: keys.length,
          precacheTotal: PRECACHE_URLS.length,
          offlineReady: keys.length >= PRECACHE_URLS.length
        });
      })
      .catch(() => {
        event.source.postMessage({ type: 'SW_STATUS', version: self.APP_VERSION, cacheName: CACHE_NAME, cachedCount: 0, precacheTotal: PRECACHE_URLS.length, offlineReady: false });
      });
  }
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // never touch cross-origin (there should be none)

  // Navigations: serve the cached shell so the app opens offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html', { cacheName: CACHE_NAME })
        .then((cached) => cached || fetch(request))
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        // Opportunistically cache anything same-origin we fetched live.
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
        }
        return response;
      });
    })
  );
});
