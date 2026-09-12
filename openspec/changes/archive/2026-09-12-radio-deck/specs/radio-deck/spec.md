# radio-deck Specification (delta)

## ADDED Requirements

### Requirement: Radio deck owns the visualization area

While a radio station is engaged (the radio source owns the transport), the
visualization area SHALL render the radio deck receiver and the area tabs
(Lyrics / Vinyl / Visualizer) and the visualizer style controls SHALL be
hidden, regardless of the active view mode. When the station is released, the
area SHALL return to the previously selected tab and the tabs and visualizer
controls SHALL be visible again. Mode entry alone SHALL NOT show the deck:
only an engaged station does.

#### Scenario: Station engages while the library view is open

- **WHEN** a station starts playing while the library view is active
- **THEN** the visualization area shows the radio deck, the area tabs and
  visualizer style controls are hidden, and the library list keeps rendering

#### Scenario: Station release returns the previous tab

- **WHEN** a playing station is stopped
- **THEN** the deck is removed, the tabs and visualizer style controls are
  visible again, and the area shows the tab that was selected before the
  station engaged

### Requirement: Receiver anatomy

The deck SHALL render a stationary receiver: a wood-grain body with corner
screws and feet, a dot-weave speaker grille with a STEREO plate, a full-width
tuning dial glass labeled FM with an 88-108 MHz scale, a station screen, a
volume knob and a tuning knob, and a telescopic antenna. The receiver SHALL
be pure DOM/CSS (no canvas, no WebGL) and SHALL scale responsively like the
vinyl deck.

#### Scenario: Deck renders for an engaged station

- **WHEN** a station is engaged
- **THEN** the area shows the receiver with grille, dial scale, station
  screen, both knobs, antenna and feet

### Requirement: Tuning dial position

The dial needle position SHALL be a deterministic pseudo-frequency derived
from the station's uuid, mapped onto the 88-108 MHz scale. The same station
SHALL always map to the same needle position, and engaging a different
station SHALL move the needle to that station's position. When the stream is
in the error state the needle SHALL be parked at the left end of the scale.

#### Scenario: Needle position is stable per station

- **WHEN** the user stops and re-engages the same station
- **THEN** the needle returns to the same dial position

#### Scenario: Needle moves between stations

- **WHEN** the user stops one station and engages a different one
- **THEN** the needle moves to the other station's position

### Requirement: Station screen

The station screen SHALL show the engaged station's name and a secondary line
with its tags and bitrate on a dark retro display with warm glowing text.
When the stream is in the error state, the screen SHALL show a flickering
NO SIGNAL indication instead of stale station data.

#### Scenario: Screen shows the playing station

- **WHEN** a station is engaged
- **THEN** the screen shows the station's name and its tags/bitrate line

#### Scenario: Screen shows no signal on error

- **WHEN** the engaged station's stream fails
- **THEN** the screen shows a flickering NO SIGNAL indication and no station
  name

### Requirement: Volume knob

The deck's volume knob SHALL control the output volume and SHALL reflect
external volume changes (slider, wheel, mute state). The knob SHALL be
operable by pointer drag, mouse wheel and keyboard (arrow keys), SHALL expose
slider semantics (role, aria-valuenow), and SHALL be visually dimmed while
output is muted. The tuning knob SHALL be decorative only.

#### Scenario: Knob follows and drives volume

- **WHEN** the user changes the volume from the deck slider and then drags
  the knob
- **THEN** the knob rotation had reflected the slider change, and dragging it
  changes the output volume the same way the deck slider does

#### Scenario: Keyboard operates the knob

- **WHEN** the knob is focused and the user presses ArrowUp
- **THEN** the output volume increases by a step and aria-valuenow updates

### Requirement: Receiver state visuals

While the station plays, the dial and screen SHALL be lit and the antenna
SHALL be raised. While the station is paused, the receiver SHALL be dimmed
and the antenna SHALL be folded down. In the error state, the grille SHALL be
unlit and the screen SHALL show NO SIGNAL.

#### Scenario: Paused dims the receiver

- **WHEN** the user pauses the engaged station
- **THEN** the dial and screen dim and the antenna folds down, and both
  restore when playback resumes

#### Scenario: Error state visuals

- **WHEN** the engaged station's stream fails
- **THEN** the grille and dial are unlit and the screen flickers NO SIGNAL
