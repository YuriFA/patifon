# playback Delta Spec

## ADDED Requirements

### Requirement: Playback rate

The player SHALL support a bounded playback rate for library playback,
with normal speed at the center of the range and roughly equal steps in
both directions. Changing the rate SHALL affect the audible speed
immediately, SHALL NOT require restarting playback, and the rate SHALL
persist across track changes and visualization mode switches until the
user changes it again. Radio playback SHALL NOT be affected: engaging a
station MUST NOT apply the rate to the stream, and the rate SHALL be
reapplied to subsequent library playback as set.

#### Scenario: Rate persists across tracks

- **WHEN** the user raises the playback rate and the next library track starts
- **THEN** the new track plays at the raised rate without a per-track reset

#### Scenario: Radio is unaffected

- **WHEN** a radio station takes over while the rate differs from normal
- **THEN** the station plays at its normal speed, and the rate is applied
  again when a library track plays next
