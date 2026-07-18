# 🛻 Monster Track Garage (+ 💥 Titan Crush)

> This repo ships **two** offline-capable games:
> **Monster Track Garage** (this page — 2D racing & track building, ages 6–12)
> and **[Titan Crush](titan-crush/README.md)** (3D monster truck stunt arena,
> Three.js + cannon-es, ages 8+) at the `titan-crush/` subpath. Both are
> linked from the landing page and deploy together on GitHub Pages.

A colorful, kid-friendly **monster truck racing and track-building game** that runs
entirely in the browser as an offline-capable **Progressive Web App (PWA)**.

Built for kids roughly **ages 6–12** who love toy car tracks, monster trucks,
ramps, jumps, crashes, collecting and customizing.

**No ads. No purchases. No accounts. No chat. No tracking. No backend.**
Everything is static files served from GitHub Pages, and after the first load the
game works completely offline — even in airplane mode.

> 🎨 All vehicles, tracks, names, artwork and sounds are **original creations**.
> Nothing is copied from any existing game or brand.

---

## ✨ Features

- 🏁 **Quick Race** — pick a truck and a track, go!
- 🗺️ **Adventure Trail** — 7 themed courses that unlock one after another
  (Backyard, Construction, Desert, Mud Arena, Arctic, Neon Night, Volcano)
- 🔨 **Track Builder** — tap-to-paint your own tracks on a snap grid: roads, ramps,
  boost pads, mud, ice, boxes, bolts, checkpoints and finish lines.
  Name, save, edit, copy, play and delete your creations
- 🛠️ **Free Drive Garage** — a playground with no timers and no failure
- 🚚 **8 original monster trucks** with different Speed / Zoom-up / Grip / Jump /
  Strength stats — no truck is best at everything
- 🎨 **Customization** — body colors, wheel styles, tire sizes (with clearly
  explained tradeoffs), decals, flags, horns, wings and glow effects
- 🔩 **Bolts** earned by finishing races, collecting, jumping and smashing —
  spend them on trucks and styles. Never sold for real money
- 🏆 **12 friendly achievements** and per-profile statistics
- 👨‍👩‍👧‍👦 **Up to 4 local profiles**, each with its own progress, settings and tracks
- 💾 **Save export/import** — download a JSON backup, restore it on any device
- ♿ **Accessibility** — reduced motion, high contrast, bigger buttons, left-handed
  controls, auto-accelerate, screen-shake toggle, optional read-aloud (TTS),
  color-independent indicators
- ✈️ **Offline-first PWA** — versioned service-worker cache, offline indicator,
  "Reload to Update" banner
- 🔊 **All audio synthesized live** with the Web Audio API — zero sound files
- 🧑‍🔧 **Parent screen** — plain-language privacy/safety info, parent-gated resets

## 🕹️ Controls

| Action | Touch | Keyboard |
| --- | --- | --- |
| Steer | ◀ ▶ buttons | ← → or A / D |
| Accelerate | 🟢 pedal (or auto-drive) | ↑ or W |
| Brake / reverse | 🛑 pedal | ↓ or S |
| Boost (when meter is full) | 🚀 button | Space |
| Back on track | pause menu | R |
| Pause | ⏸ button | Esc or P |

Touch controls can be **mirrored for left-handed players** and enlarged in Settings.

## 📦 Repository layout

```
/
├── index.html              App shell (single page)
├── manifest.webmanifest    PWA manifest (relative paths, subpath-safe)
├── service-worker.js       Versioned precache, offline-first
├── css/                    app.css, game.css, accessibility.css
├── js/
│   ├── version.js          Single source of truth for the version
│   ├── app.js              Bootstrap
│   ├── config.js           Constants, tile legend, difficulty presets
│   ├── router.js           Screen router
│   ├── game/               Engine: physics, renderer, input, track, collision
│   ├── data/               Vehicles, tracks, achievements (pure data)
│   ├── services/           storage (IndexedDB), audio (WebAudio), pwa, profiles
│   └── ui/                 Screens, dialogs, HUD
├── assets/icons/           Generated original icons (SVG + PNG, maskable)
└── docs/                   architecture.md, deployment.md, testing.md
```

## 🚀 Deploying to GitHub Pages

Short version (full walkthrough in [`docs/deployment.md`](docs/deployment.md)):

1. Create a GitHub repository (e.g. `monster-track-garage`) and push these files
   to the default branch.
2. Repository **Settings → Pages → Source: Deploy from a branch**, pick your
   branch and `/ (root)`, save.
3. Open `https://<username>.github.io/<repo>/` — the game loads and the service
   worker caches everything (you'll see a "Ready for offline play" message).
4. Install it: browser menu → *Install app* / *Add to Home Screen*.
5. Turn on airplane mode and launch it again — it still works. ✈️

The app uses **only relative paths**, so it works from any subdirectory —
no configuration needed.

### Publishing an update

1. Make your changes.
2. Bump the version in **`js/version.js`** (this renames the cache).
3. Commit and push. Players get a friendly **"Reload to Update"** banner on their
   next visit; nothing is swapped mid-game.

### Rolling back

Revert the bad commit (`git revert`), bump the version again, push. Pages serves
the previous code and clients update the same safe way.

## 💻 Local development

No build step, no Node, no npm. You only need a static file server, because
service workers require `http(s)` (not `file://`):

```bash
# any static server works, e.g.
python3 -m http.server 8080
# then open http://localhost:8080
```

Edit files, reload. To test the update flow locally, bump `js/version.js`.

## 💾 Save data & backups

- Progress is stored on-device in **IndexedDB** (schema-versioned, validated,
  with an in-memory fallback and a friendly warning if storage is blocked).
- **Parents → Saved Data** lets you export a JSON save file, import it (fully
  validated before use), reset one profile, or wipe everything.
  Destructive actions are protected by a **grown-up code prompt**.

## 🌐 Browser support & known limitations

- **Chrome / Edge (Android, desktop, Chromebook):** full support incl. install prompt.
- **Safari (iPhone/iPad):** install via Share → *Add to Home Screen* (Apple doesn't
  show automatic install prompts). Speech (read-aloud) voices vary by device.
- **Firefox:** plays fine in the browser; installation support varies by platform.
- Private/incognito windows may block IndexedDB — the game still runs and warns
  that progress won't be kept.
- Offline mode requires one full load over HTTPS first (GitHub Pages provides this).

## 🔒 Privacy & child safety design

- No network requests except loading the game's own static files.
- No ads, purchases, currencies for sale, loot boxes, timers or dark patterns.
- No chat, no social features, no external links in kid-facing screens.
- Names/avatars live only on the device and are never transmitted.
- A strict Content-Security-Policy is set in `index.html`; no `eval`,
  no third-party code, no CDNs, no fonts or assets from other domains.

## 📄 License

[MIT](LICENSE). Have fun, remix it, build tracks!

## 📸 Screenshots

*(placeholders — add your own after deploying)*

| Menu | Racing | Builder |
| --- | --- | --- |
| _screenshot_ | _screenshot_ | _screenshot_ |
