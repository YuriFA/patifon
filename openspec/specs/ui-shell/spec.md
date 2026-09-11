# ui-shell Specification

## Purpose

The application shell contract: the persistent region layout, the theme
tokens every view builds on, and the ownership rule for regions written by
more than one view.

## Requirements

### Requirement: Persistent region layout

The app SHALL present a persistent shell of three regions: a sidebar (view
chrome: brand, mode switcher, filter, import affordances, the shared
list), a visualization area, and a bottom transport deck. The transport
deck SHALL be one footer card containing the waveform strip row (with the
time readouts and the LIVE badge) above the transport controls row. The
shell SHALL persist across view mode switches and reloads; only region
content changes with the active mode.

At desktop widths the shell SHALL fill the viewport without page scroll,
centered at a maximum width with hairline side borders, in the two-column
grid (sidebar beside the visualization area, deck spanning below).

At mobile widths (narrow viewports where the sidebar column no longer
fits) the shell SHALL reflow into a single column: the sidebar chrome
(brand row, mode switcher, search) becomes a header pinned to the top of
the viewport; one scrollable content column holds the visualization stage
(with its area tabs) above the shared list; and the transport deck stays
pinned to the bottom of the viewport with its controls stacked into rows -
the waveform strip on top, the now-playing readout with the volume group
next, and the transport buttons with the panel toggles last. The page
itself SHALL NOT scroll horizontally, and the document body SHALL NOT
scroll: only the content column scrolls, between the pinned header and
the pinned deck. The stage SHALL scale to the column width (the
turntable renders at its mobile size) instead of clipping.

#### Scenario: Shell survives a mode switch

- **WHEN** the user switches from library to radio and back
- **THEN** the sidebar, visualization area and transport deck remain in
  place, with only the shared list's content changed

#### Scenario: Deck carries the strip and the controls

- **WHEN** the app loads
- **THEN** the transport deck renders one footer card whose top row hosts
  the waveform strip (times at its ends) and whose remaining rows host the
  transport controls

#### Scenario: No page scroll

- **WHEN** the app loads at a desktop viewport
- **THEN** the document does not scroll; only inner lists scroll

#### Scenario: Mobile reflow to one column

- **WHEN** the app loads at a mobile viewport (~390px wide)
- **THEN** the brand row, mode switcher and search render in a header
  pinned to the top, the stage and the shared list render as one scrollable
  column under it, the transport deck renders pinned to the bottom with its
  rows stacked, and nothing overflows the viewport horizontally

#### Scenario: Desktop layout is unchanged

- **WHEN** the app loads at a desktop viewport
- **THEN** the shell renders the two-column grid with the 380px sidebar and
  the deck as before the mobile breakpoint existed

### Requirement: Theme tokens

The system SHALL define its visual theme as a named token set that mirrors
the canonical design system (`.superdesign/design-system.md`, the Patifon
Warm Earth system) 1:1: the same role names (bg, card, secondary, border,
accent-tint, fg, muted, primary, destructive, metal, vinyl, wave-dim), the
mechanical shadow and texture tokens, and the mono type stack. Every view
SHALL derive its appearance from these tokens rather than hardcoded
values. Visual design changes SHALL update the canonical design system
first, then the tokens; the design system file is the source of truth for
the relationship between the two.

#### Scenario: Accent change propagates

- **WHEN** the accent token value is changed
- **THEN** every view's accent-colored elements reflect the new value without
  per-view edits

#### Scenario: Shell renders on canonical tokens

- **WHEN** the app loads
- **THEN** the shell's background resolves from the canonical bg token
  (`#f6f2ec`) and the accent role resolves to the canonical primary
  (`#0f766e`)

#### Scenario: A view needs a color the tokens do not define

- **WHEN** a view requires a color that no token provides
- **THEN** the token set gains it (with the design system updated first)
  rather than the view hardcoding a hex value

### Requirement: Region ownership per active mode

Each region of the shell SHALL have exactly one writer at a time. The shared
list region SHALL be rendered by the active view's owner: the library view
in library mode, radio in radio mode, playlists in playlists mode. A
non-owning view MUST NOT write into a region while another view owns it.

#### Scenario: Ownership handoff on mode switch

- **WHEN** the user switches from library to radio
- **THEN** the library's writer stops writing the list and radio's writer
  renders the station content into it, with no interleaved or duplicated
  rows

### Requirement: Now playing panel in transport

The transport bar SHALL show a now-playing panel for library playback: a
NOW PLAYING label, the track title and artist of the active library track,
and a small live meter reacting to the audio. The panel SHALL clear when
playback stops and SHALL NOT show stale track information after the track
changes. Radio playback SHALL keep the existing station card in the
visualization area; the panel SHALL NOT display radio content.

#### Scenario: Panel follows the playing track

- **WHEN** the user starts playing a different library track
- **THEN** the panel shows the new track's title and artist

#### Scenario: Panel clears on stop

- **WHEN** playback of the library track stops
- **THEN** the panel is cleared from the transport bar

#### Scenario: Radio keeps its own display

- **WHEN** a radio station takes over
- **THEN** the station card shows in the visualization area and the
  transport panel holds no library track information

### Requirement: Transport popups

The transport bar's popups (scrobbling, equalizer) SHALL open and close
from their bar buttons: activating a button toggles its popup, the button
SHALL expose the open state via `aria-expanded`, and an open popup SHALL
close on Escape and on pointer-down outside it. Each popup SHALL be styled
from theme tokens.

At desktop widths each popup presents as a floating panel anchored above
its trigger. At mobile widths each popup SHALL present as a bottom sheet:
a full-width card docked to the bottom edge of the viewport with rounded
top corners and a slide-up open transition. The toggle, `aria-expanded`,
Escape, and outside-dismiss semantics SHALL be identical at both widths.

#### Scenario: Button toggles its popup

- **WHEN** the user activates the equalizer button
- **THEN** the equalizer popup opens and the button reports
  `aria-expanded="true"`

#### Scenario: Escape closes

- **WHEN** a popup is open and the user presses Escape
- **THEN** the popup closes and `aria-expanded` reports `"false"`

#### Scenario: Outside click closes

- **WHEN** a popup is open and the user presses the pointer outside the
  popup and outside its button
- **THEN** the popup closes

#### Scenario: Mobile popup opens as a bottom sheet

- **WHEN** the user activates the equalizer button at a mobile viewport
- **THEN** the popup renders as a full-width card docked to the bottom of
  the viewport with rounded top corners, the button reports
  `aria-expanded="true"`, and Escape still closes it

### Requirement: Mobile touch ergonomics

At mobile widths every interactive control in the shell chrome and the
transport deck SHALL offer a touch target of at least 44px in both
dimensions. The shell SHALL respect the notch/home-indicator safe areas
(padding from the environment safe-area insets on the pinned header and
deck) and SHALL size itself from the dynamic viewport height so browser
chrome collapse does not clip or orphan the pinned deck.

#### Scenario: Touch targets meet the minimum

- **WHEN** the app loads at a mobile viewport
- **THEN** the mode switcher buttons, the transport buttons, the panel
  toggles, and the mute button each expose a hit area of at least 44px in
  width and height

#### Scenario: Safe areas are respected

- **WHEN** the app runs with nonzero safe-area insets (notch or home
  indicator)
- **THEN** the pinned header and the pinned deck inset their content by the
  environment safe-area values instead of being covered

#### Scenario: Dynamic viewport height

- **WHEN** the browser chrome collapses or expands while the app is open at
  a mobile viewport
- **THEN** the shell resizes with the dynamic viewport height and the
  pinned deck remains fully visible
