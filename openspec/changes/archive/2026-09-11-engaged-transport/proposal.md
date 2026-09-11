## Why

The facts of the engaged source (is something audible, what play/pause
means right now, is the source seekable) are re-derived in five places:
the bridge's `syncPlayback`, the transport toggle routing, the vinyl deck
start button, and two `main.tsx` closures (`syncNowPlaying`,
`isRadioActive`). The deck's copy has already drifted into a real defect:
its start/stop targets the library element only, so in any state where it
is reachable while a station is engaged it would start library audio over
the radio, violating the vinyl spec's "equivalent to the transport
play/pause control" requirement. Separately, `main.tsx` re-broadcasts the
current-record accessor to four features as closures, hiding the
dependency graph, and the boot interfaces of `initRadio`/`initPlaylists`
are 8-field lists of DOM nodes and behavior closures defended by a
boot-order stub.

## What Changes

- Deepen `src/ui/bridge.ts` into the engaged transport module: it keeps
  the authoritative `playing`/`source` signals and gains the `toggle()`
  command (routing to the station or the player per the engaged source)
  and the now-playing title/artist sync (the `syncNowPlaying` mini-bridge
  moves from `src/main.tsx` into `initBridge`).
- Fix the vinyl deck start/stop to act on the engaged source through the
  module instead of `player.isPlaying` alone.
- `TransportControls` drops its direct imports of `isStationEngaged`/
  `toggleStationPlayback`; radio internals stop leaking into islands.
- Shrink boot interfaces: `radio/ui.ts` reads volume state directly from
  `src/volume.ts` (new getters) instead of the `getVolume`/`isMuted`
  deps; feature modules import the library record seam from
  `src/library/source.ts` directly instead of receiving `currentRecord`
  closures through `main.tsx`; the `libraryViewSnapshot` boot-order stub
  is removed by initializing library module state at declaration.
- Drop the waveform strip's composed `isRadioActive` dep: the strip reads
  radio ownership from the core mode facts (`getActiveSource()`/
  `getMode()`) directly instead.

## Capabilities

### New Capabilities

- none

### Modified Capabilities

- `vinyl`: the deck start/stop control follows the engaged source - with
  a station engaged it toggles the station and MUST NOT start library
  audio.
