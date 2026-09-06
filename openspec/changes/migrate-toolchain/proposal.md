# Proposal: migrate-toolchain

## Why

The project's 2017 build stack (gulp 3, browserify, Babel 6, node-sass/gulp-sass,
ESLint 3) is dead: node-sass is end-of-life and cannot even install on Node 24,
which blocks every npm operation. On today's browsers the player is also silent:
the AudioContext is never resumed after the user gesture required by the
autoplay policy (Chrome 71+). This change moves the codebase to a supported
toolchain and restores working playback with full behavior parity.

## What Changes

- Replace gulp + browserify + Babel 6 with Vite 8 (dev server + build), native
  ESM entry from `index.html`.
- Convert all source modules (7 files) to TypeScript with `strict: true` from
  day one; type checking via `tsc --noEmit`.
- Replace SCSS with plain modern CSS (native nesting, custom properties); drop
  the sass dependency.
- Replace ESLint 3 + airbnb with oxlint (`.oxlintrc.json`) and adopt oxfmt
  (beta, Prettier-conformant) as formatter.
- Fix playback for the autoplay policy: resume/recreate the AudioContext on
  user gesture, handle `statechange`/`state`.
- Fix the audio graph leak: `createMediaElementSource()` is called per track
  without disconnecting previous sources; move to a single reusable source
  per media element and explicit teardown.
- Remove `console.log` debugging from production code; rename the internal
  `EventEmmiter` class to `EventEmitter`.
- Add Playwright smoke e2e (page loads, track plays after Play click,
  transport controls work) using a generated sine-wave WAV fixture - no binary
  audio committed to the repo.
- **BREAKING** (internal): delete the entire old toolchain - gulp/, gulpfile.js,
  .babelrc, .eslintrc, all gulp/babel/eslint/browser-sync devDependencies.
  Old Node (< 20.19) is no longer supported for development.
- Behavior parity: play/pause/stop/next/prev, volume + mute + wheel control,
  seek via progress bar, 10-band equalizer with all presets, canvas
  visualizer, resize handling - all preserved exactly.

## Capabilities

### New Capabilities

- `playback`: transport and audio graph lifecycle - play/pause/stop, next/prev
  through the playlist, seek, media element feeding the Web Audio graph,
  autoplay-policy compliance (context resumed on user gesture), single-source
  invariant (no leaked source nodes).
- `volume`: master volume get/set with clamping, mute/unmute, wheel-based
  volume adjustment.
- `equalizer`: 10-band peaking equalizer (fixed frequencies 60 Hz to 16 kHz),
  per-band gain clamped to +/-12 dB, named presets, apply/reset.
- `visualizer`: real-time canvas rendering of AnalyserNode data, adapting to
  window resize.

### Modified Capabilities

(none - `openspec/specs/` is empty; this change establishes the baseline)

## Impact

- `package.json`: new devDependencies (vite, typescript, oxlint, oxfmt,
  @playwright/test, @fission-ai/openspec), all 2017 dependencies removed;
  scripts become `dev`/`build`/`preview`/`lint`/`format`/`typecheck`/`test:e2e`.
- `src/`: scripts move from CommonJS-ish browserify ESM to native ESM `.ts`;
  SCSS compiled to plain CSS; `index.html` moves to repo root as Vite entry.
- `gulp/`, `gulpfile.js`, `.babelrc`, `.eslintrc` deleted.
- CI/dev environment: Node >= 20.19 required.
