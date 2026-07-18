/*
 * All application screens. Each screen is a render function
 * (root, params, router) => optional cleanup function.
 * Player-provided strings are only ever set via textContent.
 */

import { CONFIG, DIFFICULTY, REWARDS, PRESET_NAMES, AVATARS } from '../config.js';
import { VEHICLES, getVehicle, CUSTOMIZATION, customOption } from '../data/vehicles.js';
import { TRACKS, FREE_DRIVE_TRACK, THEMES, getTrack, adventureTracks } from '../data/tracks.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { profileService } from '../services/profile-service.js';
import { storage } from '../services/storage-service.js';
import { audio } from '../services/audio-service.js';
import { pwa } from '../services/pwa-service.js';
import { GameEngine } from '../game/game-engine.js';
import { drawVehiclePreview } from '../game/vehicle.js';
import { Hud } from './hud.js';
import {
  showDialog, alertDialog, confirmDialog, promptText, parentGate, toast
} from './dialogs.js';

/* ---------- small DOM helpers ---------- */

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function screenShell(root, title, router, opts = {}) {
  const s = el('div', 'screen');
  const header = el('div', 'screen-header');
  if (opts.back !== false) {
    const back = el('button', 'btn btn-back', '←');
    back.setAttribute('aria-label', 'Go back');
    back.addEventListener('click', () => { audio.back(); router.back(); });
    header.appendChild(back);
  }
  header.appendChild(el('h1', 'screen-title', title));
  if (opts.badge) header.appendChild(opts.badge);
  s.appendChild(header);
  const body = el('div', 'screen-body');
  s.appendChild(body);
  root.appendChild(s);
  return body;
}

function boltBadge() {
  const p = profileService.current;
  return el('span', 'badge badge-bolts', `🔩 ${p ? p.bolts : 0}`);
}

function bigButton(label, icon, cls, fn) {
  const b = el('button', 'btn btn-big ' + cls);
  const i = el('span', 'btn-icon', icon);
  b.appendChild(i);
  b.appendChild(document.createTextNode(label));
  b.addEventListener('click', () => { audio.select(); fn(); });
  return b;
}

function statRows(container, stats) {
  for (const [key, label] of [['speed', 'Speed'], ['accel', 'Zoom-up'], ['grip', 'Grip'], ['jump', 'Jump'], ['strength', 'Strength']]) {
    const row = el('div', 'stat-row');
    row.appendChild(el('span', 'stat-label', label));
    const bar = el('div', 'stat-bar');
    const fill = el('div', 'stat-bar-fill');
    fill.style.width = (stats[key] * 20) + '%';
    bar.appendChild(fill);
    row.appendChild(bar);
    // Colour-independent: also show pips.
    row.appendChild(el('span', 'stat-pips', '●'.repeat(stats[key]) + '○'.repeat(5 - stats[key])));
    container.appendChild(row);
  }
}

function formatTime(ms) {
  const s = ms / 1000;
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toFixed(1).padStart(4, '0')}`;
}

/* Apply per-profile settings to the document + audio. */
export function applySettings(settings) {
  const html = document.documentElement;
  html.classList.toggle('a11y-reduced-motion', settings.reducedMotion === 'on');
  html.classList.toggle('a11y-motion-auto', settings.reducedMotion === 'auto');
  html.classList.toggle('a11y-high-contrast', !!settings.highContrast);
  html.classList.toggle('a11y-large-ui', !!settings.largeUI);
  audio.applySettings(settings);
}

/* ==================================================================== */
/*  Screen registration                                                  */
/* ==================================================================== */

export function registerScreens(router) {
  router.register('landing', landingScreen);
  router.register('profile-select', profileSelectScreen);
  router.register('main-menu', mainMenuScreen);
  router.register('quick-race', quickRaceScreen);
  router.register('vehicle-select', vehicleSelectScreen);
  router.register('adventure', adventureScreen);
  router.register('garage', garageScreen);
  router.register('customize', customizeScreen);
  router.register('builder', builderListScreen);
  router.register('builder-edit', builderEditScreen);
  router.register('game', gameScreen);
  router.register('results', resultsScreen);
  router.register('achievements', achievementsScreen);
  router.register('settings', settingsScreen);
  router.register('parent', parentScreen);
  router.register('data', dataScreen);
  router.register('install', installScreen);
  router.register('offline', offlineScreen);
  router.register('diagnostics', diagnosticsScreen);
  router.register('help', helpScreen);
}

/* ==================== Landing (browser-tab visitors) ==================== */

function landingScreen(root, params, router) {
  const s = el('div', 'screen landing-screen');

  const hero = el('div', 'landing-hero');
  hero.appendChild(el('span', 'menu-truck landing-truck', '🛻'));
  hero.appendChild(el('h1', 'menu-title', 'Monster Track Garage'));
  hero.appendChild(el('p', 'landing-tagline', 'Race monster trucks! Build crazy tracks! Smash boxes! 💥'));
  s.appendChild(hero);

  const feats = el('div', 'landing-features');
  for (const [icon, text] of [
    ['🚚', '8 trucks to collect'],
    ['🔨', 'Build your own tracks'],
    ['✈️', 'Works with no internet'],
    ['🚫', 'No ads · No purchases'],
    ['👨‍👩‍👧', 'Safe for kids — nothing online'],
    ['💾', 'Progress saves on your device']
  ]) {
    const f = el('div', 'landing-feature');
    f.appendChild(el('span', 'landing-feature-icon', icon));
    f.appendChild(el('span', '', text));
    feats.appendChild(f);
  }
  s.appendChild(feats);

  const stack = el('div', 'btn-stack');

  const continueToGame = () => {
    router.home(profileService.current ? 'main-menu' : 'profile-select');
  };

  const installBtn = bigButton('Install the App', '📲', 'btn-primary', async () => {
    if (pwa.installPromptEvent) {
      const outcome = await pwa.promptInstall();
      if (outcome === 'accepted') {
        toast('Installing! Look for the truck icon on your home screen 🛻', '📲');
        continueToGame();
      }
      // Dismissed the browser prompt? No nagging — they can still play.
    } else {
      // No automatic prompt on this browser (e.g. iPhone) — show the guide.
      router.go('install');
    }
  });
  stack.appendChild(installBtn);
  stack.appendChild(bigButton('Play in Browser', '▶️', 'btn-green', continueToGame));
  s.appendChild(stack);

  s.appendChild(el('p', 'hint-text landing-hint',
    'Installing puts the game on your home screen and lets you play anywhere — even in airplane mode. ✈️'));

  // More games in this arcade.
  const moreTitle = el('h3', 'landing-more-title', '🎮 More Games');
  s.appendChild(moreTitle);
  const games = [
    ['titan-crush/', '💥', 'TITAN CRUSH', '3D monster truck stunt arena — crush cars, hit ramps, land flips. Ages 8+.', ''],
    ['rooftop-rush/', '🏃', 'ROOFTOP RUSH', '3D endless runner — sprint the subway, leap the rooftops. Ages 8+.', 'landing-more-card-teal']
  ];
  for (const [href, emoji, title, desc, extraCls] of games) {
    const more = el('a', 'landing-more-card ' + extraCls);
    more.href = href;
    more.appendChild(el('span', 'landing-more-emoji', emoji));
    const moreInfo = el('div', 'landing-more-info');
    moreInfo.appendChild(el('strong', '', title));
    moreInfo.appendChild(el('span', '', desc));
    more.appendChild(moreInfo);
    more.appendChild(el('span', 'landing-more-arrow', '▶'));
    s.appendChild(more);
  }

  root.appendChild(s);

  // If the browser announces installability after we rendered, light the button up.
  const onInstallable = () => installBtn.classList.add('landing-install-ready');
  pwa.addEventListener('installable', onInstallable);
  if (pwa.installPromptEvent) onInstallable();
  return () => pwa.removeEventListener('installable', onInstallable);
}

/* ==================== Profile selection ==================== */

function profileSelectScreen(root, params, router) {
  const body = screenShell(root, 'Who Is Racing? 🏁', router, { back: !!profileService.current });

  const grid = el('div', 'card-grid');
  for (const p of profileService.profiles) {
    const card = el('button', 'card');
    card.appendChild(el('span', 'card-emoji avatar-big', p.avatar));
    card.appendChild(el('h3', '', p.name));
    card.appendChild(el('p', '', `🔩 ${p.bolts} · 🏆 ${p.achievements.length}`));
    card.addEventListener('click', async () => {
      audio.select();
      await profileService.selectProfile(p.id);
      applySettings(profileService.settings);
      router.home('main-menu');
    });
    grid.appendChild(card);
  }

  if (profileService.profiles.length < CONFIG.maxProfiles) {
    const add = el('button', 'card');
    add.appendChild(el('span', 'card-emoji', '➕'));
    add.appendChild(el('h3', '', 'New Racer'));
    add.appendChild(el('p', '', 'Make a new profile'));
    add.addEventListener('click', () => createProfileFlow(router));
    grid.appendChild(add);
  }
  body.appendChild(grid);

  if (profileService.profiles.length) {
    const manage = el('div', 'center');
    manage.style.marginTop = '18px';
    const delBtn = el('button', 'btn btn-small btn-ghost', '🗑️ Remove a profile');
    delBtn.addEventListener('click', () => removeProfileFlow(router));
    manage.appendChild(delBtn);
    body.appendChild(manage);
  }

  body.appendChild(el('p', 'hint-text', 'Profiles live only on this device. Up to 4 racers!'));
}

async function createProfileFlow(router) {
  audio.click();
  const name = await promptText({
    title: 'Pick Your Racer Name',
    message: 'Tap a name or type your own!',
    maxLen: CONFIG.maxNameLength,
    presets: PRESET_NAMES.slice(0, 6)
  });
  if (!name) return;
  const avatar = await showDialog({
    title: 'Pick Your Avatar',
    build: (box) => {
      const rowEl = el('div', 'swatch-row');
      rowEl.style.justifyContent = 'center';
      box.appendChild(rowEl);
      box._row = rowEl;
    },
    buttons: AVATARS.slice(0, 8).map((a) => ({ label: a, cls: 'btn-ghost', value: a }))
  });
  if (!avatar) return;
  const p = await profileService.createProfile(name, avatar);
  if (p) {
    applySettings(profileService.settings);
    toast(`Welcome, ${p.name}!`, p.avatar);
    router.home('main-menu');
  }
}

async function removeProfileFlow(router) {
  const buttons = profileService.profiles.map((p) => ({ label: `${p.avatar} ${p.name}`, cls: 'btn-ghost', value: p.id }));
  buttons.push({ label: 'Cancel', cls: 'btn-primary', value: null });
  const id = await showDialog({ title: 'Remove which profile?', buttons });
  if (!id) return;
  const p = profileService.profiles.find((x) => x.id === id);
  if (!(await parentGate(`delete ${p ? p.name : 'this'}'s profile forever`))) return;
  await profileService.deleteProfile(id);
  toast('Profile removed', '🗑️');
  router.replace('profile-select');
}

