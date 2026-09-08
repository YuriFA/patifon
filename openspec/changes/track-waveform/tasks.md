# Tasks: track-waveform

## 1. Peaks engine

- [ ] 1.1 Bump IndexedDB to version 5 with a `waveforms` store keyed by track id; typed helpers `loadPeaks`, `savePeaks` in `src/waveform/store.ts` (value: `{ peaks, bucketMs, computedAt }`). Verify: `npm run typecheck` green.
- [ ] 1.2 Peak computation `src/waveform/peaks.ts`: decode `LibraryRecord.file` via `decodeAudioData`, mono-mix, reduce to ~600 min/max buckets; reject cleanly on undecodable containers. Sequential job queue (one decode at a time) with a session in-flight map. Verify: `npm run typecheck` green.
- [ ] 1.3 Import hook: after metadata parse, enqueue peak computation for the new track; import result must not wait for peaks. Verify: `npm run test:e2e` green.

## 2. Waveform strip UI

- [ ] 2.1 Strip rendering `src/waveform/strip.ts`: canvas inside the existing `.progress` container, devicePixelRatio-aware mirrored columns, played-ratio tint, buffer overlay; redraw on ratio change (rAF-coalesced) and resize. Verify: `npm run build` green.
- [ ] 2.2 Visibility rules: library track with peaks -> strip; radio, undecodable and not-yet-computed tracks -> plain progress line; lazy backfill on `track:play` swaps the strip in when peaks land. Verify: `npm run test:e2e` green.
- [ ] 2.3 Seek surface: click and drag on the strip map to the same `player.rewind(ratio)` semantics as the plain slider; buffer display preserved. Verify: `npm run test:e2e` green.

## 3. Spec tests and docs

- [ ] 3.1 Spec scenarios to tests: import produces cached peaks (no re-decode on second play); import survives peak failure; radio keeps the plain line; legacy track gains a wave mid-playback; click/drag seek equivalence. Verify: `npm run test:e2e` green.

## 4. Verification

- [ ] 4.1 Full matrix `npm run lint && npm run typecheck && npm run format:check && npm run build && npm run test:e2e`. Verify: exit 0.
- [ ] 4.2 Manual pass: import a real track (wave appears on first play, instantly on second), seek by click and drag, radio mode keeps the plain line, lyrics panel still replaces the content area. Verify: checklist noted in the change summary.
