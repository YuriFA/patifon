## MODIFIED Requirements

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