/* ==================== Main menu ==================== */

function mainMenuScreen(root, params, router) {
  const p = profileService.current;
  if (!p) { router.home('profile-select'); return; }

  const s = el('div', 'screen');
  const logo = el('div', 'menu-logo');
  logo.appendChild(el('span', 'menu-truck', '🛻'));
  logo.appendChild(el('h1', 'menu-title', 'Monster Track Garage'));
  s.appendChild(logo);

  const chip = el('button', 'menu-profile-chip');
  chip.appendChild(el('span', 'avatar', p.avatar));
  chip.appendChild(el('span', '', p.name));
  chip.appendChild(el('span', 'badge badge-bolts', `🔩 ${p.bolts}`));
  chip.setAttribute('aria-label', 'Switch racer profile');
  chip.addEventListener('click', () => { audio.click(); router.go('profile-select'); });
  s.appendChild(chip);

  const stack = el('div', 'btn-stack');
  stack.style.marginTop = '18px';
  stack.appendChild(bigButton('Quick Race', '🏁', 'btn-primary', () => router.go('quick-race')));
  stack.appendChild(bigButton('Adventure Trail', '🗺️', 'btn-green', () => router.go('adventure')));
  stack.appendChild(bigButton('Track Builder', '🔨', 'btn-blue', () => router.go('builder')));
  stack.appendChild(bigButton('Free Drive', '🛠️', '', () => router.go('game', { trackDef: FREE_DRIVE_TRACK, from: 'free' })));
  stack.appendChild(bigButton('My Garage', '🚚', '', () => router.go('garage')));
  s.appendChild(stack);

  const row2 = el('div', 'menu-footer');
  for (const [label, icon, target] of [
    ['Trophies', '🏆', 'achievements'],
    ['Settings', '⚙️', 'settings'],
    ['How to Play', '❓', 'help'],
    ['Parents', '🧑‍🔧', 'parent']
  ]) {
    const b = el('button', 'btn btn-small btn-ghost', `${icon} ${label}`);
    b.addEventListener('click', () => { audio.click(); router.go(target); });
    row2.appendChild(b);
  }
  s.appendChild(row2);

  const foot = el('div', 'menu-footer');
  const ver = el('button', 'version-btn', `v${CONFIG.version}`);
  ver.setAttribute('aria-label', 'Open diagnostics');
  ver.addEventListener('click', () => router.go('diagnostics'));
  foot.appendChild(ver);
  s.appendChild(foot);

  root.appendChild(s);
}

/* ==================== Quick race (track selection) ==================== */

function quickRaceScreen(root, params, router) {
  const body = screenShell(root, 'Pick a Track 🏁', router);
  const grid = el('div', 'card-grid card-grid-wide');
  body.appendChild(grid);

  const p = profileService.current;

  const addCard = (t, custom) => {
    const card = el('button', 'card');
    card.appendChild(el('span', 'card-emoji', t.emoji || '🧩'));
    card.appendChild(el('h3', '', t.name));
    const theme = THEMES[t.theme];
    card.appendChild(el('p', '', theme ? theme.label : ''));
    const rec = p.completedTracks[t.id];
    if (rec) {
      card.appendChild(el('p', 'badge badge-done', '⭐'.repeat(rec.stars) + `  ${formatTime(rec.bestTime)}`));
    } else {
      card.appendChild(el('p', '', custom ? 'Your creation!' : t.blurb || ''));
    }
    card.addEventListener('click', () => {
      audio.select();
      router.go('vehicle-select', { trackDef: t, from: custom ? 'custom' : 'quick' });
    });
    grid.appendChild(card);
  };

  for (const t of TRACKS) addCard(t, false);

  profileService.listCustomTracks().then((customs) => {
    if (!customs.length) return;
    const h = el('h3', '', '🔨 Your Tracks');
    h.style.color = 'var(--c-yellow)';
    body.appendChild(h);
    const grid2 = el('div', 'card-grid card-grid-wide');
    body.appendChild(grid2);
    for (const t of customs) {
      const card = el('button', 'card');
      card.appendChild(el('span', 'card-emoji', '🧩'));
      card.appendChild(el('h3', '', t.name));
      card.appendChild(el('p', '', THEMES[t.theme] ? THEMES[t.theme].label : ''));
      card.addEventListener('click', () => {
        audio.select();
        router.go('vehicle-select', { trackDef: t, from: 'custom' });
      });
      grid2.appendChild(card);
    }
  });
}

/* ==================== Vehicle select ==================== */

