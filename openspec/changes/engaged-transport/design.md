## Context

`src/ui/bridge.ts` is the sanctioned one-way seam from the vanilla core to
Preact: core events write signals, components read signals and call
player/radio methods (ADR-0001: signals in, method calls out, no playback
logic in the reactive tree). Today the command side never got a home: the
transport island routes play through `isStationEngaged()` (a radio/ui
internal), the vinyl deck checks `player.isPlaying` only (the defect), and
`main.tsx` carries `syncNowPlaying` and `isRadioActive` as a second
mini-bridge. Verified import facts: `volume.ts` already imports
`radio/playback.ts`, so `radio/ui.ts` importing `volume.ts` is acyclic;
`library/source.ts` already owns `recordAt` and the player reference via
`initSource`.

## Goals / Non-Goals

**Goals:**

- One home for engaged-source facts (playing, source, seekable) and the
  play/pause command; the deck defect becomes unreachable by construction.
- Boot interfaces shrink to semantic kernels: `initRadio(player)`,
  `initPlaylists(player)`.
- Features import the library record seam directly; `main.tsx` stops
  couriering closures.

**Non-Goals:**

- No view/markup changes and no visual behavior changes beyond the deck
  defect.
- No rows/empty-hint/snapshot restructure - that is the `rows-host`
  change and lands after this one.
- Popups, lyrics panel internals, and the fan-out idioms are untouched.

## Decisions

1. **Deepen `bridge.ts` in place; no new module.** The bridge already owns
   the signal half of the engaged source; a separate engaged-transport
   module would split one seam in two. `bridge.ts` stays vanilla, so the
   ADR rule (no playback logic in the reactive tree) holds: components
   call `bridge.toggle()`.
2. **`toggle()` routes by `getActiveSource()`.** Station engaged -> its
   playback state machine (`pauseStation`/`resumeStation` by
   `radioState()`, which replaces the `toggleStationPlayback` import and
   its internal `playingStation` guard - identical behavior in every
   reachable state); no source -> engage the library (the
   `engageLibraryFromTransport` sequence moves verbatim); library ->
   play/pause. Dispatching on the source also closes the old routing's
   transient hole where a released station with a stale source fell into
   the player branch.
3. **No `seekable` signal.** Applying revealed it would duplicate state:
   the seek bar already derives seekability in one line from
   `bridge.duration` (0 for non-finite). The waveform strip keeps its
   area-ownership concern but reads radio ownership from the core mode
   facts (`getActiveSource()`/`getMode()`) instead of the composed
   `isRadioActive` closure - the same fact without routing a vanilla
   feature module through the UI seam; `strip.ts`'s deps lose that field.
4. **Volume getters on `volume.ts`.** `getOutputVolume()` /
   `isOutputMuted()` beside the existing setters; `radio/ui.ts` imports
   them at engage time (same values, same moment), and the
   `getVolume`/`isMuted` deps fields die.
5. **`currentRecord()` moves to `library/source.ts`.** It is
   `recordAt(player.currentTrackIndex)` - source knowledge - and
   `source.ts` already holds the player. Lyrics, scrobbling, and the
   waveform strip import the seam directly; `media-session` keeps its
   metadata-provider argument but receives the source-backed function.
   `libraryRecords`/`artworkUrl` accessors stay in `library/ui.ts` for
   now; if importing them from playlists/recommendations turns out
   cyclic, add a narrow `library/catalog.ts` accessor module (resolved at
   apply time by import inspection).
6. **The `libraryViewSnapshot` stub dies by initialization.** Module
   state in `library/ui.ts` is initialized at declaration (empty
   records, lazy fuse) so the snapshot is safe before `initLibrary`
   resolves; the "islands mount before inits" comment shrinks but does
   not fully disappear until `rows-host` moves search/buttons into the
   islands.

## Risks / Trade-offs

- [`bridge.ts` grows toward ~150 lines] -> it remains one seam with one
  purpose; split only if a second command family appears.
- [Import cycles when features import library seams] -> direction verified
  for volume; run `tsc --noEmit` immediately after the seam move (task
  1.3) to catch cycles at once.
- [E2E uses the `window.radio.isActive` debug handle] -> `radio/ui.ts`
  keeps `isStationEngaged` for the handle; only islands stop importing it.
- [Behavior drift in moved routing] -> routing moves verbatim; e2e
  app-modes/player suites cover both sources' toggle paths.

## Migration Plan

Single branch, behavior-preserving except the deck defect fix. Order:
core (1) -> consumers (2) -> boot shrink (3) -> full gate (4). Rollback is
a revert; no data or persistence changes.

## Open Questions

- none
