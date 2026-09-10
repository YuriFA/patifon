# ui-shell Delta Spec

## MODIFIED Requirements

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

## ADDED Requirements

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
