# app-modes Specification

## Purpose

The app presents one active view mode at a time (library, radio, playlists).
This capability defines mode exclusivity, playback source takeover on mode
transitions, and which UI affordances follow the active mode.

## Requirements

### Requirement: Exactly one active mode

The system SHALL keep exactly one view mode active at a time among library,
radio, and playlists. Activating a mode SHALL exit the currently active mode
in the same interaction.

#### Scenario: Library to radio

- **WHEN** radio mode is activated while the library view is active
- **THEN** the library view is exited and the radio view is shown

#### Scenario: Radio to playlists without passing through library

- **WHEN** playlists mode is activated while radio mode is active
- **THEN** radio mode is exited and the playlists view is shown, with no
  library flash in between

### Requirement: Deterministic mode transitions

Mode transitions SHALL produce the same end state regardless of module
initialization or listener registration order. After any sequence of mode
activations, the visible view, the mode buttons, and the internal mode state
MUST agree.

#### Scenario: Rapid alternating switches

- **WHEN** the user activates radio, then playlists, then library in quick
  succession
- **THEN** the library view is shown and no other mode's content remains
  rendered in the shared list

### Requirement: Search field serves the active mode

The shared search field SHALL query the active mode's dataset: library mode
filters tracks, radio mode searches stations, playlists mode filters
playlists. Entering a mode with query text present SHALL render that mode's
dataset for the current query. A late response for a previous query or mode
MUST NOT overwrite the active mode's list.

#### Scenario: Entering radio with query text present

- **WHEN** the search field holds text and the user activates radio mode
- **THEN** the list shows matching stations for that text, not library tracks

### Requirement: A single audible source

At most one playback source SHALL be audible at a time. Engaging a radio
station SHALL take over playback from a playing library track, and playing a
library track SHALL stop an engaged station. Mode entry alone SHALL NOT start
or stop playback; only an explicit source engagement does.

#### Scenario: Library track takes over from a station

- **WHEN** a station is playing and the user plays a library track
- **THEN** the station stops and the library track plays

#### Scenario: Entering a mode does not interrupt playback

- **WHEN** a library track is playing and the user enters playlists mode
- **THEN** the track keeps playing

### Requirement: Mode-dependent controls reflect the active state

Mode buttons SHALL indicate the active mode. Library import affordances
SHALL be hidden while radio or playlists mode is active and restored in
library mode. The transport play/pause control SHALL reflect the state of the
audible source whatever that source is, and SHALL NOT show a stale glyph
after a source switch, pause, or resume.

#### Scenario: Add control visibility

- **WHEN** the user activates radio mode and returns to library mode
- **THEN** the library import control is hidden in radio mode and visible
  again in library mode

#### Scenario: Transport icon follows source switch

- **WHEN** a paused station is engaged and the user plays a library track
- **THEN** the transport control shows the pause glyph, matching the newly
  audible source
