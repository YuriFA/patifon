## Purpose

A ten-band peaking equalizer applied to all playback, with named presets and
per-band gain adjustment, preserving the frequency/gain behavior of the
original implementation.

## ADDED Requirements

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
