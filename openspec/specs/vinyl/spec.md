# vinyl Specification

## Purpose

The VINYL visualization mode: a turntable deck rendered for library
playback, with a start/stop control and a functional pitch fader.

## Requirements

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

### Requirement: Center label artwork

The deck's center label SHALL render the loaded library track's artwork as a
circular image filling the label whenever the track has artwork - embedded on
import, persisted from earlier enrichment, or enriched during playback - in
place of the static STEREO/33⅓ RPM text. The artwork SHALL rotate with the
platter and the spindle hole SHALL remain visible on top of it. When the
track has no artwork the label SHALL keep the static STEREO/33⅓ RPM
placeholder. The label content SHALL follow the engaged source: track
changes and source release swap or clear it like the now-playing panel, and
a radio takeover still clears the whole deck.

#### Scenario: The label shows the track's cover

- **WHEN** a track with artwork is loaded in VINYL mode
- **THEN** the center label renders the artwork as a circular image instead
  of the STEREO/33⅓ RPM text, with the spindle hole on top

#### Scenario: Artless tracks keep the placeholder

- **WHEN** the loaded track has no artwork
- **THEN** the center label shows the static STEREO/33⅓ RPM placeholder and
  no artwork image

#### Scenario: A late enrichment swaps the placeholder

- **WHEN** a track without artwork starts playing and the catalog enrichment
  delivers a cover afterwards
- **THEN** the label replaces the placeholder with the cover without a track
  change or manual refresh

#### Scenario: The label follows track changes

- **WHEN** playback moves from a track with artwork to one without
- **THEN** the label swaps back to the static placeholder

### Requirement: Deck start/stop control

The deck SHALL expose a start/stop control that toggles playback of the
loaded track, equivalent to the transport play/pause control: both SHALL
follow the engaged source. With a station engaged the control SHALL act
on the station (toggling the station's playback) and MUST NOT start
library audio. The control SHALL be keyboard reachable and its state
SHALL reflect the playing state of the engaged source.

#### Scenario: Start/stop from the deck

- **WHEN** the user activates the deck's start/stop control while a track
  is paused
- **THEN** the track starts playing exactly as if the transport
  play/pause was used

#### Scenario: Engaged station keeps the library silent

- **WHEN** a radio station is engaged and the deck's start/stop control
  activates in any state where it is reachable
- **THEN** the station's playback toggles and no library track starts

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
