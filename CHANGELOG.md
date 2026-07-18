# Changelog

All notable changes to Monster Track Garage.
The app version lives in `js/version.js` (bump it for every release —
it drives the service-worker cache version and the update banner).

## 1.3.0 — 2026-07-18

- New third game: **ROOFTOP RUSH** (`rooftop-rush/`) — 3D endless runner
  (Three.js, bundled locally) alternating subway and rooftop blocks:
  3-lane swipe controls, jump/slide obstacles, roof gaps, coins with
  magnet + shield power-ups, unlockable crew skins, pooled procedural
  world, own installable manifest + offline service worker.
- Landing page: Rooftop Rush card added under More Games.
- Root service worker now also ignores `rooftop-rush/**`.

## 1.2.0 — 2026-07-18

- New second game: **TITAN CRUSH** (`titan-crush/`) — 3D monster truck
  stunt arena built with locally-bundled Three.js + cannon-es. Raycast
  suspension, crushable cars with combo scoring, ramps, flips and
  air-time bonuses, unlockable trucks and paints, its own offline
  service worker and installable manifest.
- Landing page: "More Games" card linking to Titan Crush.
- Root service worker now ignores `titan-crush/**` (it has its own cache).

## 1.1.0 — 2026-07-18

- New landing page for browser visitors: install pitch with a one-tap
  Install button (native prompt where supported, guide elsewhere) and a
  "Play in Browser" option. The installed app skips it entirely.

## 1.0.0 — 2026-07-18

Initial release.

- Quick Race, Adventure Trail (7 tracks), Track Builder, Free Drive
- 8 original monster trucks with stats and unlocks
- Customization: colors, wheels, tires, decals, accessories, glows
- Bolts economy, 12 achievements, per-profile stats
- Up to 4 local profiles with export/import backup
- Offline-first PWA: versioned cache, update banner, offline indicator
- Web-Audio-synthesized sound effects, engine loop and music
- Accessibility: reduced motion, high contrast, large UI, left-handed
  controls, auto-accelerate, screen-shake toggle, optional TTS
- Parent screen with parent-gated data management
- Diagnostics screen (version button on the main menu)
