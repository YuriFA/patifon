# ui-shell Delta Spec

## ADDED Requirements

### Requirement: Transport popups

The transport bar's popups (scrobbling, equalizer) SHALL open and close
from their bar buttons: activating a button toggles its popup, the button
SHALL expose the open state via `aria-expanded`, and an open popup SHALL
close on Escape and on pointer-down outside it. Each popup SHALL be styled
from theme tokens.

#### Scenario: Button toggles its popup

- **WHEN** the user activates the equalizer button
- **THEN** the equalizer popup opens and the button reports
  `aria-expanded="true"`

#### Scenario: Escape closes

- **WHEN** a popup is open and the user presses Escape
- **THEN** the popup closes and `aria-expanded` reports `"false"`

#### Scenario: Outside click closes

- **WHEN** a popup is open and the user presses the pointer outside the
  popup and outside its button
- **THEN** the popup closes
