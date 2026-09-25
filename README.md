# Catflix

[![CI](https://github.com/sebastianspicker/catflix/actions/workflows/ci.yml/badge.svg)](https://github.com/sebastianspicker/catflix/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
![Node](https://img.shields.io/badge/node-24.x-5FA04E?logo=node.js&logoColor=white)

**A local-first browser catalogue of five finite, supervised scenes for cats.**

[**Open the live demo →**](https://sebastianspicker.github.io/catflix/) ·
[**See the screenshot tour →**](https://sebastianspicker.github.io/catflix/demo)

Catflix takes the shape of a streaming service and points it at a small,
hand-built watchlist made for cats. Pick a scene, confirm the room is safe, and
start a short encounter that begins muted, ends on its own, and never replays
itself. It all runs in one browser tab: no account, server, analytics, or network
dependency.

The project is a working example of a few things done carefully: deterministic,
frame-accurate simulation; strict module boundaries checked in CI; and private,
versioned local data with a real migration path.

Status: source alpha. No release is tagged yet.

| Scene | Length | Note |
| --- | --- | --- |
| Balcony Birds at Dusk | 1:45 | Perch, passage, occlusion, visible rest |
| Koi in Slow Motion | 2:00 | Long curves with a calm-water finale |
| Paper Moth at Midnight | 1:30 | Flutter passages with long landings |
| Beetle Beneath the Fern | — | Fern-margin crossings and shelter |
| The Red String Incident | — | Bounded tension and slack passages |

## Screenshot tour

The same tour is browsable at
[`/demo`](https://sebastianspicker.github.io/catflix/demo) on the live site, or
run it locally with `npm run dev` and open `/demo`.

### 1. Browse the catalogue

![Desktop catalogue](docs/screenshots/catalogue-desktop.png)

Five finite encounters with theme, subject, and rhythm filters, a local
watchlist, and a curator note for each scene.

### 2. Set the room

![Safety gate](docs/screenshots/safety-gate.png)

Playback stays locked until you choose a screen context and confirm a stable
device, protected cables, a clear exit, and continuous supervision.

### 3. Watch together

![Tablet scene](docs/screenshots/tablet-scene.png)

The player starts muted and keeps owner controls outside the scene, with pause,
stop, and a scene-motion setting.

### 4. Take it anywhere

![Mobile catalogue](docs/screenshots/catalogue-mobile.png)

The same catalogue at a 412 × 915 viewport — no separate mobile app.

## Quick start

Use the Node.js version in [`.nvmrc`](.nvmrc) (Node 24) and npm:

```bash
npm ci --ignore-scripts
npm run dev
```

Vite prints the local URL, usually `127.0.0.1:4173`. The app needs no API keys or
environment variables. Research citations only reach the network when you open
their external links.

Stack: React 19 + TypeScript on Vite, with a Canvas renderer that lazily upgrades
to Phaser. IndexedDB handles local storage. There is no backend.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite dev server. |
| `npm run test` | Run the colocated Vitest suite once. |
| `npm run test:watch` | Run Vitest in watch mode. |
| `npm run test:build` | Run build-manifest and CI artifact fixtures. |
| `npm run test:e2e` | Build and preview the Pages artifact, then run desktop Chromium and iPad WebKit checks. |
| `npm run lint` / `npm run lint:fix` | Check ESLint and Stylelint, or apply fixes. |
| `npm run quality:size` / `npm run quality:duplication` | Check source-size and duplication limits. |
| `npm run typecheck` | Type-check the app and Vite config. |
| `npm run build` | Type-check and build to `dist/`. |
| `npm run verify` | Run the full core gate: lint, size/duplication, unit/artifact tests, architecture, build, and bundle budgets. |
| `npm run build:pages` | Build and validate the `/catflix/` GitHub Pages artifact. |
| `npm run preview:pages` | Preview an existing Pages build at `127.0.0.1:4174`. |

`npm run verify` is the fast core gate. `npm run test:e2e` is the separate
browser gate CI runs after it. There is no standalone format or coverage script.

## Local data and privacy

Records live in the IndexedDB database `catflix-local` (schema v2) on your
current browser profile, with stores for settings, queue, progress, notes,
observations, comparisons, and provenance. Nothing is uploaded.

- **Import** accepts schema v1 and v2 exports after a validated preview;
  confirming atomically replaces all seven stores. **Export** emits schema v2.
- Backups must fit in **5 MiB** of UTF-8 pretty-printed JSON. Limits are one
  settings record, five queue items, five progress records, 10,000 each of notes,
  observations, and comparisons, and 100 provenance records.
- If IndexedDB can't open, Catflix reports degraded mode and falls back to
  page-lifetime memory. Import and export are disabled there so temporary data
  can't look durable.
- Existing oversized records are never truncated. **Recover an oversized record**
  downloads a distinct recovery copy before you delete anything.
- Exports can contain free-form household notes, so treat them as private data.

Observations stay descriptive. Looking, tracking, approaching, and pouncing count
as attention — not enjoyment, preference, diagnosis, or welfare.

## Project layout

| Path | Responsibility |
| --- | --- |
| `src/domain/` | Stable scene, playback, and encounter vocabulary. |
| `src/catalogue/model/` | The five authored scenes, provenance, validation, and projections. |
| `src/catalogue/ui/` | Catalogue and local-data presentation. |
| `src/encounter/engine/` | Deterministic, browser-independent encounter simulation. |
| `src/encounter/runtime/` | Canvas rendering and the optional lazy Phaser upgrade. |
| `src/encounter/ui/` | Safety setup, player controls, curation, and observations. |
| `src/local-data/` | Versioned codecs, IndexedDB, degraded memory, and repositories. |
| `src/demo/` | The `/demo` screenshot tour. |
| `src/app/`, `src/App.tsx` | Workflow state and application composition. |
| `src/research/`, `src/ui/`, `src/styles/` | Research route, shared primitives, and styling. |
| `assets/masters/`, `public/assets/` | Source artwork/provenance and browser-delivery assets. |

See [Architecture](docs/ARCHITECTURE.md) for dependency direction, runtime and
data flow, stable contracts, and placement rules.

## Documentation

- [Product principles](PRODUCT.md) — voice, curation limits, and safety rules.
- [Architecture](docs/ARCHITECTURE.md) — module boundaries and data flow.
- [Contributing](CONTRIBUTING.md) — workflow and review expectations.
- [Scientific foundation](docs/research/feline-perception.md) and the
  [evidence ledger](docs/research/evidence-ledger.csv) — research sources of truth.
- [Screenshots](docs/SCREENSHOTS.md) — the checked-in surface gallery.
- [Security policy](SECURITY.md) — private local records and reporting.
- [Asset notice](NOTICE.md) and [visual provenance](assets/masters/PROVENANCE.md) —
  the non-code asset boundary.

The bundle check follows Vite's manifest and holds initial JavaScript (static and
preload dependencies, counted once) to 300 KiB. Phaser must stay dynamically
reachable, outside that initial graph, and under 1,500 KiB. Both the root and
`/catflix/` builds are checked.

CI runs the core gate, then Playwright against the Pages build, and uploads that
tested artifact. The `pages` job validates it without rebuilding, and `deploy`
publishes the same artifact on pushes to `main`
([workflow](.github/workflows/ci.yml)). The iPad WebKit project is emulation, not
physical-device validation.

## License

Catflix software and original project documentation are available under the
[MIT License](LICENSE). The license does not grant rights in the bundled visual
assets; see [NOTICE.md](NOTICE.md).
