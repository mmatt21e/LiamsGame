# Deployment guide (GitHub Pages)

The game is 100% static files — GitHub Pages hosts it for free, with the HTTPS
that service workers require. No build step, no Actions workflow needed.

## 1. Create the repository

1. Sign in to GitHub → **New repository**.
2. Name it anything (e.g. `monster-track-garage`). Public repos get free Pages.
3. Create it empty (no auto-README needed — this project has one).

## 2. Upload / commit the files

Either drag-and-drop the project files in the GitHub web UI (*uploading an
entire folder needs the git client*), or from a terminal:

```bash
git clone https://github.com/<username>/monster-track-garage.git
# copy all project files in (index.html at the repo root!)
git add -A
git commit -m "Monster Track Garage v1.0.0"
git push origin main
```

`index.html` must be at the **repository root** (same level as
`service-worker.js` and `manifest.webmanifest`).

## 3. Enable GitHub Pages

1. Repository → **Settings** → **Pages**.
2. Under **Build and deployment**: Source = **Deploy from a branch**.

## 4. Select the branch

3. Branch = `main` (or your default branch), folder = **/ (root)** → **Save**.
4. Wait ~1 minute. The page shows your URL:
   `https://<username>.github.io/monster-track-garage/`

## 5. Open the deployed application

Visit the URL. You should see the splash screen, then the profile screen.
The app uses only relative paths, so the subdirectory just works.

## 6. Confirm offline caching

1. Keep the page open ~10 seconds on first visit.
2. You should see a toast: **"Game saved for offline play!"**
3. Or check **Parents → Offline Status** — it should say
   *"✅ Ready for offline play"* with all files cached.

## 7. Install the PWA

- **Android Chrome/Edge:** ⋮ menu → *Install app* / *Add to Home screen*
  (or use the Install button on the Parents → Install screen).
- **iPhone/iPad Safari:** Share → *Add to Home Screen*.
- **Desktop Chrome/Edge/Chromebook:** install icon at the right of the address bar.

## 8. Test airplane-mode operation

1. Install the app (step 7) and open it once online.
2. Enable airplane mode (or DevTools → Network → Offline).
3. Launch the app from the home screen / start menu.
4. It must load, race, and save normally. An "✈️ Offline" chip appears briefly.

## 9. Publish future updates

1. Edit files locally.
2. **Bump the version in `js/version.js`** (e.g. `1.0.1`) — this renames the
   service-worker cache and triggers the update flow.
3. Update `CHANGELOG.md`, commit, push.
4. Players on the old version get a **"Reload to Update"** banner the next time
   they open the game online; tapping it swaps versions safely.

If you forget the version bump, browsers will still pick up changed files
eventually, but the update banner and clean cache swap won't happen — always bump.

## 10. Roll back a broken release

```bash
git revert <bad-commit-sha>      # or: git revert HEAD
# bump js/version.js again (e.g. 1.0.2) so clients see it as a NEW update
git commit -am "Roll back to good build (v1.0.2)"
git push origin main
```

Pages redeploys automatically; clients get the banner and reload onto the
restored build. (Never force-push over Pages history — a revert is safer.)

## Optional: custom domain / root hosting

Nothing changes — paths are relative. For a custom domain add a `CNAME` file
per GitHub's docs; HTTPS remains required for the service worker.