function vehicleSelectScreen(root, params, router) {
  const body = screenShell(root, 'Pick Your Truck 🚚', router, { badge: boltBadge() });
  const p = profileService.current;
  const grid = el('div', 'card-grid card-grid-wide');
  body.appendChild(grid);

  for (const v of VEHICLES) {
    const unlocked = p.unlockedVehicles.includes(v.id);
    const card = el('button', 'card' + (unlocked ? '' : ' card-locked'));
    const canvas = el('canvas');
    canvas.width = 140; canvas.height = 90;
    canvas.style.width = '140px'; canvas.style.height = '90px';
    card.appendChild(canvas);
    card.appendChild(el('h3', '', v.name));
    if (unlocked) {
      const statsBox = el('div');
      statRows(statsBox, v.stats);
      card.appendChild(statsBox);
      card.addEventListener('click', () => {
        audio.select();
        router.go('game', { trackDef: params.trackDef, vehicleId: v.id, from: params.from });
      });
    } else {
      card.appendChild(el('p', 'badge badge-lock', `🔒 ${v.cost} bolts`));
      card.appendChild(el('p', '', 'Unlock it in the Garage!'));
      card.addEventListener('click', () => { audio.back(); toast('Visit My Garage to unlock this truck!', '🔒'); });
    }
    grid.appendChild(card);
    requestAnimationFrame(() => drawVehiclePreview(canvas, v, profileService.getCustomization(v.id), 1.2));
  }
}

/* ==================== Adventure ==================== */

function adventureScreen(root, params, router) {
  const body = screenShell(root, 'Adventure Trail 🗺️', router);
  const p = profileService.current;
  const trail = el('div', 'adventure-trail');
  body.appendChild(trail);

  const list = adventureTracks();
  let previousDone = true;
  list.forEach((t, idx) => {
    const rec = p.completedTracks[t.id];
    const unlocked = idx === 0 || previousDone;
    const node = el('div', 'trail-node');
    if (idx > 0) node.appendChild(el('div', 'trail-link' + (unlocked ? ' trail-link-done' : '')));

    const stop = el('button', 'card trail-stop' + (unlocked ? '' : ' card-locked'));
    stop.appendChild(el('span', 'card-emoji', unlocked ? t.emoji : '🔒'));
    const info = el('div', 'trail-info');
    info.appendChild(el('h3', '', t.name));
    if (rec) info.appendChild(el('p', 'badge badge-done', '⭐'.repeat(rec.stars) + ' Done!'));
    else info.appendChild(el('p', '', unlocked ? t.blurb : 'Finish the track before this one!'));
    stop.appendChild(info);
    if (unlocked) {
      stop.addEventListener('click', () => {
        audio.select();
        router.go('vehicle-select', { trackDef: t, from: 'adventure' });
      });
    } else {
      stop.addEventListener('click', () => audio.back());
    }
    node.appendChild(stop);
    trail.appendChild(node);
    previousDone = !!rec;
  });
}

/* ==================== Garage ==================== */

function garageScreen(root, params, router) {
  const body = screenShell(root, 'My Garage 🚚', router, { badge: boltBadge() });
  const p = profileService.current;
  const grid = el('div', 'card-grid card-grid-wide');
  body.appendChild(grid);

  for (const v of VEHICLES) {
    const unlocked = p.unlockedVehicles.includes(v.id);
    const selected = p.selectedVehicle === v.id;
    const card = el('div', 'card' + (unlocked ? '' : ' card-locked') + (selected ? ' card-selected' : ''));
    const canvas = el('canvas');
    canvas.width = 150; canvas.height = 96;
    canvas.style.width = '150px'; canvas.style.height = '96px';
    card.appendChild(canvas);
    card.appendChild(el('h3', '', v.name));
    card.appendChild(el('p', '', v.blurb));
    const statsBox = el('div');
    statRows(statsBox, v.stats);
    card.appendChild(statsBox);

    const btnRow = el('div', 'dialog-buttons');
    if (unlocked) {
      if (!selected) {
        const pick = el('button', 'btn btn-small btn-green', '✅ Pick');
        pick.addEventListener('click', () => {
          audio.select();
          p.selectedVehicle = v.id;
          profileService.save();
          router.replace('garage');
        });
        btnRow.appendChild(pick);
      } else {
        btnRow.appendChild(el('span', 'badge badge-done', '✅ Picked'));
      }
      const cust = el('button', 'btn btn-small btn-blue', '🎨 Style');
      cust.addEventListener('click', () => { audio.click(); router.go('customize', { vehicleId: v.id }); });
      btnRow.appendChild(cust);
    } else {
      const afford = p.bolts >= v.cost;
      const unlock = el('button', 'btn btn-small ' + (afford ? 'btn-primary' : 'btn-ghost'), `🔓 ${v.cost} 🔩`);
      unlock.disabled = !afford;
      unlock.addEventListener('click', async () => {
        const yes = await confirmDialog('Unlock ' + v.name + '?', `Spend ${v.cost} bolts to add this truck to your garage?`, 'Unlock!', 'Not yet');
        if (yes && profileService.unlockVehicle(v.id)) {
          audio.unlock();
          toast(`${v.name} unlocked!`, '🔓');
          profileService.checkAchievements();
          router.replace('garage');
        }
      });
      btnRow.appendChild(unlock);
      if (!afford) btnRow.appendChild(el('span', 'badge badge-lock', 'Race to earn 🔩!'));
    }
    card.appendChild(btnRow);
    grid.appendChild(card);
    requestAnimationFrame(() => drawVehiclePreview(canvas, v, profileService.getCustomization(v.id), 1.25));
  }

  const stack = el('div', 'btn-stack');
  stack.style.marginTop = '14px';
  stack.appendChild(bigButton('Test Drive (Free Drive)', '🛠️', 'btn-blue', () =>
    router.go('game', { trackDef: FREE_DRIVE_TRACK, from: 'free' })));
  body.appendChild(stack);
}

/* ==================== Customize ==================== */

function customizeScreen(root, params, router) {
  const v = getVehicle(params.vehicleId);
  const body = screenShell(root, `Style: ${v.name} 🎨`, router, { badge: boltBadge() });
  const p = profileService.current;

  const wrap = el('div', 'preview-canvas-wrap');
  const canvas = el('canvas');
  canvas.width = 260; canvas.height = 170;
  canvas.style.width = '260px'; canvas.style.height = '170px';
  wrap.appendChild(canvas);
  body.appendChild(wrap);

  const redraw = () => drawVehiclePreview(canvas, v, profileService.getCustomization(v.id), 2.1);
  requestAnimationFrame(redraw);

  const categories = [
    ['colors', 'color', '🎨 Body Color'],
    ['wheels', 'wheels', '🛞 Wheel Style'],
    ['tires', 'tires', '🏔️ Tire Size'],
    ['decals', 'decal', '⭐ Decal'],
    ['accessories', 'accessory', '🚩 Roof & Extras'],
    ['glows', 'glow', '✨ Glow']
  ];

  for (const [cat, field, label] of categories) {
    const panel = el('div', 'panel');
    panel.appendChild(el('h3', '', label));
    const row = el('div', 'swatch-row');
    for (const opt of CUSTOMIZATION[cat]) {
      const owned = profileService.ownsItem(cat, opt.id);
      const current = profileService.getCustomization(v.id)[field] === opt.id;
      const sw = el('button', 'swatch' + (current ? ' swatch-selected' : '') + (owned ? '' : ' swatch-locked'));
      sw.setAttribute('aria-label', `${opt.label}${owned ? '' : `, costs ${opt.cost} bolts`}`);
      if (cat === 'colors' && opt.value) {
        sw.style.background = opt.value;
      } else {
        sw.textContent = opt.icon || '⬜';
      }
      if (!owned) sw.appendChild(el('span', 'swatch-cost', `${opt.cost}🔩`));
      sw.addEventListener('click', async () => {
        if (!owned) {
          if (p.bolts < opt.cost) { audio.back(); toast('Race to earn more bolts!', '🔩'); return; }
          const yes = await confirmDialog(`Get ${opt.label}?`, `Spend ${opt.cost} bolts on this style?`, 'Yes!', 'Not yet');
          if (!yes || !profileService.buyItem(cat, opt.id)) return;
          audio.unlock();
        } else {
          audio.select();
        }
        profileService.setCustomization(v.id, { [field]: opt.id });
        router.replace('customize', { vehicleId: v.id });
      });
      row.appendChild(sw);
      if (cat === 'tires' && opt.effect) {
        // Show the tradeoff clearly next to each tire option.
        const eff = el('small', '', opt.effect);
        eff.style.alignSelf = 'center';
        eff.style.color = 'var(--c-text-dim)';
        row.appendChild(eff);
      }
    }
    panel.appendChild(row);
    body.appendChild(panel);
  }
}

