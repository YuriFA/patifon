# Tasks: redesign-phase-2

## 1. Theme tokens (Warm Earth)

- [ ] 1.1 Retoken `src/styles/main.css`: teal accent, warm beige surfaces, ink text, new transport-strip tokens; sweep component styles to token-only values; transitional debt for scrobbling/recommendations accepted (design.md, Decision 6). Verify: `npm run build` green; visual spot-check library + radio against the Warm Earth draft.
- [ ] 1.2 Restyle the transport strip to the dark variant (background, border, waveform strip colors) per the draft. Verify: visual check against the draft's bottom bar.

## 2. Area mode model

- [ ] 2.1 Bridge: add `areaMode` signal (`lyrics | vinyl | visualizer`) with `visualization-mode` persistence (default `visualizer`); expose a `setAreaMode` action. Verify: `npm run typecheck` green.
- [ ] 2.2 `AreaTabs` island: three buttons top-right of the visualization area with `aria-pressed`, bound to the signal; mount in `index.html`; delete the old badge row (mode toggle + karaoke badge), keep the MilkDrop preset-skip badge visible only in VISUALIZER+MilkDrop. Verify: `npm run test:e2e` for rewritten selectors.

## 3. Ownership handoff

- [ ] 3.1 Area writers (lyrics view, vinyl deck, visualizer canvases) follow the active `areaMode`; outgoing owner's DOM removal flushes before the incoming owner writes (phase-1 flush pattern); radio/stopped clear rules unchanged. Verify: `npm run test:e2e` handoff scenarios (library -> radio, tab switching).

## 4. Vinyl mode

- [ ] 4.1 Deck island (DOM/CSS): plinth, platter, center label, tonearm; rotation via `animation-play-state` on `isPlaying`, tonearm transform transition; visible only in VINYL mode with a library track; clears on radio takeover. Verify: `npm run test:e2e` (deck follows playback state, radio clears).
- [ ] 4.2 Deck start/stop button: toggles playback like transport play/pause; keyboard reachable; state reflects `isPlaying`. Verify: `npm run test:e2e` (start/stop scenario).
- [ ] 4.3 e2e: VINYL tab available and functional without WebGL2 (Chromium context with WebGL2 disabled). Verify: `npm run test:e2e` (tabs work without WebGL2 scenario).

## 5. Playback rate

- [ ] 5.1 Player: `playbackRate` property (clamped 0.5..2) applied to the audio element for library playback; bridge signal `playbackRate`; radio unaffected per spec. Verify: `npm run test:e2e` (rate persists across tracks, radio unaffected).
- [ ] 5.2 Pitch fader: native vertical range input, -8..+8 display, linear mapping `1 + value * 0.0625`, keyboard steps, shows current value, writes the player rate. Verify: `npm run test:e2e` (fader changes speed, keyboard steps).

## 6. Lyrics tab

- [ ] 6.1 Lyrics module: panel visibility follows `areaMode === "lyrics"`; resolving for the already-playing track on tab entry; muted empty state when no lyrics; delete the karaoke badge path. Verify: `npm run test:e2e` (tab switch shows lyrics, empty state, other tabs keep rendering).

## 7. Now playing panel

- [ ] 7.1 Transport panel: NOW PLAYING label + title - artist from bridge signals, cleared on stop, no radio content; mini meter canvas from the existing analyser. Verify: `npm run test:e2e` (panel follows track, clears on stop, radio keeps station card).

## 8. Verification

- [ ] 8.1 Full matrix `npm run lint && npm run typecheck && npm run format:check && npm run build && npm run test:e2e`. Verify: exit 0.
- [ ] 8.2 Manual browser pass against the Warm Earth draft: tab switching round trip, deck start/stop and pitch while listening, lyrics empty state, now-playing panel, theme sweep of library/radio/playlists. Verify: checklist noted in the change summary.
