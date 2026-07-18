# 💥 TITAN CRUSH — Monster Truck Stunt Arena

A 3D monster truck stunt game that lives inside this repo at `titan-crush/`
and runs 100% as static files — no server, no build step, no CDNs.

- **Engine:** [Three.js](https://threejs.org) (bundled locally in `vendor/`)
  with ACES tone mapping, soft shadows, a dusk skybox and Unreal-style bloom.
- **Physics:** [cannon-es](https://github.com/pmndrs/cannon-es) (bundled locally)
  — a real `RaycastVehicle` with 4 spring-suspension wheels.
- **Gameplay:** crush cars (combo multipliers), hit ramps, rack up air-time
  and land full flips. 90-second Freestyle mode for high scores, plus a
  no-timer Practice mode.
- **Progression:** VENOM and GOLIATH trucks unlock at 5,000 / 12,000 high
  score; 6 paint colors. High score and unlocks persist in `localStorage`.
- **Controls:** WASD / arrows + Space, R to flip upright, Esc to pause —
  or the on-screen touch buttons on phones/tablets.
- **PWA:** own `manifest.json` + service worker scoped to this folder, so it
  installs as its own app and plays fully offline after the first visit.

## How it fits in this repo

The repo root hosts **Monster Track Garage** (2D, ages 6–12). Its landing
page links here. The root service worker deliberately ignores
`titan-crush/**` so this game's own service worker manages its cache.

## Publishing (for non-developers)

This game deploys together with the rest of the repository:

1. Create a GitHub account and a new **public repository**.
2. Upload **all files in this project** (keep the folder structure exactly
   as-is — `titan-crush` must stay a folder at the top level).
3. In the repository: **Settings → Pages → Source: Deploy from a branch**,
   choose your branch and **/ (root)**, then Save.
4. After about a minute your games are live at
   `https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/` — Titan Crush is at
   `https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/titan-crush/`.
5. Open Titan Crush once while online; after that it works with no internet.
   Install it from the browser menu ("Add to Home screen" / "Install app")
   to get its own icon.

## Tweaking the game

Everything is commented. The interesting knobs:

| File | What's inside |
| --- | --- |
| `js/physics.js` | Truck specs (mass/power/steering), suspension tuning, ramp + car layout |
| `js/world.js` | Lighting, bloom strength, skybox colors, truck/car models, dust |
| `js/main.js` | Scoring values, combo window, timer length, unlock thresholds |
| `js/audio.js` | All synthesized sounds (engine, crushes, flips) |
| `sw.js` | Offline cache — **bump `VERSION` whenever you change any file** |

No build step: edit a file, refresh the page.
