# ui-shell Delta Spec

## MODIFIED Requirements

### Requirement: Theme tokens

The system SHALL define its visual theme as a named token set that mirrors
the canonical design system (`.superdesign/design-system.md`, the Patifon
Warm Earth system) 1:1: the same role names (bg, card, secondary, border,
accent-tint, fg, muted, primary, destructive, metal, vinyl, wave-dim), the
mechanical shadow and texture tokens, and the mono type stack. Every view
SHALL derive its appearance from these tokens rather than hardcoded
values. Visual design changes SHALL update the canonical design system
first, then the tokens; the design system file is the source of truth for
the relationship between the two.

#### Scenario: Accent change propagates

- **WHEN** the accent token value is changed
- **THEN** every view's accent-colored elements reflect the new value without
  per-view edits

#### Scenario: Shell renders on canonical tokens

- WHEN the app loads
- THEN the shell's background resolves from the canonical bg token
  (`#f6f2ec`) and the accent role resolves to the canonical primary
  (`#0f766e`)

#### Scenario: A view needs a color the tokens do not define

- WHEN a view requires a color that no token provides
- THEN the token set gains it (with the design system updated first)
  rather than the view hardcoding a hex value
