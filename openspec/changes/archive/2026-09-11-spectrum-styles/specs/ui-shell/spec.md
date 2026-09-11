## MODIFIED Requirements

### Requirement: Now playing panel in transport

The transport bar SHALL show a now-playing panel for library playback: a
NOW PLAYING label, the track title and artist of the active library track,
and a small live meter reacting to the audio through the shared spectrum
band mapping (mirrored bass-center layout, AGC normalization), rendered in
the currently selected spectrum style. The panel SHALL clear when playback
stops and SHALL NOT show stale track information after the track changes.
Radio playback SHALL keep the existing station card in the visualization
area; the panel SHALL NOT display radio content.

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

#### Scenario: Meter follows the selected style

- **WHEN** the user switches the spectrum style to LED while a track plays
- **THEN** the now-playing meter renders in the LED style with the same mirrored band mapping
