# equalizer Specification

## Purpose

A ten-band peaking equalizer applied to all playback, with named presets and
per-band gain adjustment, preserving the frequency/gain behavior of the
original implementation.

## Requirements

### Requirement: Ten-band peaking equalizer

The system SHALL apply a ten-band peaking filter chain to playback with center
frequencies 60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000 and 16000 Hz.
Each band's gain SHALL be adjustable within +/-12 dB, and values outside that
range MUST be rejected or clamped.

#### Scenario: Boost a band

- **WHEN** the user drags the 1000 Hz band slider to +6 dB while a track plays
- **THEN** the audible frequency response of playback changes accordingly

#### Scenario: Gain limits

- **WHEN** a band gain beyond +12 dB or below -12 dB is requested
- **THEN** the applied gain stays within the +/-12 dB range

### Requirement: Named presets

The system SHALL provide the named equalizer presets shipped with the player
(each mapping gains to all ten bands) and let the user apply any preset with
one action. Applying a preset MUST set every band to its preset value.

#### Scenario: Apply a preset

- **WHEN** the user selects a preset from the equalizer popup
- **THEN** all ten band sliders move to the preset's gains and playback reflects them immediately

### Requirement: Equalizer popup control

The equalizer SHALL be operated from a popup opened by its transport bar
button (per the ui-shell popups pattern). The popup SHALL present the ten
bands as vertical gain sliders derived from theme tokens; each slider SHALL
be a native range input (keyboard steppable, -12..+12 dB) or an equivalent
slider-role widget with `aria-valuenow` in dB. The preset selector SHALL
list the named presets and, when activated, apply the preset and move every
band slider to the preset's gains. Manually moving a band slider SHALL
update that band's gain live during the drag.

While a radio station is engaged, the popup SHALL additionally show a notice
that the equalizer affects library playback only; the notice SHALL NOT be
shown while a library source is engaged.

#### Scenario: Band slider reflects and drives gain

- **WHEN** the user moves the 60 Hz band slider
- **THEN** the 60 Hz gain follows the slider value live

#### Scenario: Preset moves all band sliders

- **WHEN** the user activates a preset in the selector
- **THEN** the preset is applied and every band slider moves to the preset's gains

#### Scenario: Keyboard adjustment

- **WHEN** a band slider is focused and the user presses an arrow key
- **THEN** the band's gain changes by one step and aria-valuenow updates

#### Scenario: Radio notice while a station is engaged

- **WHEN** the user opens the equalizer popup while a radio station is engaged
- **THEN** the popup shows a notice that the equalizer affects library
  playback only

#### Scenario: No radio notice for library playback

- **WHEN** the user opens the equalizer popup while a library track plays
- **THEN** the popup shows no radio notice
