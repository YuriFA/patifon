# ui-shell Specification

## Purpose

The application shell contract: the persistent region layout, the theme
tokens every view builds on, and the ownership rule for regions written by
more than one view.

## Requirements

### Requirement: Persistent region layout

The app SHALL present a persistent shell of three regions: a sidebar (view
chrome: filter, import affordances, the shared list), a visualization area,
and a bottom transport bar. The shell SHALL persist across view mode
switches and reloads; only region content changes with the active mode.

#### Scenario: Shell survives a mode switch

- **WHEN** the user switches from library to radio and back
- **THEN** the sidebar, visualization area and transport bar remain in
  place, with only the shared list's content changed

### Requirement: Theme tokens

The system SHALL define its visual theme (surface colors, text colors, accent,
font stack) as named tokens, and every view SHALL derive its appearance from
these tokens rather than hardcoded values. The Warm Earth theme is the
initial token set: teal accent on warm beige surfaces, with a dark transport
strip carrying teal accents.

#### Scenario: Accent change propagates

- **WHEN** the accent token value is changed
- **THEN** every view's accent-colored elements reflect the new value without
  per-view edits

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
