# Catflix

Catflix is a local-first catalogue of five finite, supervised visual encounters for cats. It combines an editorial watchlist, explicit setup checks, deterministic interactive scenes, descriptive observation notes, and a research record that separates observable attention from claims about enjoyment or welfare.

![Catflix catalogue](docs/screenshots/catalogue-desktop.png)

Catflix is under active development; no public release has been tagged.

## What works

- Five authored scenes with finite durations and visible endings
- Tablet-touch and passive television playback modes
- Mandatory device, cable, exit, and supervision checks before playback
- Local queue, progress reminders, settings, observations, one-at-a-time comparison runs, import, and export
- Theme, subject, and motion filters with recoverable empty states
- Standard and low scene-motion settings independent of operating-system reduced motion
- A 60-source research baseline with a source-level evidence ledger
- Keyboard-operable dialogs, focus restoration, and responsive layouts

Catflix does not rank cats, infer preferences automatically, diagnose health, claim therapeutic benefit, or treat attention as enjoyment. Playback starts muted, never auto-replays, and never starts from the queue without an owner action.

## Run locally

Requirements: the Node.js version in [`.nvmrc`](.nvmrc) and npm.

```bash
npm ci --ignore-scripts
npm run dev
```

Open the URL printed by Vite. All application records remain in the browser's local storage layer. No runtime network request is required for the catalogue, playback, or local record workflow. External cited-source links in the research view require network access when opened.

## Verify

```bash
npm run verify
npm run build:pages
```

`npm run verify` runs unit tests, TypeScript, the production build, and the
bundle budget. `npm run build:pages` additionally validates the GitHub Pages
artifact built with the `/catflix/` base path.

## Screenshots

The checked-in images are static documentation assets. See [docs/SCREENSHOTS.md](docs/SCREENSHOTS.md) for the gallery.

## Project map

- `src/domain/`: stable scene, playback, and variant vocabulary
- `src/catalogue/model/`: five authored scene aggregates, provenance, validation, and compiled manifest/runtime projections
- `src/encounter/engine/`: deterministic encounter rules; `runtime/` adapts them to Canvas and lazy Phaser; `ui/` owns the interaction surfaces
- `src/local-data/`: versioned JSON, IndexedDB v2, and the explicit temporary-memory fallback
- `src/app/` and `src/App.tsx`: workflow and application composition
- `src/research/`, `src/ui/`, and `src/styles/`: research route, shared presentation primitives, and CSS
- `docs/research/`: maintained scientific baseline and source ledger
- `assets/masters/`: source artwork and its generation record retained for provenance and future mastering
- `public/assets/`: browser-delivery artwork

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the dependency direction,
data flow, placement rules, and stable application contracts.

## Research and safety

The [scientific foundation](docs/research/feline-perception.md) is the maintained interpretation of the evidence. The [evidence ledger](docs/research/evidence-ledger.csv) records the 60 peer-reviewed sources. Product and curator copy must preserve the distinction between sensory capacity, attention, voluntary preference, and welfare.

Keep the device stable, protect cables, leave an unobstructed exit, supervise continuously, and stop after collision, repeated hard strikes, marked startle, freezing, hiding, distressed vocalization, redirected aggression, persistent behind-screen searching, loss of balance, or behavior the observer considers abnormal.

## Contributing and security

Read [CONTRIBUTING.md](CONTRIBUTING.md) before proposing changes. Report security or privacy concerns using [SECURITY.md](SECURITY.md).

## License

Catflix software and original project documentation are available under the [MIT License](LICENSE). Bundled project-generated assets retain the terms and provenance recorded in the authored catalogue; see [NOTICE.md](NOTICE.md).
