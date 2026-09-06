# Design: migrate-toolchain

## Context

See proposal.md - Why. Current state worth knowing for this design:

- Entry chain: `src/index.html` loads `./assets/scripts/main.js` (browserify
  bundle produced by gulp into `src/static/assets/`). Sources live in
  `src/scripts/` (7 modules + 5 utils), styles in `src/styles/main.scss` +
  SCSS helpers.
- Each `Track` owns its own `HTMLAudioElement`, forwards every `on*` media
  event through a custom `EventEmmiter`. `AudioPlayer.play()` subscribes
  `canplay`/`ended`/... on the track every time it is called while unbuffered;
  `_startPlayback()` only unsubscribes `canplay`. Consequences: duplicate
  `ended` handlers accumulate (each fires `playNext`, skipping tracks), and
  `createMediaElementSource()` runs on every `_startPlayback` with no
  disconnect (node leak).
- The `AudioContext` is created in the constructor (no user gesture) and never
  resumed - suspended contexts under the autoplay policy mean silence.
- Mute is implemented via the media element's `muted` property; volume via a
  `GainNode`; the volume-setter's range check `value > 1 && value < 0` is
  always false.
- Bounds handling for next/prev relies on `getTrack()` throwing and resetting
  the index to 0 (wrap-around). Preserve this observable behavior.

## Goals / Non-Goals

**Goals:**

- A supported, installable toolchain: Vite 8, TypeScript strict, oxlint,
  oxfmt, Playwright - with the 2017 stack fully deleted.
- Observable behavior parity per the four capability specs.
- Audio graph correctness: one context, resumed on gesture; one media element
  and one source node for the whole player.

**Non-Goals:**

- No new features, no UI redesign, no framework, no CSS redesign beyond a
  mechanical SCSS-to-CSS translation.
- No CI pipeline; local verification commands only.
- No browser support matrix beyond Vite's default targets (Baseline Widely
  Available); e2e runs Chromium only.

## Decisions

1. **Project layout** follows Vite conventions:

   - `index.html` at repo root (moved from `src/index.html`), loading
     `/src/main.ts` as a module script.
   - `src/scripts/*` becomes `src/` TypeScript modules: `src/main.ts`,
     `src/audio-player.ts`, `src/playlist.ts`, `src/track.ts`,
     `src/equalizer.ts`, `src/analyser.ts`, `src/utils/*`.
   - `src/styles/main.scss` + helpers become a single `src/styles/main.css`
     using native nesting and custom properties; SCSS helpers are folded in.
   - `src/static/assets/images` moves to `public/assets/images` (Vite public
     dir, served at `/`).
   - `gulp/`, `gulpfile.js`, `.babelrc`, `.eslintrc` are deleted.

2. **Single media element, single source node.** `AudioPlayer` owns ONE
   `HTMLAudioElement` for its lifetime. Switching tracks changes `element.src`
   only. The `MediaElementAudioSourceNode` is created once (first gesture) and
   reused. `Track` shrinks to plain metadata (id, src, name) - no element, no
   event forwarding; the player attaches media event listeners to its element
   once in the constructor. This removes the per-track source leak, the
   duplicate-subscription leak, and the EventEmmiter-on-Track machinery in one
   move while keeping observable behavior identical. Alternative considered:
   keep per-track elements and cache one source node per element (WeakMap) -
   more moving parts for zero observable benefit.

3. **Autoplay handling.** The `AudioContext` is created lazily on the first
   Play activation inside the click handler (gesture task). On every play
   attempt: if `ctx.state === 'suspended'`, call `resume()` (awaited) before
   `element.play()`. Also observe `statechange` to keep UI truthful. No
   auto-play on page load.

4. **EventEmitter** keeps its tiny on/off/emit API; class renamed to
   `EventEmitter` (fix the `EventEmmiter` typo), used by `AudioPlayer` only.
   Track no longer extends it.

5. **Volume/mute semantics preserved.** Volume 0..1 via `GainNode.gain`
   (clamped, replacing the broken check); volume 0 keeps legacy behavior of
   muting the element; mute/unmute toggles `element.muted`. Wheel steps over
   the volume control stay at their current step size (read from
   `onwheelUpdateVolume` during implementation).

6. **TypeScript** strict everywhere; `tsc --noEmit` as the `typecheck` script
   (not oxlint's experimental `--type-check`). Web Audio / DOM types from
   `lib.dom`.

7. **Lint/format**: `oxlint` with a minimal `.oxlintrc.json` (correctness +
   suspicious categories, no style rules); `oxfmt` via `.oxfmtrc` with
   defaults. Accepted risk: oxfmt is 0.x beta - config churn is possible;
   swapping to Prettier later is mechanical.

8. **E2E without binary fixtures**: Playwright serves a generated sine-wave
   WAV via route interception (built in memory in the test), so no audio file
   is committed and tests are deterministic. Assertions observe the player
   state through the DOM (playing/paused class or title attributes) and
   `page.evaluate`, never "audibility". Chromium only.

## Risks / Trade-offs

- **oxfmt beta churn** - accepted; escape hatch documented above.
- **Playwright + autoplay policy**: a synthetic click is a valid user gesture;
  if headless Chromium still refuses audio start, run with
  `--autoplay-policy=no-user-gesture-required` as a test-only flag - the spec
  behavior (resume on gesture) stays implemented in product code.
- **Visualizer parity is structural, not pixel-perfect**: assert it renders
  continuously while playing, freezes when paused, and resizes with the
  window - matching the `visualizer` spec, not a screenshot diff.
- **SCSS-to-CSS translation** may shift minor computed styles (e.g. mixins
  expanding differently); a visual pass in the dev server covers it.
