# Tasks: radio-mode

## 1. Catalog client

- [x] 1.1 Add `src/radio/api.ts`: mirror list with random pick + failover (session-cached winner), `searchStations(name)` hitting `/json/stations/search` (limit 50, hidebroken, ordered by votes), `reportListen(stationuuid)` fire-and-forget to `/json/url/<uuid>`. Types use `stationuuid`. Verify: `npm run typecheck` green.

## 2. Playback

- [x] 2.1 Add `src/radio/playback.ts`: dedicated `HTMLAudioElement` (not graph-routed), play/pause/stop, element error events surfaced as callbacks, volume/mute applied alongside the library element. Verify: `npm run typecheck` green.
- [x] 2.2 HLS support: dynamic `import("hls.js")` when `url_resolved` is an `.m3u8` playlist (`Hls.isSupported()` gated), engine attached to the radio element and destroyed on stop/switch; direct streams set `element.src`. Verify: `npm run build` green with hls.js as a dependency.
- [x] 2.3 Transport-source abstraction in `src/media-session.ts`: `setActiveSource({ play, pause, metadata } | null)` routing OS actions and publication; library player registers as default, radio activates on play and yields on stop/error. Station metadata (name, favicon, tags) published while a station plays. Verify: `npm run typecheck` green.

## 3. UI wiring

- [x] 3.1 Radio toggle in the library header switching the list between library and stations; shared search box queries the catalog in radio mode (debounced); station rows (favicon placeholder, name, tags, bitrate) with playing highlight; "LIVE" state in the progress area with the slider inert; prev/next no-ops for radio; library track activation stops the station. Verify: `npm run build` green; manual search renders stations in dev.
- [x] 3.2 Failure states: dead stream marks the row with an error indication and resets transport; catalog unreachability shows a visible error state without wiping the previous list. Verify: `npm run build` green.

## 4. E2e coverage

- [x] 4.1 Spec scenarios to tests: catalog search lists stations (mocked radio-browser responses); row click plays the stream (route-fulfilled WAV) with highlight; transport pause/resume and volume apply to the station; listen reported to `/json/url/<uuid>`; station name reaches Media Session metadata; live state replaces the position; dead stream shows the error state; catalog failure shows the error state. Verify: `npm run test:e2e` green.

## 5. Verification

- [x] 5.1 Full matrix `npm run lint && npm run typecheck && npm run format:check && npm run build && npm run test:e2e`. Verify: exit 0.
- [ ] 5.2 Manual pass with real network: search finds real stations, several direct streams play (Chrome), at least one HLS station plays, media keys control the station, dead station shows the error state. Verify: checklist noted in the change summary.

## 6. Saved stations and now-playing display (feedback)

- [x] 6.1 Bump the IndexedDB database to version 2 with a `stations` store; add `idbDelete` and a `src/radio/store.ts` (save/delete/load). Verify: `npm run typecheck` green.
- [x] 6.2 Save/unsave star on station rows; radio mode with empty search shows saved stations; saved state persists across reloads and stays playable. Verify: `npm run test:e2e` green.
- [x] 6.3 Now-playing station card (icon, name, tags) in the visualization area while a station plays or is paused; hidden on stop and during library playback. Verify: visual check in dev.
- [x] 7.1 Feedback round: pin the playing station as a list item with its star (card only in the library view), clear the visualizer frame on stop/radio takeover, stop library playback on station activation, fix the `[hidden]` icon fallback override. Verify: `npm run test:e2e` green; manual pass on the real catalog.