/* ==================== Track builder (list) ==================== */

function builderListScreen(root, params, router) {
  const body = screenShell(root, 'Track Builder 🔨', router);
  const stack = el('div', 'btn-stack');
  stack.appendChild(bigButton('Build a New Track', '➕', 'btn-primary', () =>
    router.go('builder-edit', {})));
  body.appendChild(stack);

  const listWrap = el('div');
  listWrap.style.marginTop = '16px';
  body.appendChild(listWrap);

  profileService.listCustomTracks().then((tracks) => {
    if (!tracks.length) {
      listWrap.appendChild(el('p', 'hint-text', 'No tracks yet — tap Build a New Track to make one!'));
      return;
    }
    const grid = el('div', 'card-grid card-grid-wide');
    listWrap.appendChild(grid);
    for (const t of tracks) {
      const card = el('div', 'card');
      card.appendChild(el('span', 'card-emoji', '🧩'));
      card.appendChild(el('h3', '', t.name));
      card.appendChild(el('p', '', THEMES[t.theme] ? THEMES[t.theme].label : ''));
      const row = el('div', 'dialog-buttons');

      const play = el('button', 'btn btn-small btn-green', '▶️ Play');
      play.addEventListener('click', () => { audio.select(); router.go('vehicle-select', { trackDef: t, from: 'custom' }); });
      row.appendChild(play);

      const edit = el('button', 'btn btn-small btn-blue', '✏️ Edit');
      edit.addEventListener('click', () => { audio.click(); router.go('builder-edit', { trackId: t.id }); });
      row.appendChild(edit);

      const dup = el('button', 'btn btn-small', '📄 Copy');
      dup.addEventListener('click', async () => {
        audio.click();
        const copy = { ...t, id: undefined, name: (t.name + ' copy').slice(0, 24) };
        const saved = await profileService.saveCustomTrack(copy);
        if (saved) { toast('Track copied!', '📄'); router.replace('builder'); }
        else toast('Track box is full (20 max).', '📦');
      });
      row.appendChild(dup);

      const del = el('button', 'btn btn-small btn-danger', '🗑️');
      del.setAttribute('aria-label', `Delete ${t.name}`);
      del.addEventListener('click', async () => {
        const yes = await confirmDialog('Delete this track?', `"${t.name}" will be gone forever.`, 'Delete', 'Keep it');
        if (yes) {
          await profileService.deleteCustomTrack(t.id);
          toast('Track deleted', '🗑️');
          router.replace('builder');
        }
      });
      row.appendChild(del);

      card.appendChild(row);
      grid.appendChild(card);
    }
  });
}

/* ==================== Track builder (editor) ==================== */

const BUILDER_PIECES = [
  { ch: 'R', label: 'Road', icon: '⬜' },
  { ch: 'D', label: 'Dirt', icon: '🟫' },
  { ch: 'M', label: 'Mud', icon: '💩' },
  { ch: 'S', label: 'Sand', icon: '🏖️' },
  { ch: 'I', label: 'Ice', icon: '🧊' },
  { ch: 'B', label: 'Boost', icon: '💨' },
  { ch: 'J', label: 'Ramp', icon: '⛰️' },
  { ch: 'Z', label: 'Sticky', icon: '🟪' },
  { ch: 'X', label: 'Box', icon: '📦' },
  { ch: 'b', label: 'Bolt', icon: '🔩' },
  { ch: 'C', label: 'Cone', icon: '🚧' },
  { ch: 'T', label: 'Tires', icon: '🛞' },
  { ch: 'K', label: 'Check', icon: '🚏' },
  { ch: 'F', label: 'Finish', icon: '🏁' },
  { ch: '1', label: 'Start', icon: '🚦' },
  { ch: '#', label: 'Wall', icon: '🧱' },
  { ch: '.', label: 'Erase', icon: '🧽' }
];

const BUILDER_TILE_COLORS = {
  '.': '#5aa63c', '#': '#3e6b2a', 'R': '#8a7a66', 'D': '#96784e',
  'M': '#4e3a20', 'S': '#e0c078', 'I': '#bfe6f5', 'B': '#2bb56a',
  'J': '#c9a227', 'Z': '#9b59b6', 'F': '#f5f5f5', 'K': '#ffd23f',
  '1': '#3ddc84', 'b': '#8a7a66', 'X': '#8a7a66', 'C': '#8a7a66', 'T': '#8a7a66'
};
const BUILDER_TILE_ICONS = {
  'B': '💨', 'J': '⛰️', 'Z': '~', 'F': '🏁', 'K': '🚏', '1': '🚦',
  'b': '🔩', 'X': '📦', 'C': '🚧', 'T': '🛞', 'M': '💧', 'I': '❄'
};

function emptyBuilderGrid() {
  const cols = CONFIG.builderCols, rows = CONFIG.builderRows;
  const grid = [];
  for (let y = 0; y < rows; y++) {
    let row = '';
    for (let x = 0; x < cols; x++) {
      row += (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) ? '#' : '.';
    }
    grid.push(row);
  }
  return grid;
}

