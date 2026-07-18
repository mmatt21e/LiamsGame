# Changelog

All notable changes to Monster Track Garage.
The app version lives in `js/version.js` (bump it for every release —
it drives the service-worker cache version and the update banner).

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
