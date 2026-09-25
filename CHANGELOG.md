# Changelog

Notable changes to Catflix are documented here. This project follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and uses semantic
versioning once a release is tagged.

## Unreleased

### Added

- A `/demo` screenshot tour on the site, plus secret scanning and Dependabot in CI
- Public alpha documentation and a maintained screenshot gallery
- Browser-local history for observations, legacy notes, and comparison links,
  with bounded pagination and individual deletion
- Automatic pairing of compatible canonical contrast and motion A/B runs
- Validated import preview before an atomic seven-store replacement
- MIT licensing for the software and original project documentation
- GitHub Actions verification for unit tests, type checking, architecture
  boundaries, production builds, bundle budgets, and Pages artifacts
- Desktop Chromium and iPad WebKit end-to-end verification in CI
- Contributor and private vulnerability reporting guidance
- Property-based tests for encounter invariants (finite, deterministic, passive
  mode, rest window, no contact escalation) and golden v1/v2 import fixtures
- A declarative architecture boundary config that the checker and the
  documented dependency diagram are both verified against
- Synthesized scene sound with the Web Audio API; sound stays optional, starts
  muted, and is generated locally rather than loading a recording

### Changed

- `npm run verify` runs its independent checks concurrently
- TypeScript also enforces checked index access, exact optional properties,
  and explicit overrides
- CI pins every action to a commit SHA and no longer cancels in-flight `main`
  deployments

No release has been tagged yet.
