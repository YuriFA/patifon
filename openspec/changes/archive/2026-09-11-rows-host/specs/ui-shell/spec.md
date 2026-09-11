## MODIFIED Requirements

### Requirement: Region ownership per active mode

Each region of the shell SHALL have exactly one writer at a time. The
shared list region SHALL be rendered by the active view's owner: the
library view in library mode, radio in radio mode, playlists in playlists
mode. A non-owning view MUST NOT write into a region while another view
owns it. A mode switch SHALL hand the list over exactly once: the
previous view's rows MUST NOT remain visible or reappear after the
incoming view's rows are rendered. The sidebar chrome (context action
buttons, search placeholder) SHALL reflect the active view mode and
MUST NOT be mutated by a non-owning view.

#### Scenario: Ownership handoff on mode switch

- **WHEN** the user switches from library to radio
- **THEN** the library's writer stops writing the list and radio's writer
  renders the station content into it, with no interleaved or duplicated
  rows

#### Scenario: Exactly one handover per switch

- **WHEN** the user switches view modes in either direction across
  library, radio and playlists
- **THEN** the list content is replaced exactly once per switch, the
  previous view's rows are gone before the new view's rows appear, and
  the empty hint (when shown) belongs to the active view

#### Scenario: Sidebar chrome follows the mode

- **WHEN** the user enters radio mode, then playlists mode, then library
  mode
- **THEN** the context actions shown are the active mode's own actions
  (import in library, new-playlist/back in playlists), the other modes'
  actions are hidden, and the search placeholder names the active mode's
  search target
