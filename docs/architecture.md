# Architecture

Monster Track Garage is a **zero-build, static, offline-first PWA** written in
modern vanilla JavaScript (ES modules), HTML5 Canvas and CSS. There is no
backend, no database server, no bundler and no framework.

## High-level picture

```
index.html  (app shell, CSP, static splash)
   ├─ js/version.js          classic script: self.APP_VERSION (shared with the SW)
   └─ js/app.js (module)     bootstrap
        ├─ services/storage-service.js   IndexedDB wrapper + memory fallback
        ├─ services/profile-service.js   profiles, bolts, unlocks, achievements,
        │                                custom tracks, export/import, migration
        ├─ services/audio-service.js     WebAudio synth (SFX, engine, music, TTS)
        ├─ services/pwa-service.js       SW registration, updates, install, status
        ├─ router.js                     stack-based screen router (no URLs)
        └─ ui/screens.js                 all 18 screens
             ├─ ui/dialogs.js            dialogs, parent gate, toasts
             ├─ ui/hud.js                in-game DOM overlay + touch controls
             └─ game/game-engine.js      one race session
                  ├─ game/track.js       grid → world (terrain, objects, gates)
                  ├─ game/physics.js     arcade driving model
                  ├─ game/collision.js   walls + object pickups/hits
                  ├─ game/renderer.js    themed canvas rendering + particles
                  ├─ game/input-manager.js  keyboard + touch merge
                  └─ game/vehicle.js     procedural truck artwork
service-worker.js  versioned precache of every file, cache-first
```

## Key decisions

### One track format for everything
Tracks are arrays of equal-length strings; each character is a tile
(see the legend in `js/config.js`). Built-in tracks, the free-drive playground
and player-built tracks all use the same format, so the builder gets the full
feature set (mud, ice, ramps, boost pads, boxes, checkpoints…) for free, and
validation is a single function (`sanitizeCustomTrack`).

### Game loop
`GameEngine` runs `requestAnimationFrame` with a **fixed 60 Hz physics
timestep** (accumulator, max 5 steps per frame). The loop pauses automatically
when the page is hidden. Rendering scales the canvas by `devicePixelRatio`
(capped at 2) and only draws visible tiles. Particles are capped (~240) and the
HUD only mutates two `textContent` values per frame — no DOM churn.

### Driving model
Arcade: velocity is a vector pulled toward the truck's heading by a grip
factor. Low-grip surfaces (ice) reduce that pull → drifting. Surfaces add drag
(mud/sand/slow zones), boost pads accelerate, ramps set a vertical velocity on
a fake `z` axis. A stuck-rescue timer respawns the truck at the last safe spot
so a child can never be trapped; `R`/pause menu do it on demand.

### Checkpoints & finishing
Contiguous checkpoint tiles are flood-filled into gates. Gates can be touched
in any order (kid-friendly); when all are hit, crossing any finish tile ends
the race. Stars come from par time × difficulty multiplier, but **finishing
always earns at least 1 star and bolts** — no failure states.

### Storage
`storage-service.js` wraps IndexedDB (db `mtg-db`, stores `profiles`,
`tracks`, `meta`) behind promise APIs that **never reject** — failures degrade
to an in-memory store and the UI shows a warning. Profiles carry a `schema`
number; anything read from disk or imported passes through
`sanitizeProfile`/`sanitizeCustomTrack`, which clamp, validate and default
every field (this doubles as the migration funnel). Saves are debounced
(800 ms) and flushed on `pagehide`/`visibilitychange`.

### Service worker / updates
The cache name embeds `APP_VERSION` from `js/version.js` (imported by both the
page and the SW via `importScripts`). Install precaches every file; activate
deletes old caches. The SW does **not** `skipWaiting()` on its own — the page
shows a "Reload to Update" banner and only then messages `SKIP_WAITING`,
followed by one controlled reload. All URLs are relative, so any GitHub Pages
subpath works.

### Security
- CSP meta tag: `default-src 'self'` (plus `img-src data:` for canvas exports);
  no inline scripts or styles, no eval, no external origins.
- Player strings (names, track names) are only ever assigned via `textContent`.
- Imported JSON is size-limited and field-validated before use.

## Adding content

- **New vehicle:** add an entry to `js/data/vehicles.js` (stats 1–5, cost,
  body shape/colors). Everything else (garage, unlocks, previews) picks it up.
- **New track:** add a grid to `js/data/tracks.js` with a unique `id`, a theme
  and `adventure: n` if it belongs on the trail. Rows must be equal length,
  exactly one `1` start, at least one `F` and ideally some `K` gates.
- **New achievement:** add to `js/data/achievements.js` with a `check(profile)`.
- **New theme:** add a palette to `THEMES` in `js/data/tracks.js`.

## Versioning

Bump `self.APP_VERSION` in `js/version.js` for every release and add a
CHANGELOG entry. That single constant drives the displayed version, the
diagnostics screen and the service-worker cache version.
