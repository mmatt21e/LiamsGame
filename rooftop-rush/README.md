# 🏃 ROOFTOP RUSH — Endless Runner

A 3D endless runner across **subway tracks and city rooftops** at dusk.
Lives in this repo at `rooftop-rush/`, runs entirely as static files —
no server, no build step, no CDNs, fully offline after the first load.

## The game

Sprint forward forever through a procedurally generated city that
alternates between **subway blocks** (rails, sleepers, platforms with
yellow safety lines, tunnel columns, parked trains, signal lights) and
**rooftop blocks** (gravel roofs, parapets, AC units, water towers,
chimney stacks, and **gaps between buildings you must jump**).

- **3 lanes** — swipe left/right (or ←/→, A/D) to switch, swipe up / tap
  (↑, W, Space) to jump, swipe down (↓, S) to slide.
- Obstacles demand the right move: **jump** low barriers and AC units,
  **slide** under overhead ducts and signs, **dodge** trains, chimney
  stacks — and **jump the roof gaps** or it's a long way down.
- Speed and obstacle density ramp up the longer you survive.
- **Coins** spawn in rows and jump-arcs; score = distance + coins × 5.
- **Power-ups:** 🧲 Magnet (10 s coin vacuum) and 🛡 Shield (absorbs one hit).
- **The Crew:** 5 unlockable runners bought with banked coins
  (VOLT 150 · FROST 400 · SHADOW 800 · EMBER 1500).
- Best score, coin bank, unlocks and mute persist in `localStorage`.

## Tech

- **Three.js bundled locally** (`vendor/three.module.js`, resolved via an
  import map — nothing loads from a CDN).
- Realistic dusk look: ACES tone mapping, directional sun with PCF soft
  shadows, distance fog, gradient sky dome, glowing skyline backdrops,
  window-lit buildings dropping away beside the rooftops.
- All geometry is **procedural** (runner with a full run/jump/slide
  animation cycle, trains, barriers, roof props, coins) — no model files.
  `buildRunner()` in `js/runner.js` is the swap point if you later want
  to drop in a `.glb` character.
- **Object pooling everywhere**: 18 environment segments, all obstacles,
  90 coins and the particle burst pool are recycled, never re-allocated,
  for a steady 60 fps on mid-range phones.
- All audio synthesized with the Web Audio API (coin pings, whooshes,
  crash, subway rumble bed) — zero audio files; mute toggle on the menu.
- Own `manifest.json` (`display: standalone`, 192/512/maskable icons)
  and a service worker scoped to this folder precaching every asset —
  installable, versioned cache (`sw.js` → bump `VERSION` on changes).

## Deploy (GitHub Pages)

Deploys with the rest of this repository: push the repo, enable
**Settings → Pages → Deploy from a branch → / (root)**, done. The game
is then at `https://<user>.github.io/<repo>/rooftop-rush/` — open it
once online and it plays offline forever after. All paths are relative,
so any subdirectory works.

## Asset notes

- `icons/` — generated PNGs (192, 512, maskable, apple-touch). Replace
  with your own art any time; keep the same filenames.
- No audio files are needed (synthesized). If you prefer recorded
  sounds, drop files in an `audio/` folder, play them from `js/audio.js`,
  and add their paths to `ASSETS` in `sw.js`.
