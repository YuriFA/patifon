# redesign-phase-3 - Design

## Context

After phase 2 the shell, transport, and visualization area run as Preact
islands over the signals bridge with Warm Earth tokens. Five surfaces are
still legacy: radio view and playlists view render rows as vanilla DOM into
the shared list (`renderStations`, `renderIndex`/`renderTracks`), the
recommendations section renders into a static sidebar container, the
equalizer popup is static markup driven by custom drag `RangeSlider`s in
`main.tsx`, the scrobbling popup is static markup wired by
`src/scrobbling/ui.ts`, and volume is the phase-1 island with a linear
native slider.

Spec source: the Warm Earth canvas draft remains the direction reference
(the phase-2 draft shows the deck; the knob styling follows the same
language). The popups have no draft; they follow the established token
styling.

## Goals / Non-Goals

Goals:

- Every remaining surface on tokens and the island pattern; no visible
  phase-0 styles left.
- Popups behave consistently (one pattern, `aria-expanded`, Escape,
  outside click).
- The knob keeps the volume capability's semantics byte-for-byte: same
  clamping, steps, wheel deltas, mute independence; e2e keeps passing.

Non-Goals:

- Audio-graph changes (equalizer filters/presets, scrobbling queue,
  recommendation matching).
- New modes, new persistence keys, or changed takeover rules.
- Zag.js adoption for the popups (a toggle popover needs no focus trap;
  native-first per ADR-0001).

## Decisions

### 1. Radio view island

A `RadioView` island renders the station rows (search results, saved
stations, the pinned playing station with its save star) from signals fed
by the existing `radio/api` + saved-stations store; the catalog search
pipeline (`scheduleSearch`, error hint) stays. The vanilla
`renderStations`/`updatePlayingHighlight` builders are deleted; playback
wiring (`playStation`, `toggleStationPlayback`, takeover rules) is
untouched. The station card (`.station-now`) keeps its data flow and is
restyled to tokens.

### 2. Playlists view island

A `PlaylistsView` island renders the index and the open playlist's tracks
using the shared row primitives from phase 1. Reorder/remove/rename/queue
call the existing `playlists/*` store and queue modules; the view holds no
logic. `refreshPlaylistsView` (external mutations from saved
recommendations) becomes a signal write instead of a DOM re-render call.

### 3. Recommendations island

A `Recommendations` island replaces the static sidebar container, fed by
signals for state (loading/error/ready) and rows; `recommendations/api` +
`match` are untouched. The connect prompt opens the scrobbling popup via
the existing `openScrobblingPopup` export. This clears the phase-2
transitional debt.

### 4. Popup pattern module

One `usePopup`-style hook (or small shared component) owns: toggle on
button click, `aria-expanded`, Escape-to-close, outside pointer-down close.
Both popups use it. No portal, no focus trap: the popup is anchored in the
transport bar exactly as today. Exactly one popup may be open at a time
(opening one closes the other) - matching user expectations for adjacent
bar buttons.

### 5. Equalizer island

An `EqualizerPopup` island with ten native vertical `input[type=range]`
sliders (-12..+12, step 1, `aria-label` per band frequency) replacing the
custom `RangeSlider` drag code; the preset `<select>` stays a native
select listing `PRESETS`. `main.tsx` loses the equalizer wiring block; the
island calls `player.getBandGain`/`changeBandGain`/`applyPreset` directly.
The legacy static markup is deleted from `index.html`.

### 6. Scrobbling island

A `ScrobblingPopup` island ports `scrobbling/ui.ts`'s element wiring to
JSX over the existing settings/api/queue modules; the static markup is
deleted. Status and queue hints render from state; connect/disconnect/
toggle call the same functions.

### 7. Volume knob

The knob is a slider-role widget (not a rotated native input - rotation
breaks native pointer semantics): a button-like focusable element with
`role="slider"`, `aria-label="Volume"`, `aria-valuemin=0`,
`aria-valuemax=100`, `aria-valuenow` as a percentage. Interactions:
pointer drag mapped by angle around the knob center (clamped to the
270-degree arc), wheel (existing 0.05 steps via the shared setter), arrow
keys (same step as today), Home/End to 0/1. The mute button and wheel
hook survive unchanged; `window.player`-based e2e keeps passing since the
setter path is the same.

### 8. Views restyled under existing token requirement

Radio/playlists/recommendations have no new behavioral requirements; the
restyle task asserts token-compliance (no phase-0 hex values outside
`:root`) and the visual pass against the theme.

## Risks

- The knob's pointer math is the wave's fiddliest piece; mitigate with a
  pure `angleFromEvent` helper covered by unit-ish e2e assertions and a
  keyboard/wheel path that bypasses angles entirely.
- Deleting the legacy `RangeSlider` usage in `main.tsx` must not break the
  seek bar, which uses the same class for its own purposes - removal is
  scoped to the equalizer wiring only.
- Playlists reorder buttons and recommendation rows have exact e2e
  selectors; islands must keep the same observable text/roles to avoid
  rewriting those suites beyond class renames.
