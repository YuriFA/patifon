# Design: app-modes

## Context

Mode state is scattered: `radio/ui.ts` keeps an `isRadioMode` boolean,
`playlists/mode.ts` exists solely to break an import cycle around the same
boolean, and exclusivity is wired through callbacks in `main.ts` (library
init receives a stop callback, radio init receives an on-activate callback)
plus one click handler that only works because of listener registration
order (`main.ts`, "runs after radio's own handler"). Three independent
`input` listeners guard the shared `.library__search` element by their own
mode flags. The transport icon is mutated from six sites. The player's event
API (`utils/event-emitter.ts`, 34 LOC, `on`/`off`/emit) is string-typed with
`unknown` payloads; consumers keep three copies of the
`(event as Event).target as HTMLAudioElement` cast. Switching to
`EventTarget` was evaluated and rejected before (`audio-player.ts` comment);
that decision stands. See proposal.md - Why for motivation.

A subtlety the design must preserve: mode and engaged source are
independent. A station can stay engaged while the library view is shown
(now-playing card); entering playlists must not stop a playing track.

## Goals / Non-Goals

**Goals:**

- One owner of mode state with explicit transitions and one change event.
- Playback events with compile-time-checked names and payload types.
- Derived UI (search routing, mode buttons, transport icon) instead of
  imperative mutation from many sites.
- Zero user-visible behavior change; existing e2e scenarios stay green
  unchanged.

**Non-Goals:**

- No UI framework adoption (separate decision, separate change).
- No new event kinds: the media `error` event and other audit items stay out.
- No shared row/highlight UI primitives (follow-up change).
- No change to what each mode does internally (radio search, playlists
  editing, recommendations matching are untouched).

## Decisions

1. **A single mode module, not a framework.** `src/modes.ts` owns
   `Mode = "library" | "radio" | "playlists"`, `getMode()`, and
   `setMode(next)` (idempotent: same-mode calls are no-ops without an
   event). Mode change is broadcast through one typed notification.
   Alternative considered: keep per-module booleans and derive - rejected,
   it is the bug being fixed. The module imports nothing from feature
   modules, so no import cycles (the reason `playlists/mode.ts` exists
   today disappears).
2. **Engaged source lives next to mode.** The same module tracks the
   engaged source (`"library" | "radio" | null`) and implements source
   takeover once: an engagement report stops the other source. The two
   engagement points (library track activation, station activation) report
   here instead of calling each other's stop functions through `main.ts`
   callbacks. Entering a mode does not touch the source.
3. **Typed events keep the existing emitter.** The emitter class becomes
   generic over an `AudioPlayerEvents` map (`track:<name> -> payload`), a
   type-level change only: the runtime stays the same Map-of-listeners
   implementation with single-payload dispatch, and AudioPlayer inherits
   the checked `on`/`off`/`emit`. Payloads remain the raw DOM media events.
   Consumers that only read position or duration move to the existing
   `player.position` / `player.duration` getters (buffer and playback rate
   get the same treatment), which is what deletes the event-cast sites; no
   payload re-shaping. A misspelled event name fails `tsc --noEmit`.
4. **One search listener, routed by mode.** The mode module keeps a
   registry of per-mode search handlers set at init; a single `input`
   listener on `.library__search` routes to the active mode's handler.
   Entering a mode renders its dataset for the query already in the field
   (the spec's "search field serves the active mode"): radio schedules a
   catalog search for non-empty text, playlists and the library re-render
   filtered. The triplicate guarded listeners disappear; registration
   order stops mattering.
5. **Transport icon derives from source state.** The button is owned by one
   place subscribing to the player's play/pause events and radio's playback
   state notifications, deriving the glyph from the engaged source. The six
   mutation sites are deleted.
6. **Exit actions subscribe, not orchestrate.** Each feature module
   subscribes to the mode change event and enters/exits itself (radio hides
   the station card and clears its error state, playlists render their
   list, library restores import affordances and the waveform). `main.ts`
   wiring shrinks to `setMode` calls from the three mode buttons plus init
   ordering that no longer matters.

## Risks / Trade-offs

- **Rewiring eight consumer modules** is the widest edit surface in the
  repo so far -> the 86-test e2e suite is the net; typed events land first
  (compile-verified, behavior-neutral), the mode controller second, so each
  commit is independently green.
- **Mode/source conflation** would reintroduce subtle bugs (stopping
  playback on mode entry) -> the module keeps the two concepts separate and
  the spec pins "mode entry does not touch playback" with a scenario.
- **Derived transport icon** depends on radio's state notifications being
  complete; a missed state transition would strand a stale glyph ->
  covered by existing radio e2e (pause/resume, dead stream) plus a source
  switch scenario added in this change.
- **Debug/e2e handles** (`window.player`, `window.radio`, `window.appReady`)
  are typed loosely by design; they stay outside the event contract.

## Migration Plan

Single branch, two landings: (1) typed event map + consumer cleanup -
compile-time verified, no behavior change; (2) mode module + rewiring -
behavior-neutral by spec, e2e unchanged and green. Rollback is reverting
the branch; no data or storage format changes.

## Open Questions

None - scope, contracts, and sequencing are settled with the owner.
