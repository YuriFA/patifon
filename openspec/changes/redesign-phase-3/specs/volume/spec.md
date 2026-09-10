# volume Delta Spec

## ADDED Requirements

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
