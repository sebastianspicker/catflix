# Contributing

Catflix is preparing for its first public alpha. Keep changes narrow, evidence-backed, and consistent with the product and safety boundaries in `PRODUCT.md`.

## Development

1. Use the repository Node.js version from `.nvmrc`.
2. Install dependencies with `npm ci --ignore-scripts`.
3. Run `npm run verify` for unit tests, TypeScript, production build, and the
   bundle budget.
4. Run `npm run build:pages` when changing routes, public assets, build output,
   or Pages configuration.

## Product constraints

- Keep all records local unless a separately reviewed feature explicitly changes that boundary.
- Keep playback finite, supervised, voluntary, muted by default, and free of automatic replay.
- Treat earlier progress as a restart reminder, not resumable playback. Record a
  comparison run as one observed side at a time; do not imply a measured
  preference or a complete two-sided observation.
- Treat looking, tracking, approaching, and pouncing as observations of attention, not proof of enjoyment, benefit, or preference.
- Do not add breed modes, engagement scores, automatic profiles, diagnostic claims, universal display prescriptions, ultrasonic audio, or intensity escalation.
- Preserve keyboard operation, visible focus, focus restoration, reduced-motion support, and the tablet and television modes.

## Pull requests

Describe the user-visible change, tests run, screenshot impact, storage or privacy impact, and any research claim added or changed. New scientific claims must update both `docs/research/feline-perception.md` and `docs/research/evidence-ledger.csv` with a stable source record.

By submitting a contribution, you agree that it may be distributed under the repository's MIT License. Do not submit third-party assets or research content unless their provenance and redistribution terms are documented and compatible with the repository.

## Module placement

Follow [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). In particular, put authored
scene material in `src/catalogue/model`, deterministic rules in
`src/encounter/engine`, browser renderer code in `src/encounter/runtime`, and
storage or JSON migration in `src/local-data`. Keep `src/app` as composition,
not a second source of domain or persistence rules.
