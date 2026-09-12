# radio-deck Tasks

## 1. Bridge and strip state

- [x] 1.1 Add `bridge.station` signal (`{ name, tags, bitrate, uuid } | null`), written on engage/stop/error in `src/radio/ui.ts`; reset to null on release. Verify: `npm run typecheck` passes and existing e2e stays green.
- [x] 1.2 Clear stale position/duration in `syncPosition`/`syncPlayback` while the active source is radio (both forced to 0, covering late library `timeupdate`). Verify: new e2e scenario - after station takeover the now/total readouts are empty and the seek input is disabled.

## 2. Deck strip live badge

- [x] 2.1 Extend the live indicator in `src/radio/ui.ts` to engagement states: playing, idle (paused/error), hidden (released); keep the `progress_live` class while engaged. Verify: e2e - badge present while playing and paused, absent after stop.
- [x] 2.2 Restyle `.progress__live` as an enlarged badge occupying the total-time slot and hide `.deck__time_total` while engaged (desktop + mobile widths). Verify: e2e - badge sits in the right slot, total time renders no digits.

## 3. Radio deck component

- [x] 3.1 Add `#radio-deck-root` to `.audio_visualize` in `index.html` and port the approved draft to `src/ui/radio-deck.tsx` + `radio-deck__*` styles on theme tokens (body, screws, feet, grille + STEREO plate, full-width dial glass with 88-108 scale and needle, station screen, knobs, antenna). Verify: e2e - engaging a station shows the receiver; `radio-deck` markup present.
- [x] 3.2 Wire visibility: deck shown exactly while `bridge.source === "radio"`; `AreaTabs` returns null and the visualizer style controls hide while engaged; on release the persisted `areaMode` tab returns. Verify: e2e - tabs hidden during playback, restored after stop with the previous tab active.
- [x] 3.3 Deterministic needle position from `stationuuid` (hash to 88.00-108.00, left offset within the scale lane); parked at the left end in the error state. Verify: e2e - needle offset identical across re-engage of the same station, different across stations.
- [x] 3.4 Station screen content from `bridge.station` (name, tags/bitrate line) and state visuals: playing = lit + antenna raised, paused = dimmed + antenna folded, error = flickering NO SIGNAL screen, unlit grille, parked needle. Verify: e2e - screen shows station name while playing; paused dims (class assertions); routed-error fixture flips the screen to NO SIGNAL.
- [x] 3.5 Functional volume knob: `role="slider"` with `aria-valuenow` 0-100, pointer drag, wheel and Arrow keys driving the player volume; reflects external volume changes and dims when muted; tuning knob decorative. Verify: e2e - dragging/arrow-key changes `window.player.volume` and `aria-valuenow` follows a slider-initiated change.

## 4. Transport panel and popups

- [x] 4.1 Radio variant of `NowPlaying`: ON AIR label + station name from `bridge.station`, no mini meter; library variant unchanged. Verify: e2e - panel shows ON AIR + station name during playback and clears after stop.
- [x] 4.2 Equalizer popup radio notice ("affects library playback only") shown only while radio is engaged. Verify: e2e - notice visible with station engaged, absent with library playback.

## 5. Removals

- [x] 5.1 Remove the station-now card: element from `index.html`, styles, delete `src/radio/now-playing.ts`, drop `showNowPlaying`/`hideNowPlaying` logic from `src/radio/ui.ts`. Verify: e2e - `.station-now` absent from the DOM; existing radio specs pass without it.

## 6. Quality gates

- [x] 6.1 Full local gate green. Verify: `npm run typecheck && npm run lint && npm run format:check && npm run test:e2e`.
- [x] 6.2 Spec deltas merged into `openspec/specs/{radio,ui-shell,equalizer,radio-deck}/spec.md` and `openspec validate --specs` passes. Verify: command output clean.
