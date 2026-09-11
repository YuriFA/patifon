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

### Requirement: Keyboard volume control

The volume slider SHALL be operable by keyboard alone: reachable by keyboard
focus, adjustable in discrete steps in both directions, and the mute toggle
SHALL be activatable from the keyboard. Keyboard adjustment SHALL follow the
same clamping rules as pointer adjustment.

#### Scenario: Keyboard adjustment changes loudness

- **WHEN** the volume slider is focused and the user presses the increase
  step key
- **THEN** the volume increases by one step and playback loudness reflects it

#### Scenario: Keyboard mute toggle

- **WHEN** the mute control is focused and the user activates it with the
  keyboard
- **THEN** output is muted, and activating it again restores the previous
  volume level

### Requirement: Rotary volume control surface

The transport volume control SHALL present a rotary knob styled to the
Warm Earth draft instead of a linear slider. The knob SHALL support pointer
drag (angular or vertical drag mapped onto the 0.0..1.0 range), mouse wheel
adjustment, and keyboard adjustment on focus. The knob SHALL expose the
current value to assistive technology (slider semantics: accessible name,
`aria-valuemin` 0, `aria-valuemax` 100, `aria-valuenow` as a percentage).
The existing mute toggle, wheel-adjustment, and keyboard-requirements
semantics (clamping, step sizes, mute independence) SHALL be preserved.

#### Scenario: Pointer drag changes volume

- **WHEN** the user drags the knob clockwise past its midpoint
- **THEN** the volume exceeds 0.5 and `aria-valuenow` reflects the new
  percentage

#### Scenario: Keyboard steps on the knob

- **WHEN** the knob is focused and the user presses the up-arrow key
- **THEN** the volume increases by one step, matching the existing
  keyboard-control step size

#### Scenario: Mute is independent of the knob angle

- **WHEN** the volume is muted
- **THEN** the knob keeps showing the pre-mute level and the mute state is
  visible on the control