function builderEditScreen(root, params, router) {
  const body = screenShell(root, 'Build Your Track 🔨', router);

  let track = null;         // saved record (if editing)
  let grid = emptyBuilderGrid().map((r) => r.split(''));
  let name = 'My Track';
  let theme = 'backyard';
  let currentPiece = 'R';
  let dirty = false;

  const CELL = 34;
  const cols = CONFIG.builderCols, rows = CONFIG.builderRows;

  const hint = el('p', 'hint-text', 'Tap a piece, then paint the map! You need a 🚦 Start and a 🏁 Finish.');
  body.appendChild(hint);

  const layout = el('div', 'builder-layout');
  body.appendChild(layout);

  // Palette
  const palette = el('div', 'builder-palette');
  palette.setAttribute('role', 'toolbar');
  palette.setAttribute('aria-label', 'Track pieces');
  const paletteBtns = new Map();
  for (const piece of BUILDER_PIECES) {
    const b = el('button', 'swatch' + (piece.ch === currentPiece ? ' swatch-selected' : ''));
    b.setAttribute('aria-label', piece.label);
    b.appendChild(el('span', '', piece.icon));
    b.appendChild(el('small', '', piece.label));
    b.addEventListener('click', () => {
      audio.click();
      currentPiece = piece.ch;
      for (const [ch, btn] of paletteBtns) btn.classList.toggle('swatch-selected', ch === currentPiece);
    });
    paletteBtns.set(piece.ch, b);
    palette.appendChild(b);
  }
  layout.appendChild(palette);

  // Canvas
  const wrap = el('div', 'builder-canvas-wrap');
  const canvas = el('canvas');
  canvas.width = cols * CELL;
  canvas.height = rows * CELL;
  canvas.setAttribute('aria-label', 'Track drawing area');
  wrap.appendChild(canvas);
  layout.appendChild(wrap);
  const ctx = canvas.getContext('2d');

  function draw() {
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const ch = grid[y][x];
        ctx.fillStyle = BUILDER_TILE_COLORS[ch] || '#5aa63c';
        ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.strokeRect(x * CELL + 0.5, y * CELL + 0.5, CELL - 1, CELL - 1);
        const icon = BUILDER_TILE_ICONS[ch];
        if (icon) {
          ctx.font = '18px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(icon, x * CELL + CELL / 2, y * CELL + CELL / 2 + 1);
        }
      }
    }
  }

  function paint(e) {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * sx / CELL);
    const y = Math.floor((e.clientY - rect.top) * sy / CELL);
    if (x < 1 || y < 1 || x >= cols - 1 || y >= rows - 1) return; // border locked
    if (currentPiece === '1') {
      // Only one start: clear old one.
      for (let yy = 0; yy < rows; yy++) for (let xx = 0; xx < cols; xx++) {
        if (grid[yy][xx] === '1') grid[yy][xx] = 'R';
      }
    }
    if (grid[y][x] !== currentPiece) {
      grid[y][x] = currentPiece;
      dirty = true;
      draw();
    }
  }

  let painting = false;
  canvas.addEventListener('pointerdown', (e) => { painting = true; canvas.setPointerCapture(e.pointerId); paint(e); });
  canvas.addEventListener('pointermove', (e) => { if (painting) paint(e); });
  canvas.addEventListener('pointerup', () => { painting = false; });
  canvas.addEventListener('pointercancel', () => { painting = false; });

  // Toolbar
  const bar = el('div', 'builder-toolbar');
  body.appendChild(bar);

  const nameBtn = el('button', 'btn btn-small', `✏️ ${name}`);
  nameBtn.addEventListener('click', async () => {
    const v = await promptText({ title: 'Name Your Track', value: name, maxLen: 24 });
    if (v) { name = v; dirty = true; nameBtn.textContent = `✏️ ${name}`; }
  });
  bar.appendChild(nameBtn);

  const themeBtn = el('button', 'btn btn-small', `🌍 ${THEMES[theme].label}`);
  themeBtn.addEventListener('click', async () => {
    const keys = Object.keys(THEMES);
    const pick = await showDialog({
      title: 'Pick a Theme',
      buttons: keys.map((k) => ({ label: THEMES[k].label, cls: 'btn-ghost', value: k }))
    });
    if (pick) { theme = pick; dirty = true; themeBtn.textContent = `🌍 ${THEMES[theme].label}`; }
  });
  bar.appendChild(themeBtn);

  function validate() {
    const flat = grid.map((r) => r.join('')).join('');
    if ((flat.match(/1/g) || []).length !== 1) return 'Add a 🚦 Start square first!';
    if (!flat.includes('F')) return 'Add a 🏁 Finish square so racers can win!';
    return null;
  }

  function toTrackDef() {
    return {
      id: track ? track.id : undefined,
      name, theme,
      parSeconds: 60,
      custom: true,
      grid: grid.map((r) => r.join(''))
    };
  }

  async function saveTrack(silent) {
    const problem = validate();
    if (problem) { await alertDialog('Almost there!', problem); return null; }
    const saved = await profileService.saveCustomTrack(toTrackDef());
    if (!saved) { await alertDialog('Track box is full', 'You can keep up to 20 tracks. Delete one first!'); return null; }
    track = saved;
    dirty = false;
    if (!silent) toast('Track saved!', '💾');
    return saved;
  }

  const saveBtn = el('button', 'btn btn-small btn-green', '💾 Save');
  saveBtn.addEventListener('click', () => { audio.select(); saveTrack(false); });
  bar.appendChild(saveBtn);

  const testBtn = el('button', 'btn btn-small btn-primary', '▶️ Test Drive');
  testBtn.addEventListener('click', async () => {
    audio.select();
    const saved = await saveTrack(true);
    if (saved) router.go('game', { trackDef: saved, from: 'builder', vehicleId: profileService.current.selectedVehicle });
  });
  bar.appendChild(testBtn);

  const clearBtn = el('button', 'btn btn-small btn-ghost', '🧹 Clear');
  clearBtn.addEventListener('click', async () => {
    if (await confirmDialog('Clear the whole track?', 'Everything will be erased.', 'Clear it', 'Keep it')) {
      grid = emptyBuilderGrid().map((r) => r.split(''));
      dirty = true;
      draw();
    }
  });
  bar.appendChild(clearBtn);

  // Load existing track if editing.
  if (params.trackId) {
    profileService.getCustomTrack(params.trackId).then((t) => {
      if (!t) return;
      track = t;
      grid = t.grid.map((r) => r.split(''));
      name = t.name;
      theme = t.theme;
      nameBtn.textContent = `✏️ ${name}`;
      themeBtn.textContent = `🌍 ${THEMES[theme].label}`;
      draw();
    });
  }
  draw();
}

/* ==================== Game ==================== */

function gameScreen(root, params, router) {
  const p = profileService.current;
  const trackDef = params.trackDef || FREE_DRIVE_TRACK;
  const vehicleId = params.vehicleId || p.selectedVehicle;
  const vehicleDef = getVehicle(vehicleId);
  const custom = profileService.getCustomization(vehicleId);
  const settings = p.settings;

  const appEl = document.getElementById('app');
  const layer = document.getElementById('game-layer');
  const canvas = document.getElementById('game-canvas');
  const hudEl = document.getElementById('hud');
  appEl.hidden = true;
  layer.hidden = false;

  const hud = new Hud(hudEl);
  const engine = new GameEngine(canvas);
  const startedAt = Date.now();
  let finished = false;

  // First time driving this truck? Friendly bonus.
  const firstDrive = !p.stats.vehiclesTried.includes(vehicleId);
  if (firstDrive) {
    p.stats.vehiclesTried.push(vehicleId);
    profileService.save();
  }

  const exitToMenu = () => {
    // Free-drive / early exit still banks collected bolts. Positive vibes only.
    const collected = engine.score ? engine.score.bolts : 0;
    engine.stop();
    if (collected > 0) {
      profileService.addBolts(collected);
      toast(`You collected ${collected} bolts!`, '🔩');
    }
    bankPlayTime();
    profileService.checkAchievements().forEach((a) => toast(`Achievement: ${a.name}!`, a.icon));
    if (params.from === 'builder') router.back();
    else router.home('main-menu');
  };

  const bankPlayTime = () => {
    p.stats.playMs += Date.now() - startedAt;
    profileService.save();
  };

  const startEngine = () => {
    engine.start({
      trackDef, vehicleDef, custom, settings,
      callbacks: {
        onTime: (t) => hud.setTime(t),
        onBolts: (n) => hud.setBolts(n),
        onProgress: (hit, total) => hud.setProgress(hit, total),
        onCountdown: (text) => hud.showCountdown(text),
        onFeedback: (text) => hud.showFeedback(text),
        onBoostMeter: (v) => hud.setBoostMeter(v),
        onPause: () => hud.showPauseMenu({
          freeDrive: !!trackDef.freeDrive,
          onResume: () => engine.resume(),
          onReset: () => engine.respawnVehicle(),
          onRestart: () => { hud.build(hudOpts); startEngine(); },
          onExit: exitToMenu
        }),
        onFinish: (results) => {
          finished = true;
          const rewards = applyRaceResults(results, trackDef, vehicleId, firstDrive);
          bankPlayTime();
          router.replace('results', { results, rewards, trackDef, vehicleId, from: params.from });
        }
      }
    });
  };

  const hudOpts = {
    settings,
    freeDrive: !!trackDef.freeDrive,
    input: engine.input,
    onPause: () => engine.pause()
  };
  hud.build(hudOpts);

  // Show the controls card before the very first race.
  storage.get('meta', 'controlsSeen').then((seen) => {
    if (!seen && !trackDef.freeDrive) {
      storage.put('meta', { key: 'controlsSeen', value: true });
      showControlsDialog().then(startEngine);
    } else {
      startEngine();
    }
  });

  if (settings.tts) {
    audio.speak(trackDef.freeDrive
      ? 'Free drive! Practice jumps and tricks. No timer!'
      : `Get ready to race ${trackDef.name}! Drive through every checkpoint, then cross the finish line!`);
  }

  return () => {
    engine.stop();
    hud.destroy();
    if (!finished) audio.stopSpeech();
    layer.hidden = true;
    appEl.hidden = false;
  };
}

function showControlsDialog() {
  return showDialog({
    title: 'How to Drive 🚦',
    build: (box) => {
      const rows = [
        ['◀ ▶', 'Steer left and right'],
        ['🟢 / ⬆️', 'Go! (or automatic)'],
        ['🛑 / ⬇️', 'Brake and reverse'],
        ['🚀 / Space', 'Boost when the meter is full'],
        ['🚏', 'Drive through every checkpoint'],
        ['🏁', 'Cross the finish to win!']
      ];
      for (const [icon, text] of rows) {
        const r = el('div', 'setting-row');
        r.appendChild(el('span', 'setting-label', icon));
        r.appendChild(el('span', '', text));
        box.appendChild(r);
      }
      if (audio.ttsAvailable) {
        const read = el('button', 'btn btn-small btn-ghost', '🔊 Read aloud');
        read.style.margin = '10px auto 0';
        read.style.display = 'block';
        read.addEventListener('click', () => audio.speak(
          'Steer with the arrows. Green means go, red means stop. ' +
          'Drive through every checkpoint flag, then cross the black and white finish line to win!', true));
        box.appendChild(read);
      }
    },
    buttons: [{ label: "Let's Race!", cls: 'btn-primary', value: true, icon: '🏁' }]
  });
}

