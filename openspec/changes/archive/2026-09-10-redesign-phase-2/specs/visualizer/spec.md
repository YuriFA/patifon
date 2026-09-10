# visualizer Delta Spec

## MODIFIED Requirements

### Requirement: Live audio visualization

The system SHALL render a continuously updated visualization driven by the
frequency data of the audio currently playing. When playback stops, the
visualization MUST stop updating. The area SHALL show the content of the
mode selected in the area's mode switcher; no mode SHALL take the area
automatically. A radio takeover or a mode switch to radio SHALL clear the
last frame instead of keeping it.

#### Scenario: Visualization follows playback

- **WHEN** a track is playing in VISUALIZER mode
- **THEN** the canvas shows an animation reacting to the track's frequency content, updating every animation frame

#### Scenario: Stopped playback

- **WHEN** playback is paused or stopped
- **THEN** the canvas no longer holds a live-looking frame: it is cleared rather than keeping a frozen waveform

#### Scenario: Other modes do not trigger the renderer

- **WHEN** the LYRICS or VINYL tab is selected
- **THEN** neither the columns canvas nor the MilkDrop canvas draws a live frame

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
the classic columns renderer or the MilkDrop renderer, selected by the
user and persisted, with the MilkDrop preset-skip affordance available
while MilkDrop is active. The VINYL mode SHALL require WebGL2-free
rendering: it SHALL work in browsers without WebGL2. When a mode's
preconditions do not hold (radio, stopped playback), the area SHALL
follow the existing clear/pause rules.

#### Scenario: Exactly one mode draws

- **WHEN** MilkDrop is selected under the VISUALIZER tab and a library track plays
- **THEN** only the WebGL2 canvas renders and the columns canvas holds no live drawing

#### Scenario: Mode tabs switch the area

- **WHEN** the user clicks the VINYL tab while the VISUALIZER mode is selected
- **THEN** the visualization renderers stop drawing and the turntable deck becomes the area's content

#### Scenario: Selected mode persists

- **WHEN** the user selects the LYRICS tab and reloads the app
- **THEN** the visualization area shows the lyrics view without an additional switch

#### Scenario: Tabs work without WebGL2

- **WHEN** the browser does not support WebGL2
- **THEN** the LYRICS and VINYL tabs remain available and only the MilkDrop renderer is unavailable
