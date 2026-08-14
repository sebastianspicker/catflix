# Release status

Status: public source alpha, tagged release on hold
Version: 0.2.0
Checked: 13 August 2026
Repository: https://github.com/sebastianspicker/catflix

## Confirmed locally

- `npm test`: 51 tests passed across 10 files.
- `npm run build`: TypeScript and the Vite production build passed.
- `CATFLIX_E2E_PORT=4210 npm run test:e2e`: 51 tests passed and 5 browser-specific checks were intentionally skipped.
- `npm run test:pages`: the generated fallback files, project-base asset paths,
  direct research route, and scene startup passed.
- `npm run capture:screenshots`: all 3 canonical screenshot cases passed.
- A clean Node 22 install from `package-lock.json` completed with `npm ci --ignore-scripts`; from that isolated install, all 51 unit tests, the production build, all 51 runnable browser tests, and the Pages route test passed. Node 22 is within the declared engine range.
- The passing Playwright matrix covered desktop Chromium, desktop Firefox, iPad WebKit, and mobile Chromium.
- Catalogue, filtering, queue, safety gate, player, pause and stop, descriptive notes, local data import and export, evidence panels, complete research route, explicit scene-motion settings, television mode, and deterministic scene checkpoints have automated coverage.
- The application runtime contains no network fetch path. DOI links leave the application only when a reader opens a cited source.
- All five visual packages now use independently generated environment and subject sources. Runtime manifests verify the bundled checksums and no longer depend on the former unknown-origin artwork.

## Publication blockers

1. The GitHub Actions workflow must pass under its configured Node 24 runtime for the exact commit selected for a tagged release. Local evidence does not substitute for that remote run.

## Known build notes

- Phaser is loaded only for the automatic renderer after a synchronous Canvas stage is ready. Its separate lazy chunk remains above Vite's default size-warning threshold.
- Audio controls remain unavailable because no cleared environmental recording is bundled. Playback starts muted.

## Before public alpha

- Verify the reviewed `package-lock.json` with `npm ci --ignore-scripts && npm run check` under Node 24.
- Run the local verification commands from a clean checkout.
- Run GitHub Actions and inspect its uploaded Playwright report if a test fails.
- Configure the repository description, topics, social preview, security contact, and branch protection on GitHub.
- Tag the approved commit only after the candidate tree, screenshots, and release notes are frozen.

The public repository contains source-alpha material only. No tag, GitHub Release, deployment, or claim of production readiness has been made.
