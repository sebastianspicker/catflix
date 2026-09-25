# Contributing to Catflix

Thanks for helping with Catflix. This guide is for a first-time contributor who
knows JavaScript and npm but hasn't worked in this codebase before.

## In brief

Three things matter more than anything else here:

1. **Keep changes narrow, and stay inside the product and safety boundaries
   described in [PRODUCT.md](PRODUCT.md).** [CONTRIBUTING, Intro] Catflix is a
   small, deliberately scoped app. A change that works but crosses one of its
   stated boundaries — what data may leave the device, how playback must
   behave, what the app may claim about a cat's feelings — is not welcome even
   if the code is correct.
2. **Run `npm run verify` before you finish**, and the extra checks
   (`npm run build:pages`, `npm run test:e2e`) when they apply to your change.
   [CONTRIBUTING, Development] These are the checks a change needs to pass
   before it is ready for review.
3. **Don't break the rules under "Rules you must not break" below.**
   [CONTRIBUTING, Product constraints] They cover what stays local, how
   playback must behave, and the line between a cat's attention and a cat's
   feelings.

If you read nothing else first, read [PRODUCT.md](PRODUCT.md) — it explains
*why* these boundaries exist.

## Before you start: the development workflow

Follow these steps for a change that touches application code.

1. **Use the Node.js version pinned in [`.nvmrc`](.nvmrc).**
   [CONTRIBUTING, Development] The project's own checks run on that version,
   so matching it avoids version-specific surprises.
2. **Install dependencies with `npm ci --ignore-scripts`.**
   [CONTRIBUTING, Development] `npm ci` installs exactly the versions recorded
   in the lockfile — unlike `npm install`, it will not update them — and
   `--ignore-scripts` skips any install-time scripts a dependency ships.
