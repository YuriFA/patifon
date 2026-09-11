# equalizer Delta Spec

## ADDED Requirements

### Requirement: Equalizer popup control

The equalizer SHALL be operated from a popup opened by its transport bar
button (per the ui-shell popups pattern). The popup SHALL present the ten
bands as vertical gain sliders derived from theme tokens; each slider SHALL
be a native range input (keyboard steppable, -12..+12 dB) or an equivalent
slider-role widget with `aria-valuenow` in dB. The preset selector SHALL
list the named presets and, when activated, apply the preset and move every
band slider to the preset's gains. Manually moving a band slider SHALL
update that band's gain live during the drag.

#### Scenario: Band slider reflects and drives gain

- **WHEN** the popup opens after the 1000 Hz band was set to +6 dB
- **THEN** the 1000 Hz slider shows +6 dB, and moving it changes the applied
  gain immediately

#### Scenario: Preset moves all band sliders

- **WHEN** the user selects a named preset
- **THEN** all ten band sliders move to the preset's gains and the audio
  graph applies them

#### Scenario: Keyboard adjustment

- **WHEN** a band slider is focused and the user presses an arrow key
- **THEN** the band's gain steps within the -12..+12 dB range
