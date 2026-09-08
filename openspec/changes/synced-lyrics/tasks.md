# Tasks: synced-lyrics

## 1. LRCLIB client and cache

- [ ] 1.1 Bump the shared IndexedDB database to version 3 with a `lyrics` store keyed by lowercase `artist\ntitle`; extend `src/utils/idb.ts` so upgrade creates the new store alongside `tracks` and `stations`. Verify: `npm run typecheck` green; manual check that an existing v2 database upgrades without losing data.
- [ ] 1.2 LRCLIB client `src/lyrics/api.ts`: `GET /api/v1/lyrics/get` with `artist_name`, `track_name`, `album_name` (when known), `duration`; `X-User-Agent` header; 404 resolves to null; 429 waits once per `Retry-After` capped at 10s; other failures resolve to null. Verify: `npm run typecheck` green.
- [ ] 1.3 LRC parser `src/lyrics/lrc.ts`: parse `[mm:ss]` and `[mm:ss.xx]` timestamps (multiple per line) into sorted `{ time, text }` lines; keep plain text fallback. Unit-testable pure module. Verify: `npm run typecheck` green.
- [ ] 1.4 Cache read/write through the `lyrics` store; fetch-on-miss with one in-flight request per track activation (`AbortController` on change). Verify: `npm run test:e2e` green.

## 2. Lyrics panel UI

- [ ] 2.1 Lyrics panel markup and styles in the visualization area (scrollable line list, active-line highlight, hidden by default); panel shown only when lyrics exist for the playing library track. Verify: `npm run build` green.
- [ ] 2.2 Playback wiring: on library track activation fetch/cache lyrics; `track:timeupdate` drives the active line via binary search; auto-scroll centers the active line only when it changes; click-to-seek on a synced line; plain text renders without highlight or seek. Verify: `npm run test:e2e` green.
- [ ] 2.3 Area rules: the visualizer gate stays off in radio mode and additionally while the lyrics panel is visible (canvas cleared, resumes when the panel hides); panel clears on stop, error, and radio takeover. Verify: `npm run test:e2e` green.
- [ ] 2.4 Failure states: no lyrics (404), request failure, and empty artist/title metadata all keep the panel hidden and never surface an error; radio playback never requests lyrics. Verify: `npm run test:e2e` green.

## 3. Spec and docs

- [ ] 3.1 Spec scenarios to tests: fetch on playback with metadata; cache reuse offline (no second request); highlight follows position; click-to-seek; plain text fallback; no lyrics hides the panel; radio/stop clears the panel. Verify: `npm run test:e2e` green.

## 4. Verification

- [ ] 4.1 Full matrix `npm run lint && npm run typecheck && npm run format:check && npm run build && npm run test:e2e`. Verify: exit 0.
- [ ] 4.2 Manual pass with real network: a track with known LRCLIB lyrics shows synced highlight and click-to-seek; a track without lyrics shows no panel; repeat play hits no API (devtools network); radio mode still clears everything. Verify: checklist noted in the change summary.