/* Apply race rewards to the profile; returns a breakdown for the results screen. */
function applyRaceResults(results, trackDef, vehicleId, firstDrive) {
  const p = profileService.current;
  const breakdown = [];
  let total = 0;
  const add = (label, icon, amount) => {
    if (amount > 0) { breakdown.push({ label, icon, amount }); total += amount; }
  };

  add('Finished the race!', '🏁', REWARDS.finishBase);
  add(`Bolts collected ×${results.bolts}`, '🔩', results.bolts * REWARDS.perBolt);
  add(`Boxes smashed ×${results.boxes}`, '📦', results.boxes * REWARDS.perBox);
  add(`Jumps landed ×${results.jumps}`, '🪂', results.jumps * REWARDS.perJumpLanded);
  add(`Hidden stars ×${results.hidden}`, '🌟', results.hidden * REWARDS.hiddenStar);
  add(`Stars ×${results.stars}`, '⭐', results.stars * REWARDS.perStar);
  if (firstDrive) add('New truck test drive!', '🚚', REWARDS.newVehicleTry);

  // Stats + records.
  p.stats.races += 1;
  p.stats.boxes += results.boxes;
  p.stats.jumps += results.jumps;
  p.stats.bigJumps += results.bigJumps;
  p.stats.hiddenStars += results.hidden;

  const rec = p.completedTracks[results.trackId];
  if (rec) {
    rec.bestTime = Math.min(rec.bestTime, results.timeMs);
    rec.stars = Math.max(rec.stars, results.stars);
    rec.times += 1;
  } else {
    p.completedTracks[results.trackId] = { bestTime: results.timeMs, stars: results.stars, times: 1 };
  }

  profileService.addBolts(total);
  const earned = profileService.checkAchievements();
  return { breakdown, total, achievements: earned };
}

/* ==================== Results ==================== */

function resultsScreen(root, params, router) {
  const { results, rewards, trackDef } = params;
  const body = screenShell(root, 'You Did It! 🎉', router, { back: false });

  body.appendChild(el('div', 'results-stars', '⭐'.repeat(results.stars) + '☆'.repeat(3 - results.stars)));
  body.appendChild(el('p', 'center', trackDef.name + ' — ' + formatTime(results.timeMs)));

  const grid = el('div', 'results-grid');
  const cell = (num, label) => {
    const c = el('div', 'result-cell');
    c.appendChild(el('span', 'result-num', String(num)));
    c.appendChild(el('span', 'result-label', label));
    grid.appendChild(c);
  };
  cell(results.bolts, '🔩 Bolts');
  cell(results.boxes, '📦 Boxes');
  cell(results.jumps, '🪂 Jumps');
  cell(results.hidden, '🌟 Stars found');
  body.appendChild(grid);

  const panel = el('div', 'panel');
  panel.appendChild(el('h3', '', `You earned ${rewards.total} bolts! 🔩`));
  for (const r of rewards.breakdown) {
    const row = el('div', 'setting-row');
    row.appendChild(el('span', 'setting-label', `${r.icon} ${r.label}`));
    row.appendChild(el('span', 'badge badge-bolts', `+${r.amount}`));
    panel.appendChild(row);
  }
  body.appendChild(panel);

  for (const a of rewards.achievements || []) {
    toast(`Achievement: ${a.name}!`, a.icon);
  }

  const stack = el('div', 'btn-stack');
  stack.appendChild(bigButton('Race Again', '🔁', 'btn-primary', () =>
    router.replace('game', { trackDef, vehicleId: params.vehicleId, from: params.from })));

  if (params.from === 'adventure') {
    const list = adventureTracks();
    const idx = list.findIndex((t) => t.id === trackDef.id);
    const next = idx >= 0 ? list[idx + 1] : null;
    if (next) {
      stack.appendChild(bigButton(`Next: ${next.name}`, next.emoji, 'btn-green', () =>
        router.replace('vehicle-select', { trackDef: next, from: 'adventure' })));
    }
  }
  stack.appendChild(bigButton('Back to Menu', '🏠', '', () => router.home('main-menu')));
  body.appendChild(stack);

  if (profileService.settings.tts) {
    audio.speak(`Amazing! You finished with ${results.stars} ${results.stars === 1 ? 'star' : 'stars'} and earned ${rewards.total} bolts!`);
  }
}

/* ==================== Achievements ==================== */

function achievementsScreen(root, params, router) {
  const body = screenShell(root, 'Trophies 🏆', router);
  const p = profileService.current;
  body.appendChild(el('p', 'hint-text', `${p.achievements.length} of ${ACHIEVEMENTS.length} earned`));
  const grid = el('div', 'card-grid');
  for (const a of ACHIEVEMENTS) {
    const got = p.achievements.includes(a.id);
    const card = el('div', 'card' + (got ? '' : ' card-locked'));
    card.appendChild(el('span', 'card-emoji', got ? a.icon : '❔'));
    card.appendChild(el('h3', '', a.name));
    card.appendChild(el('p', '', a.desc));
    if (got) card.appendChild(el('p', 'badge badge-done', '✅ Earned!'));
    grid.appendChild(card);
  }
  body.appendChild(grid);

  const stats = el('div', 'panel');
  stats.appendChild(el('h3', '', '📊 Your Stats'));
  const list = el('ul', 'profile-stats-list');
  const s = p.stats;
  for (const [label, val] of [
    ['Races finished', s.races],
    ['Bolts collected (all time)', s.boltsCollected],
    ['Boxes smashed', s.boxes],
    ['Jumps landed', s.jumps],
    ['Huge jumps', s.bigJumps],
    ['Hidden stars found', s.hiddenStars],
    ['Tracks built', s.tracksBuilt],
    ['Trucks driven', `${s.vehiclesTried.length} / ${VEHICLES.length}`],
    ['Play time', Math.round(s.playMs / 60000) + ' min']
  ]) {
    const li = el('li');
    li.appendChild(el('span', '', label));
    li.appendChild(el('span', '', String(val)));
    list.appendChild(li);
  }
  stats.appendChild(list);
  body.appendChild(stats);
}

/* ==================== Settings ==================== */

