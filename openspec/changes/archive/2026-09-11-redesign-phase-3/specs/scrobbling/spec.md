# scrobbling Delta Spec

## ADDED Requirements

### Requirement: Scrobbling popup control

The scrobbling controls SHALL live in a popup opened by its transport bar
button (per the ui-shell popups pattern), styled from theme tokens. The
popup SHALL present the token input with its connect action, the enable
toggle, the disconnect action, the connection status line, and the pending
retry-queue hint, preserving the behavior specified by the token setup,
playing-now, submission, and retry-queue requirements.

#### Scenario: Popup presents the connection state

- **WHEN** the popup opens with a stored valid token
- **THEN** the status line shows the connected state, the enable toggle
  reflects the preference, and the token field does not leak the stored
  token value

#### Scenario: Connect flow inside the popup

- **WHEN** the user enters a token and confirms in the restyled popup
- **THEN** the validation and persistence behavior matches the token setup
  and status requirement
