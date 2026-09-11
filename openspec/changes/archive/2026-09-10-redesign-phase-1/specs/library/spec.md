# library Delta Spec

## ADDED Requirements

### Requirement: Track rows are keyboard operable

A library track row SHALL be activatable (start playback of that track) using
the keyboard alone: rows SHALL be reachable by keyboard focus in list order,
and activation SHALL not require a pointer. The focused row SHALL be
visually indicated.

#### Scenario: Keyboard activation starts playback

- **WHEN** the user focuses a track row with the keyboard and activates it
- **THEN** that track starts playing and the playing highlight moves to it,
  identical to pointer activation