function settingsScreen(root, params, router) {
  const body = screenShell(root, 'Settings ⚙️', router);
  const s = profileService.settings;

  const save = () => {
    profileService.save();
    applySettings(s);
  };

  const toggleRow = (parent, label, hint, get, set) => {
    const row = el('div', 'setting-row');
    const lab = el('span', 'setting-label', label);
    if (hint) lab.appendChild(el('span', 'setting-hint', hint));
    row.appendChild(lab);
    const t = el('button', 'toggle');
    t.setAttribute('role', 'switch');
    t.setAttribute('aria-checked', String(!!get()));
    t.setAttribute('aria-label', label);
    t.addEventListener('click', () => {
      audio.click();
      set(!get());
      t.setAttribute('aria-checked', String(!!get()));
      save();
    });
    row.appendChild(t);
    parent.appendChild(row);
  };

  const sliderRow = (parent, label, get, set) => {
    const row = el('div', 'setting-row');
    row.appendChild(el('span', 'setting-label', label));
    const sl = el('input', 'slider');
    sl.type = 'range';
    sl.min = '0'; sl.max = '100';
    sl.value = String(Math.round(get() * 100));
    sl.setAttribute('aria-label', label);
    sl.addEventListener('input', () => { set(Number(sl.value) / 100); save(); });
    sl.addEventListener('change', () => audio.click());
    row.appendChild(sl);
    parent.appendChild(row);
  };

  // Difficulty
  const diffPanel = el('div', 'panel');
  diffPanel.appendChild(el('h3', '', '🎮 How Hard?'));
  const seg = el('div', 'seg-group');
  seg.setAttribute('role', 'group');
  seg.setAttribute('aria-label', 'Difficulty');
  for (const d of Object.values(DIFFICULTY)) {
    const b = el('button', 'seg', `${d.icon} ${d.label}`);
    b.setAttribute('aria-pressed', String(s.difficulty === d.id));
    b.addEventListener('click', () => {
      audio.select();
      s.difficulty = d.id;
      s.autoAccel = d.autoAccelDefault;
      save();
      router.replace('settings');
    });
    seg.appendChild(b);
  }
  diffPanel.appendChild(seg);
  body.appendChild(diffPanel);

  // Sound
  const soundPanel = el('div', 'panel');
  soundPanel.appendChild(el('h3', '', '🔊 Sound'));
  toggleRow(soundPanel, '🔇 Mute everything', '', () => s.muted, (v) => { s.muted = v; });
  sliderRow(soundPanel, '🔊 Sound effects', () => s.soundVolume, (v) => { s.soundVolume = v; });
  sliderRow(soundPanel, '🎵 Music', () => s.musicVolume, (v) => { s.musicVolume = v; });
  body.appendChild(soundPanel);

  // Driving helpers
  const drivePanel = el('div', 'panel');
  drivePanel.appendChild(el('h3', '', '🚗 Driving Helpers'));
  toggleRow(drivePanel, '🟢 Auto-drive forward', 'The truck always drives — just steer!', () => s.autoAccel, (v) => { s.autoAccel = v; });
  toggleRow(drivePanel, '🫲 Left-handed controls', 'Swap the control sides', () => s.leftHanded, (v) => { s.leftHanded = v; });
  body.appendChild(drivePanel);

  // Accessibility
  const a11yPanel = el('div', 'panel');
  a11yPanel.appendChild(el('h3', '', '♿ Comfort & Access'));
  const rmRow = el('div', 'setting-row');
  rmRow.appendChild(el('span', 'setting-label', '🌀 Reduced motion'));
  const rmSeg = el('div', 'seg-group');
  for (const [val, label] of [['auto', 'Auto'], ['on', 'On'], ['off', 'Off']]) {
    const b = el('button', 'seg', label);
    b.setAttribute('aria-pressed', String(s.reducedMotion === val));
    b.addEventListener('click', () => {
      audio.click(); s.reducedMotion = val; save(); router.replace('settings');
    });
    rmSeg.appendChild(b);
  }
  rmRow.appendChild(rmSeg);
  a11yPanel.appendChild(rmRow);
  toggleRow(a11yPanel, '🌓 High contrast', '', () => s.highContrast, (v) => { s.highContrast = v; });
  toggleRow(a11yPanel, '🔍 Bigger buttons', '', () => s.largeUI, (v) => { s.largeUI = v; });
  toggleRow(a11yPanel, '📳 Screen shake', '', () => s.screenShake, (v) => { s.screenShake = v; });
  toggleRow(a11yPanel, '🗣️ Read instructions aloud', audio.ttsAvailable ? '' : 'Not supported on this browser',
    () => s.tts, (v) => { s.tts = v; if (v) audio.speak('Reading aloud is on!', true); });
  body.appendChild(a11yPanel);
}

/* ==================== Parent screen ==================== */

function parentScreen(root, params, router) {
  const body = screenShell(root, 'For Parents 🧑‍🔧', router);

  const info = el('div', 'panel');
  info.appendChild(el('h3', '', 'About this game'));
  for (const line of [
    '✅ No advertisements.',
    '✅ No purchases of any kind — bolts are earned only by playing.',
    '✅ No chat or online communication.',
    '✅ No accounts, no login, no personal information collected.',
    '✅ No analytics or tracking of any kind.',
    '✅ All progress stays on this device only.',
    '🌐 Internet is only needed for the very first load (and updates).',
    '✈️ After that first load, the game works fully offline.',
    '💾 Save data can be exported to a file or deleted below.'
  ]) {
    info.appendChild(el('p', '', line));
  }
  body.appendChild(info);

  const stack = el('div', 'btn-stack');
  stack.appendChild(bigButton('Saved Data & Backups', '💾', 'btn-blue', () => router.go('data')));
  stack.appendChild(bigButton('Install as an App', '📲', '', () => router.go('install')));
  stack.appendChild(bigButton('Offline Status', '✈️', '', () => router.go('offline')));
  stack.appendChild(bigButton('Diagnostics', '🔬', 'btn-ghost', () => router.go('diagnostics')));
  body.appendChild(stack);

  body.appendChild(el('p', 'hint-text', `Monster Track Garage v${CONFIG.version} · Open source, MIT licensed.`));
}

/* ==================== Saved data management ==================== */

function dataScreen(root, params, router) {
  const body = screenShell(root, 'Saved Data 💾', router);
  const p = profileService.current;

  const stor = el('div', 'panel');
  stor.appendChild(el('h3', '', 'Storage'));
  stor.appendChild(el('p', '', storage.available
    ? '✅ Saving works: progress is stored in this browser (IndexedDB).'
    : '⚠️ This browser is blocking storage. The game works, but progress will be lost when you close it. Try turning off private/incognito mode.'));
  body.appendChild(stor);

  const exp = el('div', 'panel');
  exp.appendChild(el('h3', '', 'Backup (export)'));
  exp.appendChild(el('p', '', `Download ${p ? p.name + "'s" : 'the'} progress and custom tracks as a file you can keep or move to another device.`));
  const expBtn = el('button', 'btn btn-blue', '⬇️ Download save file');
  expBtn.addEventListener('click', async () => {
    audio.select();
    const data = await profileService.exportProfile();
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monster-track-save-${data.profile.name}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast('Save file downloaded!', '⬇️');
  });
  exp.appendChild(expBtn);
  body.appendChild(exp);

  const imp = el('div', 'panel');
  imp.appendChild(el('h3', '', 'Restore (import)'));
  imp.appendChild(el('p', '', 'Load a previously exported save file. The file is checked before use.'));
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'application/json,.json';
  fileInput.className = 'sr-only';
  fileInput.setAttribute('aria-hidden', 'true');
  fileInput.tabIndex = -1;
  const impBtn = el('button', 'btn', '⬆️ Choose save file');
  impBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { await alertDialog('Too big', 'That file is too large to be a save file.'); return; }
    const text = await file.text();
    const result = await profileService.importProfile(text);
    if (result.ok) {
      applySettings(profileService.settings);
      await alertDialog('Import complete! ✅', `Welcome back, ${result.name}! (${result.tracks} custom tracks restored)`);
      router.home('main-menu');
    } else {
      await alertDialog('Import failed', result.reason);
    }
    fileInput.value = '';
  });
  imp.appendChild(impBtn);
  imp.appendChild(fileInput);
  body.appendChild(imp);

  const danger = el('div', 'panel');
  danger.appendChild(el('h3', '', 'Danger zone'));
  danger.appendChild(el('p', '', 'These need a grown-up code and cannot be undone.'));
  const row = el('div', 'dialog-buttons');
  if (p) {
    const resetBtn = el('button', 'btn btn-danger btn-small', `♻️ Reset ${p.name}'s progress`);
    resetBtn.addEventListener('click', async () => {
      if (!(await parentGate(`reset ${p.name}'s progress`))) return;
      await profileService.resetProfile(p.id);
      toast('Progress reset', '♻️');
      router.home('main-menu');
    });
    row.appendChild(resetBtn);
  }
  const nukeBtn = el('button', 'btn btn-danger btn-small', '🗑️ Delete ALL data');
  nukeBtn.addEventListener('click', async () => {
    if (!(await parentGate('delete every profile and track on this device'))) return;
    await profileService.resetAll();
    toast('All data deleted', '🗑️');
    router.home('profile-select');
  });
  row.appendChild(nukeBtn);
  danger.appendChild(row);
  body.appendChild(danger);
}

