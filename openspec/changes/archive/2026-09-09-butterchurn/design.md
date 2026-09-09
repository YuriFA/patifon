# Design: butterchurn

## Context

The visualizer is a single function: `startVisualizer(player, canvas,
shouldDraw)` runs a rAF loop drawing frequency columns through
`Analyser.updateData()`; `shouldDraw` gates on `!isRadioMode() &&
!isLyricsVisible()` and a radio takeover clears the frame. The audio graph
is `MediaElementSource -> EQ filters -> Gain -> Analyser -> destination`;
AudioPlayer exposes `analyser` (the AnalyserNode wrapper) but not the
AudioContext itself. Butterchurn's API: `createVisualizer(audioContext,
canvas, { width, height })`, `connectAudio(audioNode)`, `loadPreset(preset,
blendTime)`, `renderVisualizer()` per frame; presets come from the
`butterchurn-presets` package (`getPresets()`). Requires WebGL2.

## Goals / Non-Goals

**Goals:**

- A second render mode with an explicit user switch, persisted; lazy
  dependency; clean coexistence with the columns renderer under the same
  exclusion rules.

**Non-Goals:**

- No preset search UI, favorites, or custom preset editing - auto-rotation
  plus skip is the whole control surface for v1.
- No VR/tilt extras, no FPS tuning surface (defaults from the library).
- No changes to radio or lyrics behavior.

## Decisions

1. **Layered canvases, one active.** A second `<canvas class="visualizer__webgl">`
   sits inside the existing `.audio_visualize` container above the 2D
   canvas. Mode state (`bars | milkdrop`) picks which renderer's loop runs;
   the idle canvas is hidden (`display: none`), so "exactly one mode draws"
   is structural, not discipline.
2. **AudioPlayer exposes the context.** `get audioContext()` returns the
   lazily created context (null before the first play, like `analyser`).
   Butterchurn taps the EXISTING AnalyserNode via `connectAudio` - the
   graph topology is untouched; no second analyser, no extra gain.
3. **Lazy chunk.** `import("butterchurn")` + `import("butterchurn-presets")`
   on first MilkDrop activation; Vite splits it out of the main bundle. The
   presets package is large - same chunk, needed together anyway.
4. **Engine wrapper owns lifecycle.** `src/visualizer/butterchurn.ts`
   encapsulates: WebGL2 capability probe (`canvas.getContext("webgl2")`),
   lazy init (create visualizer, connect analyser, load first preset),
   `start()/stop()` of the rAF loop, preset rotation timer, `skipPreset()`,
   and full teardown (cancel rAF, clear rotation timer, release the
   context) - switching modes twice must not leak loops (the player already
   had one such bug class with source nodes).
5. **Mode UI: minimal overlay controls.** Two small buttons anchored in the
   visualization area's corner (mode toggle, preset skip - the latter
   visible only in MilkDrop mode), styled like the radio LIVE badge
   family. Keyboard shortcuts stay out of v1 (media keys are taken by
   media-session).
6. **Persistence:** `localStorage` key `visualizer-mode` (a single enum
   string - same tier as the token decision in scrobbling; not worth an
   IDB store). Invalid/absent values fall back to `bars`.
7. **shouldDraw composition.** The existing `shouldDraw` predicate gates
   both loops; on transition to a blocked state the MilkDrop engine
   `stop()`s (loop paused, no scene updates) and on radio takeover the
   canvas is cleared - the columns renderer's exact rules, implemented once
   in the mode controller rather than duplicated per engine.
8. **Karaoke toggle.** The lyrics panel takes the area from the visualizer
   while shown (existing exclusion rule), which in MilkDrop mode reads as a
   black screen with text. Rather than weakening the exclusion rule, the
   panel's visibility becomes a user choice: a karaoke badge in the controls
   row toggles the display, the preference persists in localStorage
   (`karaoke-enabled`, the scrobbling "1"/"0" convention, default on), and
   with karaoke off the panel never shows so the active mode keeps rendering.
   The badge is owned by the lyrics module and works without WebGL2.

## Risks / Trade-offs

- **WebGL2 in CI**: headless Chromium renders via SwiftShader - good enough
  for "canvas exists and loop runs" assertions; deep pixel assertions are
  off the table, the e2e covers structure and state, not scene beauty.
- **Bundle weight**: butterchurn + presets is the heaviest dependency in
  the app; the dynamic chunk keeps first-load untouched (the PWA precache
  list will grow - acceptable, precache is not size-capped today).
- **Preset quality variance**: auto-rotation picks from the full pack;
  random order with no curation - acceptable for v1, curation lists are a
  later refinement.
- **Library API drift**: butterchurn is stable but small (1.x); the engine
  wrapper is the only module importing it, pinning the surface to four
  calls.
