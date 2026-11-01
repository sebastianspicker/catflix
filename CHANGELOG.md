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
- GitHub Actions build and deployment of Pages artifacts
- Contributor and private vulnerability reporting guidance
- Synthesized scene sound with the Web Audio API; sound stays optional, starts
  muted, and is generated locally rather than loading a recording
- The package version and build commit are shown below the catalogue, so bug
  reports can name the build they were made against
- Known issues for alpha testers, linked from the README and the bug form

### Changed

- TypeScript also enforces checked index access, exact optional properties,
  and explicit overrides
- CI pins every action to a commit SHA and no longer cancels in-flight `main`
  deployments
- Closing the observation form with Escape, the close button, or "Finish
  without saving" now asks before discarding the session
- Observation notes and safety events are limited to 20,000 characters in the
  form, matching what can be saved
- The README and architecture guide no longer claim that module boundaries are
  checked automatically
- Comparison observations record the scene-motion mode, and the in-player
  scene-motion toggle is fixed during a comparison run. Exports that contain
  such observations cannot be imported by earlier builds
- The production build validates the authored scene catalogue, so invalid
  scene data stops the build instead of reaching the site
- The PNG poster masters moved to `assets/masters/posters/` and are no longer
  deployed with the site

### Fixed

- Research page table-of-contents links now reach their sections
- Research record corrections: where the shelter TV study measured the
  attention decline, what its five conditions were and which comparisons it
  tested, one sample size, and three PubMed IDs
- The README lists the lengths of all five scenes
- Exports keep their download link alive long enough for every browser
- A failure to load saved records is reported instead of silently stopping
  later saves
- Phaser no longer prints its banner to the browser console
- Repeated touches open a rest window every time the contact limit is reached,
  even while the first reminder is still on screen
- Comparison pairing only joins runs of the same cat, playback mode, and
  scene-motion mode. An open comparison side saved by an earlier build has no
  recorded scene-motion mode, so it no longer pairs; delete it and record both
  sides again
- A failed save no longer switches the app to temporary-memory mode or blocks
  export, and a database connection closed by the browser is reopened
- Pausing stops the Phaser renderer from drawing every frame
- The red string is drawn at the right height by the Phaser renderer on screens
  narrower than 1900 pixels
- Animals that rest or reach the finale show their resting pose instead of
  movement frames
- Watchlist items keep the date they were added, and loading the page no
  longer rewrites the watchlist and asset records

No release has been tagged yet. Until one is, the app reports the package
version (currently 0.2.0) together with the build commit.
