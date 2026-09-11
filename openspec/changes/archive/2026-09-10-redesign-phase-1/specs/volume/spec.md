# volume Delta Spec

## ADDED Requirements

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
