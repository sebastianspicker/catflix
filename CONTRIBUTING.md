# Contributing

Thanks for helping with Catflix. Keep changes narrow, and stay inside the
product and safety boundaries described in [PRODUCT.md](PRODUCT.md).

## Development

1. Use the Node.js version in [`.nvmrc`](.nvmrc).
2. Install dependencies with `npm ci --ignore-scripts`.
3. Touch an observable contract? Run a focused test first, for example
   `npm run test -- src/app/workflow.test.ts`.
4. Run `npm run verify` before you finish. It covers lint, source-size and
   duplication gates, unit and artifact tests, architecture boundaries,
   TypeScript, the production build, and bundle budgets.
5. Run `npm run build:pages` when you change routes, public assets, build output,
   or Pages configuration.
6. Run `npm run test:e2e` for rendered workflow, persistence, responsive, or
   browser changes. Install the browsers once with
   `npx playwright install chromium webkit`.

Docs-only changes just need working links, correct paths, and `git diff --check`.
Skip the full gate unless you touch runtime-imported research Markdown, or a claim
whose implementation should be rechecked.

Use `npm run lint` and `npm run lint:fix` for ESLint and Stylelint, and
`npm run test:build` for the manifest/CI fixtures.

CI tests both the root and Pages bases, runs Playwright, then reuses that same
artifact in `pages` and `deploy`. Don't add a second install or build to `pages`.

## Local data and runtime

Keep the schema-v2 contract and the 5 MiB UTF-8 pretty-printed backup limit. Use
the shared capacity and serialization helpers in `src/local-data/`, and validate
inside the transaction before writing.

Ordinary history writes should scale with the records that changed and never
clear stores; only a confirmed import replaces all stores. Preserve oversized
records, non-growing updates, deletion, and explicit recovery export. A capacity
rejection must keep the observation draft and must not mark IndexedDB degraded.

Progress callbacks keep precise elapsed time in a ref while React follows the
displayed second and phase. A paused Canvas host schedules no frames, and
visibility changes never resume playback automatically.

## Product constraints

- Keep records local unless a separately reviewed feature changes that boundary.
- Keep playback finite, supervised, voluntary, muted by default, and free of
  automatic replay.
- Treat earlier progress as a restart reminder, not a resume point. Record a
  comparison run as one observed side at a time; compatible current A/B runs may
  link automatically, but never imply a winner or a measured preference.
- Treat looking, tracking, approaching, and pouncing as attention — not proof of
  enjoyment, benefit, or preference.
- Don't add breed modes, engagement scores, automatic profiles, diagnostic
  claims, universal display prescriptions, ultrasonic audio, or intensity
  escalation.
- Preserve keyboard operation, visible focus, focus restoration, reduced-motion
  support, and the tablet and television modes.

## Pull requests

Describe the user-visible change, the tests you ran, and any screenshot, storage,
privacy, or research-claim impact. New scientific claims must update both
[docs/research/feline-perception.md](docs/research/feline-perception.md) and
[docs/research/evidence-ledger.csv](docs/research/evidence-ledger.csv) with a
stable source record.

Use synthetic local records in browser tests and screenshots. Don't commit or
upload household exports, real names beyond the authored referee vocabulary, or
free-form private notes.

By submitting a contribution you agree it may be distributed under the
repository's MIT License. Don't submit third-party assets or research content
unless its provenance and redistribution terms are documented and compatible.

## Module placement

Follow [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Put authored scene material
in `src/catalogue/model`, deterministic rules in `src/encounter/engine`, browser
renderer code in `src/encounter/runtime`, and storage or JSON migration in
`src/local-data`. Keep `src/app` as composition, not a second source of domain or
persistence rules.
