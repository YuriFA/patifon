# ui-shell Delta Spec

## MODIFIED Requirements

### Requirement: Persistent region layout

The app SHALL present a persistent shell of three regions: a sidebar (view
chrome: brand, mode switcher, filter, import affordances, the shared
list), a visualization area, and a bottom transport deck. The transport
deck SHALL be one footer card containing the waveform strip row (with the
time readouts and the LIVE badge) above the transport controls row. The
shell SHALL persist across view mode switches and reloads; only region
content changes with the active mode. The shell SHALL fill the viewport
without page scroll and SHALL center at a maximum width with hairline
side borders.

#### Scenario: Shell survives a mode switch

- **WHEN** the user switches from library to radio and back
- **THEN** the sidebar, visualization area and transport deck remain in
  place, with only the shared list's content changed

#### Scenario: Deck carries the strip and the controls

- **WHEN** the app loads
- **THEN** the transport deck renders one footer card whose top row hosts
  the waveform strip (times at its ends) and whose bottom row hosts the
  transport controls

#### Scenario: No page scroll

- **WHEN** the app loads at a desktop viewport
- **THEN** the document does not scroll; only inner lists scroll
