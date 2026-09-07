# Tasks: media-session

## 1. Player surface

- [x] 1.1 Add `get duration(): number` to `AudioPlayer` (element duration, 0 when unknown). Verify: `npm run typecheck` green.

## 2. Media session module

- [x] 2.1 Add `src/media-session.ts`: feature detection, `initMediaSession(player, metadataProvider)`, action handlers (play/pause/previoustrack/nexttrack/seekto), playback state on `track:play`/`track:pause`, `setPositionState` on `track:timeupdate` (finite positive durations only), try/catch around every registration. Verify: `npm run typecheck` green.
- [x] 2.2 Wire in `src/main.ts`: init once at startup with a metadata provider registered by the library layer; provider maps `currentTrackIndex` to the library record reusing the artwork object-URL cache. Verify: `npm run build` green.

## 3. E2e coverage

- [x] 3.1 Add e2e helpers/init script capturing `setActionHandler` calls and exposing them for direct invocation; assert `navigator.mediaSession.metadata` and `playbackState` against real API objects. Verify: metadata assertion passes for a library track with artwork.
- [x] 3.2 Spec scenarios to tests: metadata published for a playing library track (title/artist/album/artwork src); playbackState transitions on play/pause via OS handler invocation; OS next/prev switches the playing row; OS seek-to moves the progress; environment without `navigator.mediaSession` (init script deleting it) boots and plays normally. Verify: `npm run test:e2e` green.

## 4. Verification

- [x] 4.1 Full matrix `npm run lint && npm run typecheck && npm run format:check && npm run build && npm run test:e2e`. Verify: exit 0.
- [x] 4.2 Manual pass in a real Chromium window: OS media controls show metadata/artwork while playing, media keys and lock-screen controls toggle playback. Verify: checklist noted in the change summary.
