# visualizer Delta Spec

## MODIFIED Requirements

### Requirement: Live audio visualization

The system SHALL render a continuously updated visualization driven by the
frequency data of the audio currently playing. When playback stops, the
visualization MUST stop updating. The area SHALL show either the waveform or
the lyrics panel: when lyrics are shown for the playing track, the waveform
yields the area to them and resumes when the panel hides. A radio takeover or
a mode switch to radio SHALL clear the last frame instead of keeping it.

#### Scenario: Visualization follows playback

- **WHEN** a track is playing
- **THEN** the canvas shows an animation reacting to the track's frequency content, updating every animation frame

#### Scenario: Stopped playback

- **WHEN** playback is paused or stopped
- **THEN** the canvas no longer holds a live-looking frame: it is cleared rather than keeping a frozen waveform

#### Scenario: Lyrics panel takes the area

- **WHEN** the lyrics panel is shown for the playing library track
- **THEN** the waveform is cleared while the panel is visible and resumes when the panel hides
