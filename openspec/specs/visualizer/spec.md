# visualizer Specification

## Purpose

Real-time frequency visualization of the audio being played, rendered on a
canvas that fills the available space above the control bar.

## Requirements

### Requirement: Live audio visualization

The system SHALL render a continuously updated visualization driven by the
frequency data of the audio currently playing. When playback stops, the
visualization MUST stop updating.

#### Scenario: Visualization follows playback

- **WHEN** a track is playing
- **THEN** the canvas shows an animation reacting to the track's frequency content, updating every animation frame

#### Scenario: Stopped playback

- **WHEN** playback is paused or stopped
- **THEN** the visualization freezes rather than animating as if audio were playing

### Requirement: Adapt to window size

The system SHALL keep the visualization canvas sized to the window area above
the control bar. On window resize the canvas MUST be resized accordingly
without requiring a reload.

#### Scenario: Window resize

- **WHEN** the user resizes the browser window while a track plays
- **THEN** the visualization resizes with the window and keeps rendering
