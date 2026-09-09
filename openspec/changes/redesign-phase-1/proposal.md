# Proposal: redesign-phase-1

## Why

The HI-FI SYSTEM redesign (2026-09-09 mockup) rewrites the app shell, library
view, and transport bar; ADR-0001 fixes the stack for that rebuild as
Preact + @preact/signals + react-aria with a vanilla playback core. Phase 1
builds the foundation and converts the first two regions, so every later
wave lands on an established pattern instead of inventing one.

## What Changes

- New app shell in the HI-FI direction: sidebar (library) + visualization
  area + bottom transport bar; light theme via CSS custom properties, mono
  system font stack (no webfont in this phase). The 2026-09-09 mockup is the
  direction reference, not a pixel contract.
- Preact island infrastructure: islands mount into fixed regions of the
  static shell; a signals bridge exposes `AudioPlayer` and radio playback
  state (`position`, `duration`, `isPlaying`, volume, mute) to components.
  Media elements stay imperative singletons outside the reactive tree; Preact
  never renders `<audio>`/`<video>`.
- Library view as a Preact island: track rows (shared row component -
  thumbnail, artist/title, duration), filter input, import buttons, mode
  buttons. The list region stays shared: the island renders only in library
  mode, radio/playlists keep writing it with vanilla `replaceChildren`
  (ownership follows the active view mode).
- Transport bar as a Preact island: prev/play-pause/next, seekable progress
  with the existing waveform strip canvas mounted by ref, time labels,
  volume slider + mute. Transport reflects the engaged source (library track
  or station) via the signals bridge.
- Keyboard accessibility for the rebuilt controls: transport, seek, and
  volume become keyboard-operable (react-aria Slider/buttons).
- E2E: layout-specific selectors for the rebuilt regions are rewritten;
  behavioral assertions through `window.player` / `window.radio` /
  `window.appReady` are preserved.

## Capabilities

### New Capabilities

- `ui-shell`: the application shell contract - region layout (sidebar /
  visualization area / transport), theme tokens, and region ownership rules
  (which view renders a region per active mode).

### Modified Capabilities

- `library`: adds keyboard activation of a track row.
- `volume`: adds keyboard adjustment of volume and a keyboard mute toggle.
- `playback`: adds keyboard operability of transport controls and seek.
