# ui-shell Delta Spec

## Purpose

The application shell contract: the persistent region layout, the theme
tokens every view builds on, and the ownership rule for regions written by
more than one view.

## ADDED Requirements

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
these tokens rather than hardcoded values. The light HI-FI theme is the
initial token set.

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
