# Contributing

Catflix is preparing for its first public alpha. Keep changes narrow, evidence-backed, and consistent with the product and safety boundaries in `PRODUCT.md`.

## Development

1. Use Node.js `^20.19.0` or `>=22.12.0`.
2. Install dependencies with `npm ci --ignore-scripts`.
3. Run `npm run check` for unit tests, TypeScript, and the production build.
4. Run `npm run test:e2e` for the cross-browser workflow suite.
5. Regenerate documentation screenshots only when the rendered interface changes.

## Product constraints

- Keep all records local unless a separately reviewed feature explicitly changes that boundary.
- Keep playback finite, supervised, voluntary, muted by default, and free of automatic replay.
- Treat looking, tracking, approaching, and pouncing as observations of attention, not proof of enjoyment, benefit, or preference.
- Do not add breed modes, engagement scores, automatic profiles, diagnostic claims, universal display prescriptions, ultrasonic audio, or intensity escalation.
- Preserve keyboard operation, visible focus, focus restoration, reduced-motion support, and the tablet and television modes.

## Pull requests

Describe the user-visible change, tests run, screenshot impact, storage or privacy impact, and any research claim added or changed. New scientific claims must update both `docs/research/feline-perception.md` and `docs/research/evidence-ledger.csv` with a stable source record.

By submitting a contribution, you agree that it may be distributed under the repository's MIT License. Do not submit third-party assets or research content unless their provenance and redistribution terms are documented and compatible with the repository.
