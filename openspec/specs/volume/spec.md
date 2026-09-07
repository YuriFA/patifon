# volume Specification

## Purpose

Master output volume control for the player: setting, clamping, muting and
wheel-based adjustment of loudness.

## Requirements

### Requirement: Set master volume

The system SHALL provide a master volume control accepting values in the range
0.0 to 1.0. Values outside the range MUST be clamped to it. The current volume
MUST be observable by the UI at all times.

#### Scenario: Set volume within range

- **WHEN** the volume is set to 0.5
- **THEN** playback loudness reflects the new value

#### Scenario: Out-of-range values are clamped

- **WHEN** the volume is set to a value below 0 or above 1
- **THEN** the effective volume is clamped to 0 or 1 respectively

### Requirement: Mute and unmute

The system SHALL provide a mute toggle. Muting MUST silence output regardless
of the volume setting; unmuting MUST restore the previous volume level.

#### Scenario: Mute while playing

- **WHEN** a track is playing at volume 0.8 and the user mutes
- **THEN** output is silent, and after unmuting loudness returns to 0.8

### Requirement: Wheel-based volume adjustment

The system SHALL adjust the volume when the user scrolls the wheel over the
volume control, in small discrete steps, without unmuting a muted player.

#### Scenario: Scroll over volume control

- **WHEN** the user scrolls the wheel up over the volume slider while unmuted at volume 0.5
- **THEN** the volume increases by one step and stays clamped to the 0..1 range
