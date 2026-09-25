# Catflix agent guide

This file applies to the entire repository. Catflix is one local-first React
application for five finite, supervised feline visual encounters. It is not a
monorepo and has no independently operated service or package.

## Product invariants

- Playback is owner-initiated, finite, supervised, muted at start, and never
  automatically replayed.
- Tablet mode accepts target contacts. Passive-television mode suppresses all
  scene input.
- Observations stay descriptive. Do not infer preference, enjoyment, welfare,
  diagnosis, or therapeutic benefit.
- There is no runtime account, API, analytics, cloud sync, or catalogue network
  dependency.
- Audio is unavailable until an eligible local recording and its provenance are
  added. Existing visual assets do not establish redistribution clearance.

## Source boundaries

- `src/domain/` owns stable scene IDs, variants, playback modes, and encounter
  contracts. It has no product dependencies.
- `src/catalogue/model/` owns the five authored scene aggregates, asset
  provenance, validation, and manifest/runtime projections.
- `src/encounter/engine/` is deterministic and browser-independent.
  `src/encounter/runtime/` owns browser lifecycle, Canvas, lazy Phaser, pointer
  translation, and audio. `src/encounter/ui/` owns encounter-facing React UI.
- `src/local-data/` is the only persistence boundary. It owns codecs, IndexedDB,
  degraded memory, and repository operations.
- `src/catalogue/ui/` and `src/research/` own their feature presentation.
  `src/demo/` owns the `/demo` screenshot tour.
  `src/ui/` contains only genuinely shared primitives.
- `src/app/`, `src/App.tsx`, and `src/main.tsx` compose modules and workflow;
  they must not become a second catalogue, simulation, or persistence source of
  truth.

`scripts/check-architecture.mjs` enforces the import direction and rejects
cycles. Do not add generic `utils` modules, compatibility facades, or legacy
paths that bypass these boundaries. Place tests beside the module whose
observable contract they protect.

## Stable contracts

- Preserve the five scene IDs and the authored catalogue as the source for
  public asset paths, checksums, content revision, manifests, and scene scores.
  Update `assets/masters/PROVENANCE.md` and `NOTICE.md` when the asset or rights
  record changes.
- IndexedDB database `catflix-local` is schema version 2 with stores `settings`,
  `queue`, `progress`, `notes`, `observations`, `comparisons`, and `provenance`.
  Import accepts schema v1 and v2, export emits v2, and import replacement is
  atomic across every store. Normal backups are limited to 5 MiB of UTF-8,
  pretty-printed schema-v2 JSON and the shared per-store count limits in
  `src/local-data/localDataCapacity.ts`. Capacity admission runs inside the
  transaction. Preserve existing oversized data; recovery export is explicit.
  Ordinary writes commit only changed keys; full replacement is for imports.
- Routes are `/`, `/research`, and `/demo`; GitHub Pages uses `/catflix/`. Construct public
  paths through `src/paths.ts`, never with a root-only assumption.
- Query controls are a positive integer `seed`, `contrast=enhanced`, and
  `renderer=canvas`.
- The current curator exposes contrast and motion comparisons only. Historical
  sound and novelty values remain valid import data, not active controls.

## Toolchain and commands

Use Node.js 24 from `.nvmrc`, npm, and the committed lockfile. From the repository
root:

```bash
npm ci --ignore-scripts
npm run dev
npm run test
npm run test:watch
npm run test:build
npm run test:e2e
npm run lint
npm run lint:fix
npm run quality:size
npm run quality:duplication
npm run typecheck
npm run build
npm run verify
npm run build:pages
npm run preview:pages
```

Run a focused test with `npm run test -- path/to/file.test.ts`. `lint` checks
ESLint and Stylelint; `lint:fix` applies their available fixes. Source-size and
duplication gates run separately and within `verify`. No standalone format or
coverage command is defined. `test:build` runs artifact/CI fixtures with Node's
test runner. `test:e2e` builds and previews Pages for Chromium and iPad WebKit;
install its browsers with `npx playwright install chromium webkit` if needed.

Before completing application changes, run `npm run verify` (lint, source size,
duplication, unit and artifact tests, architecture, typecheck/build, and manifest
bundle budgets). Also run
`npm run build:pages` after changes to routes, public assets, base-path handling,
build output, or Pages configuration. Documentation-only changes do not require
the application suite unless they change the runtime-imported research Markdown
or a claim whose implementation must be rechecked. Always run `git diff --check`
and verify changed documentation links and paths. The manifest budget counts
unique JavaScript in the entry's static/preload graph against 300 KiB; Phaser
must remain dynamically reachable, absent from that graph, and at most 1,500 KiB.
CI `verify` uploads the Pages artifact after Playwright succeeds; `pages`
validates that download without rebuilding, and `deploy` consumes the same
artifact under its existing main-push trigger.

## Documentation and generated paths

- `README.md` is the human entry point; `docs/ARCHITECTURE.md` is the implemented
  architecture source of truth; `PRODUCT.md` owns product and claim policy.
- Scientific claims must remain traceable between
  `docs/research/feline-perception.md` and
  `docs/research/evidence-ledger.csv`.
- Do not manually edit `dist/`, `node_modules/`, coverage/test output, or local
  analysis state under `.serena/`, `.claude/`, or `.codex/`.
- Preserve unrelated work. Do not commit, push, deploy, or change remote state
  without explicit instruction.

## Working together

The user, Claude Code and Codex share this repository, and this file is the
guide both agents read.

- **Roles.** The user sets scope, approves irreversible or outward-facing
  actions, and commits. The agent the user starts implements; the other
  agent reviews. No agent accepts its own work.
- **One writer at a time.** Only one agent edits this checkout at a time.
  Before editing, read `.agents/handoff.md` if it exists and run
  `git status`; preserve changes you did not make.
- **Handoff.** When you stop with work in progress or ask for review,
  overwrite `.agents/handoff.md` (ignored by git, never committed) with:
  status (`in-progress`, `ready-for-review`, `changes-requested` or
  `accepted`), date, goal, files changed, checks run with exit codes, and
  open questions or risks.
- **Review.** Review the uncommitted diff against the goal in the handoff
  note. Report each finding as `file:line`, defect and evidence, and record
  the verdict in the handoff note. Do not rewrite the change unless asked.
- **Ready for review** means `npm run verify` exits 0, and `npm run
  build:pages` also exits 0 for changes to routes, public assets, base-path
  handling, build output, or Pages configuration. Paste failures verbatim
  and name any check you skipped.
