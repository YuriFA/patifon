# volume Delta Spec

## REMOVED Requirements

### Requirement: Rotary volume control surface

(Removed by the patifon-page-port wave: the rotary knob is replaced by
the horizontal volume fader from the canonical design system. The
capability's behavioral requirements - set, mute, wheel, keyboard - are
unchanged; the surface requirement is restated below for the fader.)

## ADDED Requirements

### Requirement: Volume fader control surface

The transport volume control SHALL present a horizontal fader (recessed
rail with a fill from the rail start to the thumb and a raised fader-cap
thumb with the teal indicator line) styled to the canonical design
system, plus a round mute button showing the full/half/muted speaker
glyph. The fader SHALL support pointer drag along the rail, mouse wheel
adjustment over the volume group, and keyboard adjustment on focus; it
SHALL expose slider semantics to assistive technology (accessible name,
0..100 value range, current value as a percentage). The existing mute
toggle, wheel-adjustment, and keyboard-requirements semantics (clamping,
step sizes, mute independence) SHALL be preserved.

#### Scenario: Pointer drag changes volume

- **WHEN** the user drags the fader cap past the rail's midpoint
- **THEN** the volume exceeds 0.5 and the value exposed to assistive
  technology reflects the new percentage

#### Scenario: Keyboard steps the fader

- **WHEN** the fader is focused and the user presses the up-arrow key
- **THEN** the volume increases by one step, matching the existing
  keyboard-control step size

#### Scenario: Mute is independent of the fader position

- **WHEN** the user toggles mute at any volume
- **THEN** the volume value is unchanged and the mute glyph reflects the
  muted state
