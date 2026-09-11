# ui-shell Delta

## MODIFIED Requirements

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
fits) the shell SHALL reflow into a single column matching the approved
mobile draft: the sidebar chrome (brand row, mode switcher, search) becomes
a header pinned to the top of the viewport; one scrollable content column
holds the visualization stage (with its area tabs) above the shared list;
and the transport deck stays pinned to the bottom of the viewport with its
controls stacked into rows - the waveform strip on top, the now-playing
readout with the volume group next, and the transport buttons with the
panel toggles last. The page itself SHALL NOT scroll horizontally, and the
document body SHALL NOT scroll: only the content column scrolls, between
the pinned header and the pinned deck. The stage SHALL scale to the column
width (the turntable renders at its mobile size) instead of clipping.

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

## ADDED Requirements

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
