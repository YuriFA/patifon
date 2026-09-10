# vinyl Delta Spec

## Purpose

The VINYL visualization mode: a turntable deck rendered for library
playback, with a start/stop control and a functional pitch fader.

## ADDED Requirements

### Requirement: Vinyl view mode

When the VINYL tab is selected and a library track is loaded, the
visualization area SHALL render the turntable deck: a plinth with a
platter, center label and tonearm. The platter SHALL rotate while the
track plays and stand still when paused or stopped; the tonearm SHALL
rest on the platter while playing and lift off otherwise. A radio
takeover SHALL clear the deck the same way the area is cleared for other
library-only modes.

#### Scenario: Deck follows playback state

- **WHEN** the user pauses a playing track in VINYL mode
- **THEN** the platter stops rotating and the tonearm lifts, and both
  resume when playback resumes

#### Scenario: Radio clears the deck

- **WHEN** a radio station takes over while VINYL mode is selected
- **THEN** the deck is removed from the visualization area instead of
  rendering an idle turntable

### Requirement: Deck start/stop control

The deck SHALL expose a start/stop control that toggles playback of the
loaded track, equivalent to the transport play/pause control. The control
SHALL be keyboard reachable and its state SHALL reflect the playing
state.

#### Scenario: Start/stop from the deck

- **WHEN** the user activates the deck's start/stop control while a track
  is paused
- **THEN** the track starts playing exactly as if the transport
  play/pause was used

### Requirement: Pitch fader

The deck SHALL expose a vertical pitch fader with a display range of
-8 to +8 and normal speed at the center position. The fader SHALL be
adjustable by pointer and by keyboard in discrete steps, SHALL show its
current value, and SHALL apply the resulting playback rate to the loaded
library track immediately while it plays.

#### Scenario: Fader changes audible speed

- **WHEN** the user moves the pitch fader from the center to +4 while a
  track plays
- **THEN** the track's playback rate increases and subsequent movement
  back to the center restores normal speed

#### Scenario: Keyboard steps the fader

- **WHEN** the fader is focused and the user presses the increase step key
- **THEN** the displayed value steps up by one and the playback rate
  follows