/* ==================== Install guidance ==================== */

function installScreen(root, params, router) {
  const body = screenShell(root, 'Install as an App 📲', router);

  if (pwa.isInstalled) {
    const done = el('div', 'panel');
    done.appendChild(el('h3', '', '✅ Already installed!'));
    done.appendChild(el('p', '', 'You are playing the installed app. Great job!'));
    body.appendChild(done);
  }

  if (pwa.installPromptEvent) {
    const stack = el('div', 'btn-stack');
    stack.appendChild(bigButton('Install Now', '📲', 'btn-primary', async () => {
      const outcome = await pwa.promptInstall();
      if (outcome === 'accepted') toast('Installing… check your home screen!', '📲');
      router.replace('install');
    }));
    body.appendChild(stack);
  }

  const steps = [
    ['🤖 Android (Chrome/Edge)', 'Tap the ⋮ menu → "Add to Home screen" or "Install app".'],
    ['🍎 iPhone & iPad (Safari)', 'Tap the Share button (square with arrow) → "Add to Home Screen".'],
    ['💻 Computer (Chrome/Edge)', 'Click the install icon (⊕ or screen-with-arrow) at the right end of the address bar.'],
    ['📚 Chromebook', 'Same as computer: install icon in the address bar.']
  ];
  for (const [title, text] of steps) {
    const panel = el('div', 'panel');
    panel.appendChild(el('h3', '', title));
    panel.appendChild(el('p', '', text));
    body.appendChild(panel);
  }
  const note = el('div', 'panel');
  note.appendChild(el('h3', '', '✈️ Then play anywhere'));
  note.appendChild(el('p', '', 'After installing (and one full load while online), the game opens and plays with no internet at all. Check Offline Status to confirm it is ready.'));
  body.appendChild(note);
}

/* ==================== Offline status ==================== */

function offlineScreen(root, params, router) {
  const body = screenShell(root, 'Offline Status ✈️', router);
  const panel = el('div', 'panel');
  panel.appendChild(el('h3', '', 'Checking…'));
  body.appendChild(panel);

  const render = async () => {
    const st = await pwa.getSwStatus();
    panel.innerHTML = '';
    if (!pwa.swSupported) {
      panel.appendChild(el('h3', '', '⚠️ Not supported'));
      panel.appendChild(el('p', '', 'This browser does not support offline apps. The game still works while online.'));
      return;
    }
    if (!st.controlled) {
      panel.appendChild(el('h3', '', '⏳ Getting ready…'));
      panel.appendChild(el('p', '', 'The offline helper is still setting up. Keep the game open while online for a few seconds, then check again. (If you opened this page as a plain file, offline mode needs the real website address.)'));
    } else if (st.offlineReady) {
      panel.appendChild(el('h3', '', '✅ Ready for offline play!'));
      panel.appendChild(el('p', '', `All ${st.cachedCount} game files are saved on this device. You can play with no internet — even in airplane mode.`));
    } else {
      panel.appendChild(el('h3', '', '⏳ Almost ready'));
      panel.appendChild(el('p', '', `${st.cachedCount} of ${st.precacheTotal} files saved so far. Stay online a little longer to finish.`));
    }
    panel.appendChild(el('p', '', (pwa.online ? '🌐 You are online right now.' : '✈️ You are offline right now.')));
    panel.appendChild(el('p', '', `Cache: ${st.cacheName}`));
  };
  render();

  const refresh = el('button', 'btn btn-blue', '🔄 Check again');
  refresh.addEventListener('click', () => { audio.click(); render(); });
  body.appendChild(refresh);
}

/* ==================== Diagnostics ==================== */

function diagnosticsScreen(root, params, router) {
  const body = screenShell(root, 'Diagnostics 🔬', router);
  const panel = el('div', 'panel');
  body.appendChild(panel);
  const table = el('table', 'diag-table');
  panel.appendChild(table);

  const render = async () => {
    table.innerHTML = '';
    const st = await pwa.getSwStatus();
    const tracks = await profileService.listCustomTracks();
    const p = profileService.current;
    const rows = [
      ['App version', CONFIG.version],
      ['Service worker', pwa.swSupported ? (st.controlled ? 'active' : (pwa.registerError ? 'error: ' + pwa.registerError : 'registered, not controlling yet')) : 'unsupported'],
      ['SW version', st.version || '—'],
      ['Cache', `${st.cacheName} (${st.cachedCount}/${st.precacheTotal})`],
      ['Offline ready', st.offlineReady ? 'yes' : 'no'],
      ['Network', pwa.online ? 'online' : 'offline'],
      ['Display mode', pwa.isInstalled ? 'installed app' : 'browser tab'],
      ['Storage', storage.available ? 'IndexedDB' : 'memory fallback (' + (storage.lastError || 'unavailable') + ')'],
      ['Profiles', String(profileService.profiles.length)],
      ['Current profile', p ? `${p.name} (${p.id})` : 'none'],
      ['Saved custom tracks', String(tracks.length)],
      ['Last save', storage.lastSaveTime ? new Date(storage.lastSaveTime).toLocaleTimeString() : 'never'],
      ['Screen', `${window.innerWidth}×${window.innerHeight} @${(window.devicePixelRatio || 1).toFixed(1)}x`]
    ];
    for (const [k, val] of rows) {
      const tr = el('tr');
      tr.appendChild(el('td', '', k));
      tr.appendChild(el('td', '', val));
      table.appendChild(tr);
    }
  };
  render();

  const row = el('div', 'dialog-buttons');
  const refresh = el('button', 'btn btn-small btn-blue', '🔄 Refresh');
  refresh.addEventListener('click', () => { audio.click(); render(); });
  row.appendChild(refresh);
  const checkUpdate = el('button', 'btn btn-small', '⬆️ Check for updates');
  checkUpdate.addEventListener('click', async () => {
    audio.click();
    if (pwa.registration) {
      try { await pwa.registration.update(); toast('Checked! You will see a banner if an update is ready.', '🔧'); }
      catch (e) { toast('Could not check right now.', '⚠️'); }
    }
  });
  row.appendChild(checkUpdate);
  body.appendChild(row);
}

/* ==================== Help / controls ==================== */

function helpScreen(root, params, router) {
  const body = screenShell(root, 'How to Play ❓', router);

  const mk = (title, lines) => {
    const panel = el('div', 'panel');
    panel.appendChild(el('h3', '', title));
    for (const line of lines) panel.appendChild(el('p', '', line));
    body.appendChild(panel);
  };

  mk('🏁 Racing', [
    '🚦 Wait for GO, then drive!',
    '🚏 Drive through every checkpoint flag.',
    '🏁 Cross the black-and-white finish line to win.',
    '⭐ Finish fast for more stars — but finishing always wins bolts!'
  ]);
  mk('📱 Touch controls', [
    '◀ ▶ buttons steer the truck.',
    '🟢 Go pedal (or auto-drive in Easy mode). 🛑 brakes and reverses.',
    '🚀 Boost when the little meter is full.',
    '⏸ pauses any time. You can swap sides for left hands in Settings!'
  ]);
  mk('⌨️ Keyboard controls', [
    'Arrow keys or WASD to drive.',
    'Space = boost. R = back on track. Esc = pause.'
  ]);
  mk('🔩 Bolts & trucks', [
    'Collect bolts on the track and earn more for finishing, jumping and smashing boxes.',
    'Spend bolts in My Garage to unlock new trucks and cool styles.',
    'Mud is slippery-slow, ice is super slidey, boost pads are fast, ramps make you FLY!'
  ]);

  if (audio.ttsAvailable) {
    const read = el('button', 'btn btn-blue', '🔊 Read instructions aloud');
    read.addEventListener('click', () => audio.speak(
      'How to play! Wait for the green go, then drive through every checkpoint flag and cross the finish line. ' +
      'Steer with the arrow buttons. The green pedal makes you go, the red one stops. ' +
      'Collect golden bolts to unlock new monster trucks in your garage. ' +
      'Mud is slow, ice is slidey, and ramps make you fly. Have fun!', true));
    body.appendChild(read);
  }
}
