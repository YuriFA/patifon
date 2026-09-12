# radio Specification (delta)

## REMOVED Requirements

### Requirement: Now-playing station display

(Removed with the station-now card: the visualization-area card is replaced
by the radio deck receiver. Its surviving behavior - pinned list row,
waveform clearing, station identity in the area - is restated below.)

## MODIFIED Requirements

### Requirement: Live stream transport semantics

Radio streams are live: the system SHALL NOT offer seeking or a playback
position for an engaged station. While a station is engaged, the deck strip
SHALL NOT retain the previously played library track's position, duration or
waveform: both time readouts SHALL be empty and the seek control SHALL be
disabled. The progress area SHALL indicate the live state with a LIVE badge
occupying the total-time slot: bright while the station plays, dimmed while
the station is paused, and hidden otherwise.

#### Scenario: Live state instead of a position

- **WHEN** a station plays
- **THEN** the progress area shows the LIVE badge in the total-time slot and
  does not offer a seek position

#### Scenario: Stale times are cleared

- **WHEN** a station takes over while a library track was loaded
- **THEN** both time readouts are empty (no duration digits from the previous
  track) and the seek control is disabled

#### Scenario: Badge dims on pause

- **WHEN** the user pauses the engaged station
- **THEN** the LIVE badge stays in place in a dimmed state

### Requirement: Playing station visibility

While a station is engaged, the system SHALL keep it visible as a pinned list
item with its own save star in radio mode, and the radio deck receiver (see
the radio-deck capability) SHALL show its name in the visualization area, so
the user always sees what is playing. The system SHALL NOT render a separate
station card in the visualization area. The visualizer SHALL NOT leave a
frozen frame behind when playback stops or radio takes over.

#### Scenario: Playing station pinned in the radio list

- **WHEN** a station is playing or paused and radio mode is open
- **THEN** the station appears as the first list row with the active
  highlight and a working save star, without duplicating a row already listed

#### Scenario: Station identity in the area

- **WHEN** a station is playing or paused and the user switches to the library
  view
- **THEN** the visualization area shows the radio deck receiver carrying the
  station's name, with no station card and no library waveform behind it

#### Scenario: Radio mode hides the library waveform

- **WHEN** a library track plays and the user opens radio mode to search
- **THEN** the waveform is cleared and not drawn behind the station list while
  radio mode is open, and resumes when the user returns to the library view
