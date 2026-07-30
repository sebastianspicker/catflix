# Release status

Status: public source alpha, tagged release on hold
Version: 0.2.0
Checked: 30 July 2026
Repository: https://github.com/sebastianspicker/catflix

## Confirmed locally

- `npm test`: 40 tests passed across 6 files.
- `npm run build`: TypeScript and the Vite production build passed.
- `CATFLIX_E2E_PORT=4183 npm run test:e2e`: 43 tests passed and 5 browser-specific checks were intentionally skipped.
- The passing Playwright matrix covered desktop Chromium, desktop Firefox, iPad WebKit, and mobile Chromium.
- Catalogue, filtering, queue, safety gate, player, pause and stop, descriptive notes, local data import and export, evidence panels, complete research route, explicit scene-motion settings, television mode, and deterministic scene checkpoints have automated coverage.
- The application runtime contains no network fetch path. DOI links leave the application only when a reader opens a cited source.

## Publication blockers

1. No project license has been selected.
2. `src/content/registry.ts` records several existing poster assets with an unknown original creator and clearance still to be confirmed.
3. No clean dependency lockfile exists. The current local `node_modules` contains workspace-linked packages, so it cannot be used to derive a trustworthy lockfile.
4. The GitHub Actions workflow must pass for the exact commit selected for a tagged release. Local evidence does not substitute for that remote run.

## Known build notes

- Vite reports deprecated internal `esbuild` options from `@vitejs/plugin-react` 5.2.0 during test and build. The checks still pass.
- The lazy player bundle is approximately 1.41 MB minified and 370 KB gzip because it contains Phaser. Vite reports the chunk above its default warning threshold.
- Audio controls remain unavailable because no cleared environmental recording is bundled. Playback starts muted.

## Before public alpha

- Choose and add the intended code, research-content, and artwork licenses.
- Resolve or replace every asset whose provenance says clearance must be confirmed.
- Create a lockfile from a clean install, then change CI from `npm install` to `npm ci` with dependency caching.
- Run the local verification commands from a clean checkout.
- Run GitHub Actions and inspect its uploaded Playwright report if a test fails.
- Configure the repository description, topics, social preview, security contact, and branch protection on GitHub.
- Tag the approved commit only after the candidate tree, screenshots, and release notes are frozen.

The public repository contains source-alpha material only. No tag, GitHub Release, deployment, or claim of production readiness has been made.