3. **If your change touches an observable contract, run a focused test
   first.** [CONTRIBUTING, Development] An observable contract is behavior
   that something else — another module, or a person using the app — depends
   on, so breaking it silently would break something outside your change. For
   example: `npm run test -- src/app/workflow.test.ts` runs one test file
   with Vitest (the project's test runner) instead of the whole suite, which
   is faster while you're iterating.
4. **Run `npm run verify` before you finish.** [CONTRIBUTING, Development]
   This one command chains together everything the project checks
   automatically:
   - lint — ESLint (JavaScript/TypeScript rules) and Stylelint (CSS rules)
     checked without running the code
   - the source-size and duplication gates — limits on file size and on
     copy-pasted code
   - unit and artifact tests — the Vitest suite plus the Node-based
     build/CI fixture tests
   - architecture boundaries — the import-direction checker described in
     [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
   - TypeScript and the production build
   - bundle budgets — limits on how much JavaScript the app ships to a
     browser

   A clean `npm run verify` run is the baseline every change needs before
   review.
5. **Run `npm run build:pages` when you change routes, public assets, build
   output, or Pages configuration.** [CONTRIBUTING, Development] This builds
   the app the way it is actually deployed — under the GitHub Pages base path
   — and validates that build, which the plain `npm run verify` build does
   not do.
6. **Run `npm run test:e2e` for rendered workflow, persistence, responsive,
   or browser changes.** [CONTRIBUTING, Development] This is the end-to-end
   (e2e) suite: it drives a real, built copy of the app in an actual browser
   with Playwright, rather than testing functions in isolation. Install the
   browsers once with `npx playwright install chromium webkit`.

Two more commands round out the toolbox: `npm run lint:fix` applies the
automatic fixes ESLint and Stylelint know how to make, and `npm run
test:build` runs the manifest and CI fixture tests on their own — a subset of
what `npm run verify` already runs. [CONTRIBUTING, Development]

**How CI reuses your build.** CI (continuous integration — the automated
checks GitHub runs on every push and pull request) tests both the plain
(root) base and the Pages base, runs the Playwright suite, and then reuses
that same build output — an *artifact*, in CI terms: the files one job
produces and hands, unrebuilt, to a later job — in the `pages` and `deploy`
jobs. [CONTRIBUTING, Development] Don't add a second install or build step to
`pages`; it exists only to validate the artifact it is given.

## Docs-only changes

If your change only touches documentation, you don't need the full gate
above. [CONTRIBUTING, Development] Check that links still work and paths are
correct, and run `git diff --check` — Git's built-in check for whitespace
problems in a diff, such as trailing whitespace or a missing final newline.

Skip the full test/build gate unless your change touches the runtime-imported
research Markdown, or restates a claim whose implementation should be
rechecked. [CONTRIBUTING, Development]

## Rules you must not break (product)

These apply no matter how small the change is. [CONTRIBUTING, Product
constraints]

- **Keep records local** unless a separately reviewed feature changes that
  boundary.
- **Keep playback finite, supervised, voluntary, muted by default, and free
  of automatic replay.** A scene ends on its own, and the app never plays
  again by itself.
- **Treat earlier progress as a restart reminder, not a resume point.**
  Record a comparison run — an observed A/B pairing between two variants of a
  scene — as one observed side at a time. Compatible current A/B runs may
  link automatically, but never in a way that implies a winner or a measured
  preference.
- **Treat looking, tracking, approaching, and pouncing as attention** — never
  as proof of enjoyment, benefit, or preference. This is the same line
  [PRODUCT.md](PRODUCT.md) draws from the research review, and it has to hold
  in code and data structures, not only in copy.
- **Don't add:** breed modes, engagement scores, automatic profiles,
  diagnostic claims, universal display prescriptions, ultrasonic audio, or
  intensity escalation.
- **Preserve:** keyboard operation, visible focus, focus restoration,
  reduced-motion support, and the tablet and television modes.

## Local data and runtime rules

The persistence layer carries its own rules, because the data involved is
private household observation data. [CONTRIBUTING, Local data and runtime]

- **Keep the schema-v2 contract** — the current shape and store list of the
  stored data, described in full in
  [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — **and the 5 MiB UTF-8
  pretty-printed backup limit.** Use the shared capacity and serialization
  helpers already in `src/local-data/`, and validate inside the transaction —
  the database's all-or-nothing unit of work — before writing, so a rejected
  write can never leave partial data behind.
- **Ordinary history writes should scale with the records that changed**, and
  must never clear a store outright; only a confirmed import may replace all
  stores. Preserve oversized records, non-growing updates, deletion, and the
  explicit recovery-export path (also described in
  [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)) — none of these should
  silently drop or shrink data that is already over a limit. A capacity
  rejection must keep the in-progress observation draft open, and must not
  mark IndexedDB as degraded — a capacity error and a broken database are
  different failures, and the app must not confuse them.
- **Progress callbacks keep precise elapsed time in a ref** — a React value
  that can change without triggering a re-render — **while React itself only
  follows the displayed second and phase.** A paused Canvas host (the
  browser-side renderer) schedules no frames, and a visibility change, such
  as switching browser tabs, must never resume playback automatically.

## Where code goes

Follow [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the complete picture;
as a quick reference: [CONTRIBUTING, Module placement]

- Authored scene material — the content that defines the five scenes — goes
  in `src/catalogue/model`.
- Deterministic rules — logic that always produces the same output from the
  same input — go in `src/encounter/engine`.
- Browser renderer code goes in `src/encounter/runtime`.
- Storage and JSON migration code goes in `src/local-data`.

Keep `src/app` as composition only. It wires the other modules together; it
must not become a second source of domain or persistence rules that
duplicates logic those modules already own.

## Opening a pull request

Describe the user-visible change, the tests you ran, and any impact on
screenshots, storage, privacy, or research claims. [CONTRIBUTING, Pull
requests] If your change adds a new scientific claim, update both
[docs/research/feline-perception.md](docs/research/feline-perception.md) and
[`docs/research/evidence-ledger.csv`](docs/research/evidence-ledger.csv)
with a stable source record, so the claim can be traced back to evidence.

Use synthetic — made up, not real — local records in browser tests and
screenshots. Don't commit or upload real household exports, real names beyond
the authored referee vocabulary (Arri, Ozzy, and Mika), or free-form private
notes.

By submitting a contribution, you agree it may be distributed under the
repository's MIT License. Don't submit third-party assets or research content
unless its provenance — origin and rights history — and redistribution terms
are documented and compatible with that license.

## Glossary

- **Artifact (CI sense).** The build output one CI job produces and hands,
  unrebuilt, to a later job — for example, the tested Pages build that the
  `pages` and `deploy` jobs reuse.
- **Bundle / manifest / budget.** A *bundle* is the JavaScript a browser
  downloads to run the app. A *manifest* is a generated listing of which
  files depend on which. A *budget* is the size limit checked against that
  listing.
- **Canvas.** The browser's built-in 2D drawing surface; the renderer Catflix
  starts with before any optional upgrade.
- **CI (continuous integration).** The automated checks GitHub runs on every
  push and pull request.
- **Degraded mode (temporary-memory mode).** The fallback used when
  IndexedDB can't open: data lives only in memory for the life of the page,
  and import/export are turned off so temporary data can't be mistaken for
  durable data.
- **Dependency cycle.** A chain of imports that loops back on itself (module
  A imports B, and B imports A); the architecture checker rejects these.
- **Deterministic.** Always producing the same output from the same input.
- **e2e (end-to-end) tests.** Tests that drive a real, built copy of the app
  in an actual browser, rather than testing isolated functions.
- **ESLint / Stylelint.** The project's JavaScript/TypeScript linter and CSS
  linter. *Lint* means checking code against a set of rules without running
  it.
- **GitHub Pages.** The static-site hosting GitHub provides directly from a
  repository; this project's deployed base path is `/catflix/`.
- **Import direction.** The rule for which modules may import which other
  modules, so that lower-level modules never depend on higher-level ones. See
  [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
- **IndexedDB.** The browser's built-in database for storing structured data
  on the user's own device.
- **KiB / MiB.** Kibibyte and mebibyte, the binary units behind "kilobyte"
  and "megabyte." 1 MiB is about 1.05 MB, and 1 KiB is about 1.02 kB.
- **Module boundary.** The rule that one kind of code — persistence,
  simulation, and so on — lives in exactly one part of the codebase.
- **Observable contract.** Behavior of a module that something else — another
  module, or a person using the app — depends on, so changing it carelessly
  can break something outside the change itself.
- **Playwright.** The browser-automation tool the e2e suite uses.
- **Provenance.** A record of where something came from and what rights apply
  to it — used here for both research sources and non-code assets.
- **Recovery export.** An explicit, separately named download of data that is
  already over the normal import limits, so it isn't lost even though it
  can't be re-imported the normal way.
- **Referee notes.** Dated, descriptive notes about one of the three
  household cats (Arri, Ozzy, Mika).
- **Schema v1 / v2.** Version 1 and version 2 of the shape — fields and
  stores — that stored data follows.
- **Store.** One named collection of records inside an IndexedDB database,
  comparable to a table.
- **Tablet mode / passive-television mode.** The two playback contexts:
  tablet (touch) mode accepts target contacts; passive-television (watch-only)
  mode suppresses all scene input.
- **Transaction / atomic.** A transaction is a group of database operations
  that either all succeed together or all fail together. An operation
  described as atomic can't be left half-done.
- **Vitest.** The project's unit test runner.
