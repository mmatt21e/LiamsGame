/*
 * Application bootstrap: initialize services, register screens,
 * wire global UI (update banner, offline indicator), then start.
 */

import { CONFIG } from './config.js';
import { Router } from './router.js';
import { storage } from './services/storage-service.js';
import { profileService } from './services/profile-service.js';
import { audio } from './services/audio-service.js';
import { pwa } from './services/pwa-service.js';
import { registerScreens, applySettings } from './ui/screens.js';
import { toast, achievementToast } from './ui/dialogs.js';

const splash = document.getElementById('splash');
const splashBar = document.getElementById('splash-progress');
const splashStatus = document.getElementById('splash-status');

function setProgress(pct, text) {
  if (splashBar) splashBar.style.width = pct + '%';
  if (splashStatus && text) splashStatus.textContent = text;
}

async function boot() {
  try {
    setProgress(15, 'Warming up the engine…');
    const mode = await storage.init();

    setProgress(40, 'Loading your garage…');
    await profileService.init();

    setProgress(60, 'Checking offline parts…');
    await pwa.init();

    setProgress(80, 'Painting the trucks…');
    audio.armUnlock();

    const appEl = document.getElementById('app');
    const router = new Router(appEl);
    registerScreens(router);
    wireGlobalUi(router);

    // Achievements can pop from anywhere.
    profileService.addEventListener('achievement', (e) => achievementToast(e.detail));

    if (profileService.current) applySettings(profileService.settings);

    setProgress(100, 'Ready!');
    appEl.hidden = false;

    if (pwa.isInstalled) {
      // Installed app: straight into the game.
      if (profileService.current) router.home('main-menu');
      else router.home('profile-select');
    } else {
      // Browser tab: landing page with the install pitch first.
      router.home('landing');
    }

    if (mode !== 'idb') {
      toast('Heads up: this browser is blocking saves. Progress may be lost when you close the game.', '⚠️');
    }

    setTimeout(() => {
      splash.classList.add('splash-hide');
      setTimeout(() => splash.remove(), 600);
    }, 250);
  } catch (err) {
    // Boot must never leave a child staring at a dead screen.
    setProgress(100, 'Something went wrong — trying anyway…');
    console.error('Boot error:', err);
    try {
      const appEl = document.getElementById('app');
      const router = new Router(appEl);
      registerScreens(router);
      appEl.hidden = false;
      router.home('profile-select');
      splash.classList.add('splash-hide');
    } catch (err2) {
      if (splashStatus) splashStatus.textContent = 'Please reload the page to try again.';
    }
  }
}

function wireGlobalUi(router) {
  // Update banner.
  const banner = document.getElementById('update-banner');
  const reloadBtn = document.getElementById('update-reload-btn');
  const dismissBtn = document.getElementById('update-dismiss-btn');
  pwa.addEventListener('update-ready', () => { banner.hidden = false; });
  reloadBtn.addEventListener('click', () => {
    // If a race is running, the engine pauses on visibilitychange during reload — safe.
    pwa.applyUpdate();
  });
  dismissBtn.addEventListener('click', () => { banner.hidden = true; });

  // Network / offline-ready indicator.
  const net = document.getElementById('net-indicator');
  const showNet = (text, offline, ms) => {
    net.textContent = text;
    net.classList.toggle('net-offline', offline);
    net.hidden = false;
    if (ms) setTimeout(() => { net.hidden = true; }, ms);
  };
  pwa.addEventListener('network', (e) => {
    if (e.detail.online) showNet('🌐 Back online', false, 4000);
    else showNet('✈️ Offline — keep playing!', true, 6000);
  });
  pwa.addEventListener('offline-ready', () => {
    showNet('✅ Ready for offline play', false, 6000);
    toast('Game saved for offline play! You can now play without internet.', '✈️');
  });
  if (!navigator.onLine) showNet('✈️ Offline mode', true, 6000);

  // Keep saves flushed when leaving.
  window.addEventListener('pagehide', () => { profileService.flush(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) profileService.flush();
  });

  // Global error safety net: never crash silently.
  window.addEventListener('error', (e) => {
    console.error(e.error || e.message);
  });
  window.addEventListener('unhandledrejection', (e) => {
    console.error(e.reason);
  });
}

boot();
export { CONFIG };
