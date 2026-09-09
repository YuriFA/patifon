# Tasks: app-modes

## 1. Typed event contract

- [ ] 1.1 Add `AudioPlayerEvents` map (lifecycle + progress events with declared payload types) and generic `on`/`off` overloads on AudioPlayer; emitter runtime unchanged. Verify: `npm run typecheck` green.
- [ ] 1.2 Migrate event consumers (library, playlists, radio, recommendations, lyrics, media-session, volume, waveform) to typed subscriptions; position/duration reads move to `player.position`/`player.duration`, deleting the three `event.target` cast sites. Verify: `npm run typecheck` green, no `as HTMLAudioElement` casts remain (`grep`).
- [ ] 1.3 E2E smoke on the typed wiring: playback progress, lyrics highlight, media session metadata still work. Verify: `npm run test:e2e` green.

## 2. Mode state module

- [ ] 2.1 Create `src/modes.ts`: `Mode` union, `getMode()`/`setMode()` (idempotent), engaged-source tracking (`"library" | "radio" | null`) with single-implementation takeover, one typed change notification. Verify: `npm run typecheck` green.
- [ ] 2.2 Route the two engagement points (library track activation, station activation) through the module's takeover instead of the cross-module stop callbacks in `main.ts`. Verify: `npm run test:e2e` green (station vs track takeover scenarios).

## 3. Derived UI rewiring

- [ ] 3.1 Single search listener routed by mode via a per-mode handler registry; delete the three guarded listeners and the ordering-dependent mode button handler in `main.ts`. Verify: `npm run test:e2e` green (library filter, radio search, playlists filter).
- [ ] 3.2 Feature modules subscribe to mode change for enter/exit (radio station card, playlists render, library affordances and waveform restore). Verify: `npm run test:e2e` green.
- [ ] 3.3 Transport play/pause icon derived from engaged source + state events; delete the six mutation sites in `main.ts` and `radio/ui.ts`. Verify: `npm run test:e2e` green.

## 4. Spec scenarios to e2e

- [ ] 4.1 app-modes scenarios: radio -> playlists direct switch without library flash; rapid alternating switches leave the library list clean; entering radio with query text shows stations; entering playlists while a track plays keeps it playing; library track takes over from a station; add control visibility per mode; transport icon follows source switch. Verify: `npm run test:e2e` green.
- [ ] 4.2 Compile-time contract check demonstrated: a misspelled event name fails `tsc --noEmit` (checked once manually, then removed). Verify: note in change summary.

## 5. Verification

- [ ] 5.1 Full matrix `npm run lint && npm run typecheck && npm run format:check && npm run build && npm run test:e2e`. Verify: exit 0.
- [ ] 5.2 Manual pass in a real browser: library -> radio -> playlists -> library round trip with playback engaged, station card in library view, lyrics/waveform clearing on takeover, transport icon correct at every step. Verify: checklist noted in the change summary.
