# patifon-page-port - Proposal

## Why

`design-system-in-code` landed the canonical tokens and shared primitives,
but the page itself still renders the phase-2/3 structure: a dark transport
strip separate from a 26px progress row, a rotary volume knob, a 340px
sidebar without the brand, a bars-style waveform, and legacy chrome. The
canvas draft (6dbe3073, v7) is now the pixel contract per the owner's
approval, and the design system file pins the target: one screen, 380px
sidebar with the Patifon brand, a light 140px transport deck carrying the
full-width continuous waveform strip, the horizontal volume fader, and the
mech/glass/fader languages everywhere. This wave ports the page to that
contract 1:1.

## What Changes

- Shell: sidebar 340px -> 380px; the progress row and transport bar merge
  into one light transport deck (footer card ~140px, deck shadow, brushed
  metal wash) containing the waveform strip row (40px) and the controls
  row; the shell centers at max 1440px with side hairlines and the plinth
  shadow; the dark strip tokens and the `.bar` rescope are deleted.
- Waveform strip: one continuous gapless mirrored silhouette (no bars)
  spanning the deck width, played portion `--primary`, remainder
  `--wave-dim`, a 2px playhead with glow; the time readouts move from the
  transport controls into the strip's ends; the LIVE badge stays.
- Transport controls: mechanical prev/play/next buttons (56x56, play
  80x64 with the latched look while playing) with the canonical lucide
  glyphs; the now-playing panel becomes the glass readout screen
  (NOW PLAYING eyebrow, one truncate line, live meter, "No source" empty
  state).
- Volume: the rotary knob is replaced by the horizontal volume fader
  (recessed rail + fill + fader cap) plus a round mute mech button; the
  control is an invisible native range over the styled rail, so the
  capability's semantics (clamping, steps, wheel, mute independence,
  slider semantics) are preserved via the platform.
- Panel toggles: EQ and SCROB become 56x56 mech buttons (icon + 10px
  sublabel), latched while their popup is open; the popups are re-skinned
  to the canon (primary border, radius 8, drop shadow, caret).
- Sidebar: the brand row (Patifon wordmark + radio-receiver mark), the
  three-button latching mode switcher (library/list-music/radio icons),
  the recessed search field, the LOCAL LIBRARY context row with Add
  Files, and rows on the TrackRow anatomy (48px artwork, playing state
  with 3px left bar and accent-tint fill, hover card fill); the
  recommendations section follows the same language.
- Stage: mode tabs become latched text mech chips (LYRICS/VINYL/VISUAL);
  the station card and lyrics colors follow the canon.
- Vinyl deck: geometry and materials synced to the canon (plinth + screws,
  strobe rim platter, grooved vinyl, mint label, metal tonearm, pulse
  power LED, round start/stop, pitch fader in the shared fader language
  with +8/0/-8 scale).
- Branding: document title and PWA manifest name become "Patifon".
- Cleanup: every region adopts the canonical token names and the legacy
  alias block is deleted.

## Capabilities

### New Capabilities

- none

### Modified Capabilities

- `ui-shell`: the persistent region layout gains the transport deck
  structure (deck with strip row + controls row) and the centered
  max-width shell.
- `volume`: the rotary volume control surface requirement becomes the
  volume fader control surface (same interaction semantics, new surface).
- `track-waveform`: the waveform strip requirement pins the continuous
  gapless silhouette and the in-strip time readouts.

The remaining restyles (transport, popups, sidebar rows, station card,
lyrics, vinyl deck, mode tabs) land under the existing `ui-shell` Theme
tokens requirement; their behavioral requirements are unchanged.
