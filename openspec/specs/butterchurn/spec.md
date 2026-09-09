# butterchurn Specification

## Purpose

A MilkDrop-style WebGL2 visualizer mode rendered by Butterchurn from the
existing AnalyserNode data, with mode switching, preset rotation, lazy
loading, and a no-WebGL2 fallback.

## Requirements

### Requirement: MilkDrop render mode

The visualization area SHALL offer a MilkDrop mode rendered by Butterchurn
on a WebGL2 canvas: scenes react to the playing audio through the existing
AnalyserNode. While a library track plays in MilkDrop mode, the canvas
SHALL render continuously; the classic columns renderer SHALL NOT draw at
the same time.

#### Scenario: Enabling MilkDrop

- **WHEN** the user switches the visualization to MilkDrop during library
  playback
- **THEN** the WebGL2 canvas renders butterchurn scenes and the columns
  renderer stops

#### Scenario: Mode persists across reloads

- **WHEN** MilkDrop is selected and the page reloads
- **THEN** the visualization comes back in MilkDrop mode

### Requirement: Mode switching and preset rotation

The visualization area SHALL provide a switch control to toggle between
Bars and MilkDrop, and a skip control for the current preset. Presets SHALL
rotate automatically on a fixed interval while rendering.

#### Scenario: Switch back to bars

- **WHEN** the user switches from MilkDrop back to Bars
- **THEN** the columns renderer resumes and the WebGL2 render loop stops

#### Scenario: Preset skip

- **WHEN** the user activates the preset skip control
- **THEN** the next preset loads immediately

### Requirement: Inherited exclusion rules

Radio takeovers, radio mode, and the lyrics panel SHALL clear and pause the
MilkDrop render loop exactly as they do for the columns renderer;
playback stop SHALL stop scene updates rather than rendering a frozen
reactive frame.

#### Scenario: Lyrics panel takes the area

- **WHEN** the lyrics panel is shown for the playing library track
- **THEN** the MilkDrop render loop pauses and resumes when the panel hides

#### Scenario: Radio takeover

- **WHEN** a radio station takes the transport
- **THEN** the visualization area is cleared and the render loop pauses

### Requirement: Lazy loading and WebGL2 fallback

The Butterchurn module SHALL be loaded only on first activation (separate
bundle chunk). On devices without WebGL2 the mode switch control SHALL be
hidden and the classic renderer SHALL remain the only mode.

#### Scenario: No WebGL2 support

- **WHEN** the browser cannot create a WebGL2 context
- **THEN** the mode control is absent and the columns renderer works as
  before
