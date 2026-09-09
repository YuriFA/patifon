# Proposal: app-modes

## Why

Mode exclusivity (library / radio / playlists) today emerges from three
booleans living in three modules plus cross-callbacks wired in `main.ts`,
including a click handler whose correctness depends on listener registration
order. Every new surface adds another mode predicate and another callback.
At the same time the widest contract in the codebase - the AudioPlayer event
API consumed by eight modules - is string-typed with `unknown` payloads, so a
misspelled event name compiles and every consumer keeps its own payload cast.
The 2026-09-09 architecture audit ranks these as the two top structural debts;
both are framework-independent and block nothing else.

## What Changes

- New `app-modes` capability: a single mode state (library / radio /
  playlists) with explicit transitions. Entering one mode exits the others,
  and playback source takeover (library track vs radio station) follows from
  the mode state instead of cross-module stop callbacks.
- The mode state emits change notifications; search input ownership, mode
  button state, and add-button visibility are derived from it. This removes
  the ordering-dependent click handler and the triplicate guarded listeners
  on the shared `.library__search` element.
- Typed event contract on AudioPlayer: a compile-time-checked event map
  (event name -> payload type) replaces bare string events with `unknown`
  payloads. Consumers drop the three duplicated
  `(event as Event).target as HTMLAudioElement` cast sites.
- The transport play/pause button icon is derived from the active source
  state through one subscription (today it is mutated from six sites across
  `main.ts` and `radio/ui.ts`).
- No user-visible behavior change: existing scenarios (radio takeover,
  entering playlists, lyrics/waveform clearing on takeover, recommendations
  refresh) keep their current semantics.

## Capabilities

### New Capabilities

- `app-modes`: exactly-one-active view mode (library / radio / playlists)
  with explicit transitions, source takeover on mode entry, and the derived
  UI ownership rules (search input, mode buttons, control visibility).

### Modified Capabilities

- `playback`: playback lifecycle and media progress events are exposed
  through a typed, compile-time-checked event contract; the event names and
  payload shapes become part of the capability's specified surface.

## Impact

- New mode-state module owning the mode enum, transitions, and change
  notifications; `main.ts` wiring shrinks to subscriptions.
- AudioPlayer: typed `on`/`off`/`emit` overloads backed by an event-map
  interface; the existing emitter implementation and its runtime behavior
  stay unchanged.
- All current event consumers updated in place: library, playlists, radio,
  recommendations, lyrics, media-session, volume, waveform strip.
- e2e suites must stay green with no scenario changes; no new dependencies.
