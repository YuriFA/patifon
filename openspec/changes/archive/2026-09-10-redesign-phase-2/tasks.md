# Tasks: redesign-phase-2

## 1. Theme tokens (Warm Earth)

- [x] 1.1 Retoken `src/styles/main.css`: teal accent, warm beige surfaces, ink text, new transport-strip tokens; sweep component styles to token-only values; transitional debt for scrobbling/recommendations accepted (design.md, Decision 6). Verify: `npm run build` green; visual spot-check library + radio against the Warm Earth draft.
- [x] 1.2 Restyle the transport strip to the dark variant (background, border, waveform strip colors) per the draft; canvas colors (waveform strip, columns renderer, meter) resolve the accent token at init. Verify: visual check against the draft's bottom bar.

## 2. Area mode model

- [x] 2.1 Bridge: `areaMode` signal module (`src/visualizer/area-mode.ts`, `lyrics | vinyl | visualizer`) with `visualization-mode` persistence (default `visualizer`); `setAreaMode` action. Verify: `npm run typecheck` green.
- [x] 2.2 `AreaTabs` island: three buttons top-right with `aria-pressed`, bound to the signal; mounted in `index.html`; the karaoke badge is deleted, the bars/MilkDrop toggle and MilkDrop preset-skip stay in the corner row gated to the VISUALIZER tab. Verify: `npm run test:e2e` for rewritten selectors.

## 3. Ownership handoff

- [x] 3.1 Area writers (lyrics view, vinyl deck, visualizer canvases) follow the active `areaMode`; the outgoing renderer is cleared on tab switches; radio/stopped clear rules unchanged. Verify: `npm run test:e2e` handoff scenarios (library -> radio, tab switching).

## 4. Vinyl mode

- [x] 4.1 Deck island (DOM/CSS): plinth, platter, center label, tonearm; rotation via `animation-play-state` on `isPlaying`, tonearm transform transition; visible only in VINYL mode with a library track; clears on radio takeover. Verify: `npm run test:e2e` (deck follows playback state, radio clears).
- [x] 4.2 Deck start/stop button: toggles playback like transport play/pause; keyboard reachable (`aria-label`); state reflects `isPlaying`. Verify: `npm run test:e2e` (start/stop scenario).
- [x] 4.3 e2e: VINYL tab available and functional without WebGL2 (init script strips `webgl2` contexts). Verify: `npm run test:e2e` (tabs work without WebGL2 scenario).

## 5. Playback rate

- [x] 5.1 Player: clamped `playbackRate` setter (0.5..2) pinning `defaultPlaybackRate` so the rate survives track changes; `track:ratechange` forwarded; bridge signal; radio unaffected per spec. Verify: `npm run test:e2e` (rate persists across tracks, radio unaffected).
- [x] 5.2 Pitch fader: native vertical range input, -8..+8 display, linear mapping `1 + value * 0.0625`, keyboard steps, shows current value, writes the player rate. Verify: `npm run test:e2e` (fader changes speed, keyboard steps).

## 6. Lyrics tab

- [x] 6.1 Lyrics module: panel visibility follows `areaMode === "lyrics"`; resolving for the already-playing track on tab entry; muted empty state when no lyrics; karaoke badge path deleted (`karaoke-enabled` key no longer read). Verify: `npm run test:e2e` (tab switch shows lyrics, empty state, other tabs keep rendering).

## 7. Now playing panel

- [x] 7.1 Transport panel: NOW PLAYING label + title - artist from bridge signals, cleared on stop and radio; mini meter canvas from the existing analyser (no second AnalyserNode). Verify: `npm run test:e2e` (panel follows track, clears on stop, radio mode shows no library content).

## 8. Verification

- [x] 8.1 Full matrix `npm run lint && npm run typecheck && npm run format:check && npm run build && npm run test:e2e`. Verify: exit 0, 106/106 e2e.
- [x] 8.2 Manual browser pass against the Warm Earth draft: tab switching round trip, deck start/stop and pitch while listening, lyrics empty state, now-playing panel, theme sweep of library/transport; waveform strip and columns renderer re-colored from tokens. Verify: screenshots noted in the session summary.

## Implementation notes

- The bars/MilkDrop toggle badge was kept (not folded into the tabs): it
  stays the VISUALIZER tab's renderer sub-choice per the visualizer spec,
  hidden outside that tab and without WebGL2.
- Lyrics e2e requests-count assertions now use `expect.poll`: the panel
  shows (loading/empty state) before the fetch dispatches, so immediate
  equality raced the network call.
- Deck start/stop carries an `aria-label` - the glyph text content would
  otherwise win the accessible-name computation over `title`.
- Canvas colors cannot read CSS custom properties; the waveform strip and
  the columns renderer resolve `--accent`/`--text-faint` once at init.
