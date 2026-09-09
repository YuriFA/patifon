# Tasks: butterchurn

## 1. Mode controller

- [x] 1.1 AudioPlayer: public `audioContext` getter (returns the lazy context, null before first play). Verify: `npm run typecheck` green.
- [x] 1.2 Mode state in `src/visualizer/`: `bars | milkdrop` persisted in localStorage (`visualizer-mode`), exactly one renderer's loop active, idle canvas hidden; refactor the columns loop behind the same controller without behavior change. Verify: `npm run test:e2e` green (existing visualizer behavior intact).
- [x] 1.3 Overlay controls in the visualization area: mode toggle (always, when WebGL2 available) and preset skip (MilkDrop only), styled like the radio badge family. Verify: `npm run build` green.

## 2. Butterchurn engine

- [x] 2.1 Dev dependencies `butterchurn` + `butterchurn-presets`; lazy dynamic imports on first activation; WebGL2 probe `src/visualizer/butterchurn.ts` hides the mode control when unsupported (stub `getContext` in e2e to emulate). Verify: `npm run build` green (separate chunk emitted).
- [x] 2.2 Engine lifecycle: create visualizer on the player's context + existing AnalyserNode, start/stop rAF loop, preset rotation timer + `skipPreset()`, full teardown without loop leaks (switch modes repeatedly). Verify: `npm run test:e2e` green.
- [x] 2.3 Exclusion rules: `shouldDraw` predicate (radio, lyrics) pauses the loop; radio takeover and playback stop clear the WebGL canvas. Verify: `npm run test:e2e` green.

## 3. Spec tests

- [x] 3.1 Spec scenarios to e2e tests: enabling MilkDrop stops columns and shows the WebGL canvas; mode survives reload; switch back to bars; preset skip loads next; lyrics panel pauses and resume redraws; radio takeover clears; no-WebGL2 hides the control. Verify: `npm run test:e2e` green.

## 4. Verification

- [x] 4.1 Full matrix `npm run lint && npm run typecheck && npm run format:check && npm run build && npm run test:e2e`. Verify: exit 0.
- [x] 4.2 Manual pass: real browser, music playing - switch to MilkDrop, let several presets rotate, skip one, open lyrics (loop pauses, resumes on close), switch to radio (clears), switch back to bars (columns resume); reload keeps the mode. Verify: checklist noted in the change summary.

## 5. Karaoke toggle

- [x] 5.1 Karaoke badge in the controls row: lyrics module owns the display preference (`karaoke-enabled` in localStorage, default on), off keeps the panel hidden and the active mode rendering, enabling mid-track resolves the playing track. Verify: `npm run test:e2e` green.
- [x] 5.2 Controls row stays visible without WebGL2 (mode and skip hide individually); badge gets a dim backing for legibility over bright scenes. Verify: `npm run build` green.
- [x] 5.3 lyrics delta spec (karaoke display toggle) and design decision 8; e2e: toggle hides/shows the panel, preference persists across reloads, no-WebGL2 keeps the karaoke badge. Verify: `npm run test:e2e` green.
