# redesign-phase-3 - Proposal

## Why

Phase 2 moved the shell, transport, and visualization area onto the Warm
Earth theme and the Preact/signals pattern, but five surfaces still render
with legacy phase-0 code and styles: the radio view, the playlists view, the
recommendations section, and the EQ/scrobbling popups. They visually clash
with the new theme (hardcoded red/beige palette, legacy fonts), and the
volume control is a plain horizontal slider while the design language calls
for the deck-style knob. This wave finishes the redesign so every visible
surface speaks the same language.

## What Changes

- Radio view: the station list rendering moves from vanilla DOM builders to
  a Preact island fed by signals, styled from theme tokens; the playing
  station stays pinned with its save star; the station card in the library
  view is restyled to tokens.
- Playlists view: the playlist index and track-list rendering move to a
  Preact island (same row primitives as the library rows); reorder, remove,
  rename, and queue actions keep their behavior.
- Recommendations section: the created-for-you list moves to a Preact island
  styled from tokens, clearing the phase-2 transitional style debt; the
  connect-prompt / error / retry states keep their behavior.
- Equalizer popup: the legacy static markup (custom drag sliders) is
  replaced by a Preact island with native vertical range inputs, preset
  select, and token styling; the audio graph (`Equalizer`, presets, band
  gains, persistence) is untouched.
- Scrobbling popup: restyled to tokens on the same island pattern
  (token connect/disconnect, enable toggle, status, queue hint keep their
  behavior), clearing its transitional debt.
- Popups as a pattern: both popups open from transport bar buttons with a
  native-first open/close treatment (outside click and Escape close,
  `aria-expanded` on the button); Zag.js is not needed for a popover this
  simple (no focus trap requirement beyond native dialog semantics).
- Volume knob: the transport volume island's horizontal slider is replaced
  by a rotary knob styled to the draft (a slider-role widget or rotated
  native range), keeping the mute toggle, wheel adjustment, and keyboard
  steps.

## Capabilities

### New Capabilities

<!-- Capabilities being introduced. Use kebab-case for path segments you introduce
     (e.g., user-auth or identity/user-auth) that follow the project's existing spec organization. -->

- none

### Modified Capabilities

- `ui-shell`: adds the popup pattern requirement (transport popups: toggle
  button with `aria-expanded`, Escape and outside-click close).
- `volume`: adds the rotary volume control surface requirement (knob
  appearance and interaction; clamping, mute, wheel, and keyboard
  requirements unchanged).
- `equalizer`: adds the equalizer popup control requirement (token-styled
  popup, ten native steppable band sliders, preset select; audio behavior
  unchanged).
- `scrobbling`: adds the scrobbling popup control requirement (token-styled
  island; connect/disconnect, toggle, status, queue hint behavior
  unchanged).

The radio, playlists, and recommendations restyles land under the existing
`ui-shell` Theme tokens requirement (every view derives its appearance from
tokens); their behavioral requirements are unchanged and need no deltas.
