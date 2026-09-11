## 1. Engaged transport core

- [x] 1.1 Add `toggle()` to `src/ui/bridge.ts`; move the transport routing verbatim from `transport-controls.tsx` (station -> its playback state machine, idle -> engage library, library -> play/pause). Verify: `tsc --noEmit` passes and the bridge object carries the command.
- [x] 1.2 Move `syncNowPlaying` from `src/main.tsx` into `initBridge`, deriving title/artist from the library record seam. Verify: e2e player now-playing scenarios stay green.
- [x] 1.3 Export `currentRecord()` from `src/library/source.ts`; delete `currentLibraryRecord` from `library/ui.ts`; update lyrics, scrobbling, and waveform-strip wiring to import the seam directly. Verify: no `currentRecord` closures remain in `main.tsx`; `tsc --noEmit` passes (cycle check).
- [x] 1.4 Add `getOutputVolume()`/`isOutputMuted()` to `src/volume.ts`; `radio/ui.ts` imports them at engage time; drop the `getVolume`/`isMuted` deps and their `main.tsx` closures. Verify: e2e radio volume scenario green.

## 2. Consumers

- [x] 2.1 Vinyl deck start/stop routes through `bridge.toggle()`; delete the player-only branch. Verify: new e2e scenario in `e2e/vinyl.spec.ts` - with a station engaged the deck control never starts library audio (per the modified vinyl spec).
- [x] 2.2 `TransportControls` uses `bridge.toggle()`/`bridge.playing`; remove the `isStationEngaged`/`toggleStationPlayback` island imports (the `window.radio` debug handle keeps them internally). Verify: e2e app-modes and player transport scenarios green.
- [x] 2.3 Waveform strip reads radio ownership from the core mode facts; delete the `isRadioActive` dep field and its `main.tsx` composition. Verify: e2e waveform scenarios green.

## 3. Boot interface shrink

- [x] 3.1 `radio/ui.ts` queries its own DOM (search, empty hint, strip row, live badge, station card); `RadioUiDeps` is gone and `initRadio(player)` remains. Verify: `main.tsx` holds no radio DOM queries; e2e radio suite green.
- [x] 3.2 `playlists/ui.ts` queries its own DOM and imports the records/artwork accessors directly; `PlaylistsUiDeps` is gone and `initPlaylists(player)` remains. Verify: e2e playlists suite green.
- [x] 3.3 Initialize `library/ui.ts` module state at declaration; delete the `libraryViewSnapshot` stub guard and its comment. Verify: app boots with an empty library without errors; e2e library suite green.

## 4. Gate

- [x] 4.1 Run the full gate: `npm run build && npm run typecheck && npm run lint && npm run format:check && npm run test:e2e`. Verify: all green.
