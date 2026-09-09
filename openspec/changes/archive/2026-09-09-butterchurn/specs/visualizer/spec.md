# visualizer Delta Spec

## Purpose

The visualization area hosts two render modes for library playback: the
classic column renderer and the MilkDrop (Butterchurn) renderer. Clear and
pause rules apply to both.

## ADDED Requirements

### Requirement: Two render modes

The visualization area SHALL render library playback in exactly one of two
modes at a time: the classic columns renderer or the MilkDrop renderer,
selected by the user and persisted. When neither mode's preconditions hold
(radio, lyrics, stopped playback), the area SHALL follow the existing
clear/pause rules.

#### Scenario: Exactly one mode draws

- **WHEN** MilkDrop mode is selected and a library track plays
- **THEN** only the WebGL2 canvas renders and the columns canvas holds no
  live drawing
