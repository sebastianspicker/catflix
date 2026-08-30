# Architecture

Catflix is a single local-first React application. It presents five authored,
finite visual encounters, makes a human owner acknowledge safety controls before
playback, records descriptive household observations, and exposes a sourced
research record. It is not a service platform: it has no account, API, server,
analytics, or cloud-sync layer.

## Modules and direction

```text
domain
  ├── catalogue/model ──┬── catalogue/ui
  │                     ├── encounter/runtime
  │                     ├── encounter/ui
  │                     └── local-data
  └── encounter/engine ─┬── encounter/runtime
                         └── encounter/ui

catalogue/ui, encounter/runtime, encounter/ui, local-data, research, ui, styles
  └── app and App.tsx (composition only)

An indented item may import the item above it; `ui` and `styles` have no
product dependencies.
```

`src/domain` contains stable types and pure rules. `src/catalogue/model`
contains one authored aggregate per scene, asset provenance, validation, and
the manifest and runtime-score projections. `src/encounter/engine` advances deterministic state without
browser, React, Canvas, Phaser, or catalogue lookups. `src/encounter/runtime`
adapts that engine to Canvas first and lazily loads Phaser only when selected.
`src/encounter/ui` contains the player, safety gate, curation, and observation
controls.

`src/local-data` is the one persistence boundary. It owns import/export codecs,
IndexedDB access, the temporary in-memory fallback, and atomic replacement of
stored data. `src/catalogue/ui` renders a catalogue from supplied application
state. `src/research` owns the research route. `src/app` and `src/App.tsx` are
the composition layer: they coordinate workflow state and call module APIs but
do not duplicate their rules. `src/ui` and `src/styles` hold shared interface
primitives and CSS, not domain behavior.

## Data flow

1. Each authored scene aggregate projects to a validated `ContentManifest` and
   deterministic scene-score data in `catalogue/model`.
2. The app selects a manifest and variant, then the safety UI produces a session
   plan.
3. The encounter engine advances the finite session; the chosen runtime renders
   its snapshots and the UI collects owner-confirmed observations.
4. The app writes progress, observations, comparison-run records, settings, and
   provenance through `local-data`.
5. Import/export crosses the boundary only as versioned JSON. Research Markdown
   is rendered separately and may link to DOI, PubMed, and other cited external
   sources; opening those links is the only intentional external navigation.

## Stable external contracts

- Five stable scene IDs and their public asset paths/checksums.
- IndexedDB `catflix-local`, version 2, with seven named stores; schema-v1
  imports migrate to schema-v2 data and exports are schema v2.
- Schema-v1 settings omit `sceneMotionMode`; migration supplies `standard`.
  Schema-v2 keeps the existing sound, reduced-motion, safety-acknowledgement,
  and scene-motion fields for data compatibility, although the current workflow
  changes only scene motion.
- Routes `/` and `/research`, including the `/catflix/` GitHub Pages base path.
- Owner-started, finite, muted-by-default encounters with no automatic replay;
  passive television mode rejects scene contact input.
- Deterministic query options: `seed`, `contrast=enhanced`, and
  `renderer=canvas`.

An earlier-progress card is a reminder and restart entry point, not timeline
resume. A matched-comparison run records one observed side at a time; it does
not imply that both sides were observed or that a preference was established.
The current curator varies only contrast or motion because those dimensions
have operational runtime controls. Imported historical comparison records may
still contain sound or novelty dimensions under the versioned data contract.

## Placement rules

- Add a scene, metadata, or asset provenance in `catalogue/model`, never in a
  renderer or component.
- Add simulation rules in `encounter/engine`; put Canvas or Phaser code only in
  `encounter/runtime`.
- Add browser storage, JSON migration, or record validation in `local-data`.
- Add cross-module workflow only in `app`; feature UI stays with its owning
  module.
- Add shared visual primitives only when they genuinely have more than one
  product consumer. Avoid generic helper directories and compatibility wrappers.

## Deliberate choices

The application is a modular monolith because all user state and rendering live
in one browser tab; separate services or a dependency-injection framework would
add indirection without an external boundary. One scene aggregate compiles into
the manifest and runtime score, preserving one content source of truth. Canvas
is the reliable synchronous renderer; Phaser is an optional implementation
detail, not a second encounter model. Browser storage degradation remains
explicit so a temporary-memory fallback cannot masquerade as durable local data.
