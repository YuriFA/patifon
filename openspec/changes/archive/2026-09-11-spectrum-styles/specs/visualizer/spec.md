## MODIFIED Requirements

### Requirement: Live audio visualization

The system SHALL render a continuously updated visualization driven by the
frequency data of the audio currently playing, tapped from the audio graph
before the volume gain node: the visualization MUST NOT follow the volume
control, while equalizer adjustments still apply. When playback stops, the
visualization MUST stop updating: columns sink with a short animated
release and the canvas ends cleared rather than keeping a frozen frame.
The area SHALL show the content of the mode selected in the area's mode
switcher; no mode SHALL take the area automatically. A radio takeover or a
mode switch to radio SHALL clear the last frame instead of keeping it.

#### Scenario: Visualization follows playback

- **WHEN** a track is playing in VISUALIZER mode
- **THEN** the canvas shows an animation reacting to the track's frequency content, updating every animation frame

#### Scenario: Volume knob does not move the visualization

- **WHEN** a track is playing in VISUALIZER mode and the user changes the output volume
- **THEN** the visualization keeps the same amplitude, driven by the pre-volume signal

#### Scenario: Stopped playback

- **WHEN** playback is paused or stopped
- **THEN** the columns fall with a short animated release and the canvas holds no live-looking frame once the release ends

#### Scenario: Other modes do not trigger the renderer

- **WHEN** the LYRICS or VINYL tab is selected
- **THEN** neither the spectrum canvas nor the MilkDrop canvas draws a live frame

#### Scenario: Lyrics panel takes the area

- **WHEN** the lyrics panel is shown for the playing library track in LYRICS
  mode
- **THEN** the waveform is cleared while the panel is visible and resumes
  when the area switches back to VISUALIZER mode

### Requirement: Two render modes

The visualization area SHALL be switched between exactly three modes at a
time - LYRICS, VINYL, VISUALIZER - by the area's top-right tab switcher,
and the selected mode SHALL persist across reloads. The VISUALIZER mode
SHALL render library playback through exactly one of its two renderers -
the spectrum renderer (in its selected style, per the Spectrum styles
requirement) or the MilkDrop renderer, selected by the user and persisted,
with the MilkDrop preset-skip affordance available while MilkDrop is
active. The VINYL mode SHALL require WebGL2-free rendering: it SHALL work
in browsers without WebGL2, and both spectrum styles SHALL too. When a
mode's preconditions do not hold (radio, stopped playback), the area SHALL
follow the existing clear/pause rules.

#### Scenario: Exactly one mode draws

- **WHEN** MilkDrop is selected under the VISUALIZER tab and a library track plays
- **THEN** only the WebGL2 canvas renders and the spectrum canvas holds no live drawing

#### Scenario: Mode tabs switch the area

- **WHEN** the user clicks the VINYL tab while the VISUALIZER mode is selected
- **THEN** the visualization renderers stop drawing and the turntable deck becomes the area's content

#### Scenario: Selected mode persists

- **WHEN** the user selects the LYRICS tab and reloads the app
- **THEN** the visualization area shows the lyrics view without an additional switch

#### Scenario: Tabs work without WebGL2

- **WHEN** the browser does not support WebGL2
- **THEN** the LYRICS and VINYL tabs remain available and both spectrum styles render, while only the MilkDrop renderer is unavailable

## ADDED Requirements

### Requirement: Spectrum styles

The spectrum renderer SHALL offer exactly two styles - the LCD matrix
(default on a fresh profile) and the LED ladder - both drawn on the 2D
canvas from the same band data. The style SHALL be selected by two latched
buttons in the visualization area's control row (`.visualizer-controls`),
visible only while the VISUALIZER tab is active, and the choice SHALL
persist across reloads. Switching styles SHALL NOT reflow the
visualization area: both styles render into the same canvas at the same
size and position. Each style SHALL draw discrete columns with per-column
peak-hold markers and leave the unlit structure faintly visible (unlit
segments for the LED ladder, unlit cell ghosts for the LCD matrix).

#### Scenario: Default style is LCD

- **WHEN** the app loads on a fresh profile and VISUALIZER mode plays a track
- **THEN** the LCD matrix style renders

#### Scenario: Style switch does not reflow

- **WHEN** the user switches between the LCD and LED buttons while a track plays
- **THEN** the canvas keeps its exact size and position and only the column rendering changes

#### Scenario: Style persists

- **WHEN** the user selects the LED ladder and reloads the app
- **THEN** the spectrum renderer starts in the LED style without an additional switch

#### Scenario: Style buttons belong to the VISUALIZER tab

- **WHEN** the LYRICS or VINYL tab is selected
- **THEN** the style buttons are hidden

### Requirement: Spectrum band mapping

The spectrum renderer and the transport's live meter SHALL map analyser
frequency data onto columns through one shared pipeline: logarithmically
spaced bands covering 40 Hz to 16 kHz, each band aggregating the peak of
its bins; a mirrored layout with the lowest band at the center column and
higher bands toward both edges; recent-peak (AGC) normalization with a
slow decay so the display uses its full height regardless of track
loudness; per-column instant attack and smooth release; and a slowly
falling peak-hold marker above each column. The band count SHALL be
derived from the available width so columns fill it edge to edge.

#### Scenario: Bass sits in the center

- **WHEN** a bass-heavy track plays in either spectrum style
- **THEN** the center columns are the tallest and the heights fall off toward both edges symmetrically

#### Scenario: Quiet masters still fill the display

- **WHEN** a quietly mastered track plays
- **THEN** AGC normalization keeps the columns reaching near the full height instead of hugging the floor

#### Scenario: Peak-hold markers

- **WHEN** a column's level drops after a peak
- **THEN** a peak-hold marker stays above the column and falls slowly

#### Scenario: Columns fill the width

- **WHEN** the window is resized while a track plays
- **THEN** the band count adapts so the columns span the canvas width edge to edge
