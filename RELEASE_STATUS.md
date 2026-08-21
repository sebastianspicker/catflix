# Release status

Status: public source alpha, tagged release on hold
Version: 0.2.0
Checked: 13 August 2026
Repository: https://github.com/sebastianspicker/catflix

## Confirmed locally

- `npm test`: focused unit tests passed.
- `npm run build`: TypeScript and the Vite production build passed.
- Catalogue integrity, finite playback, touch safety, and local data import/export have focused automated coverage.
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
- Run GitHub Actions for the focused unit and build gate.
- Configure the repository description, topics, social preview, security contact, and branch protection on GitHub.
- Tag the approved commit only after the candidate tree, screenshots, and release notes are frozen.

The public repository contains source-alpha material only. No tag, GitHub Release, deployment, or claim of production readiness has been made.
