# playback Delta Spec

## ADDED Requirements

### Requirement: Keyboard transport and seek

The transport controls (play/pause, next, previous) and the seek control
SHALL be operable by keyboard alone: each SHALL be reachable by keyboard
focus in reading order, activation SHALL trigger the same behavior as
pointer activation, and the focused control SHALL be visually indicated.
Seeking by keyboard SHALL move playback position in discrete steps.

#### Scenario: Keyboard play and pause

- **WHEN** the play/pause control is focused and the user activates it with
  the keyboard
- **THEN** playback starts or pauses exactly as with pointer activation

#### Scenario: Keyboard seek steps position

- **WHEN** the seek control is focused and the user presses the forward step
  key
- **THEN** playback position moves forward by a step without interrupting
  playback
