# Testing checklist

Manual test procedures for each release. The diagnostics screen
(main menu → tap the small `v1.x.x` button) shows app version, service-worker
state, cache counts, online state, storage mode, profile and save info.

## Platforms

| Platform | How to test |
| --- | --- |
| Android Chrome | Load the Pages URL, play a race, install, airplane-mode relaunch |
| Microsoft Edge (desktop) | Same as Chrome; verify install icon in address bar |
| Desktop Chrome | Full pass incl. keyboard controls and DevTools offline mode |
| Safari iPhone/iPad | Share → Add to Home Screen; relaunch offline; check touch controls and rotation |
| Chromebook | Install from address bar; test both touchscreen and keyboard |

## Core flows

- [ ] First visit: splash → profile creation → main menu, no console errors
- [ ] Quick Race: pick track → pick truck → countdown → drive → finish → results
- [ ] Progress persists: earn bolts, close the tab, reopen — bolts still there
- [ ] Adventure Trail: second course locked until the first is finished
- [ ] Garage: unlock a truck with bolts; insufficient bolts is handled kindly
- [ ] Customization: buy + equip a color/wheel/decal; preview updates
- [ ] Track Builder: create → save → appears in list → edit → play → copy →
      delete (with confirmation)
- [ ] Builder validation: saving without Start or Finish shows a friendly message
- [ ] Free Drive: no timer, no finish; exiting banks collected bolts
- [ ] Achievements: First Finish pops after race one; list screen shows it
- [ ] Profiles: create 4 (5th blocked), switch, per-profile progress isolated,
      delete requires the grown-up code

## Input

- [ ] Keyboard: arrows + WASD drive, Space boosts, R rescues, Esc pauses/resumes
- [ ] Touch: all buttons respond to press-and-hold; multi-touch steer+gas works
- [ ] Left-handed setting mirrors the clusters
- [ ] "Bigger buttons" setting enlarges HUD controls
- [ ] Auto-drive setting removes the gas pedal and drives forward automatically

## Layout

- [ ] Narrow phone (~360×640 portrait): menus scroll, cards wrap, HUD fits
- [ ] Landscape phone (short height): compact HUD kicks in
- [ ] Tablet + desktop: layout centred, max-width respected
- [ ] Screen rotation mid-race: canvas resizes correctly (no smearing)

## Offline / PWA

- [ ] First load online shows "Ready for offline play" toast
- [ ] Offline Status screen reports all files cached
- [ ] Airplane mode: installed app launches and plays fully
- [ ] Lose connection mid-race: gameplay unaffected; "✈️ Offline" chip appears
- [ ] Update flow: bump `js/version.js`, redeploy, reopen online →
      "Reload to Update" banner → tap → new version, saves intact
- [ ] Install prompt path (Chrome/Edge) and manual A2HS path (Safari)

## Save system

- [ ] Export downloads a JSON file with profile + custom tracks
- [ ] Import restores it (test on a second browser/profile)
- [ ] Import rejects: wrong file type, truncated JSON, >2 MB file — friendly errors
- [ ] Corrupted store: in DevTools, delete/garble the IndexedDB `mtg-db` →
      app still boots and creates fresh defaults (no crash)
- [ ] Storage blocked (incognito with cookies blocked): app runs in memory mode
      and shows the warning toast; Saved Data screen explains it
- [ ] Reset one profile and Reset ALL both require the 3-digit grown-up code

## Accessibility

- [ ] Reduced motion (setting ON and OS-level preference with Auto): animations
      and screen shake stop
- [ ] High contrast: readable text everywhere
- [ ] Sound disabled / muted: game fully playable, no errors
- [ ] TTS: "Read aloud" works where supported; toggle hides gracefully elsewhere
- [ ] Keyboard-only navigation: every screen reachable, focus visible
- [ ] Nothing depends on color alone (stat pips, checkpoint ✓/⚑ glyphs, labels)

## Performance

- [ ] Steady frame rate on a mid-range phone during racing (particles, mud)
- [ ] Game loop stops when tab hidden (CPU near 0 in task manager)
- [ ] No memory growth after several races (DevTools performance monitor)

## Console hygiene

- [ ] Zero errors on: boot, each screen, a full race, builder session, offline boot
