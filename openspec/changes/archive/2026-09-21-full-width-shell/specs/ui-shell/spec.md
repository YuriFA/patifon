## MODIFIED Requirements

### Requirement: Persistent region layout

The app SHALL present a persistent shell of three regions: a sidebar (view
chrome: brand, mode switcher, filter, import affordances, the shared
list), a visualization area, and a bottom transport deck. The transport
deck SHALL be one footer card containing the waveform strip row (with the
time readouts and the LIVE badge) above the transport controls row. The
shell SHALL persist across view mode switches and reloads; only region
content changes with the active mode.

At desktop widths the shell SHALL stretch to the full viewport width at
every screen size - no maximum-width cap, no horizontal centering, and no
side borders or page shadow - without page scroll, in the two-column grid
(sidebar beside the visualization area, deck spanning below). The
visualization area SHALL absorb all width beyond the fixed 380px sidebar.

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

#### Scenario: Full-width shell on wide screens

- **WHEN** the app loads at a desktop viewport wider than 1440px
- **THEN** the shell spans the entire viewport width with no empty side
  margins, the sidebar stays 380px and the visualization area absorbs the
  remaining width

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
