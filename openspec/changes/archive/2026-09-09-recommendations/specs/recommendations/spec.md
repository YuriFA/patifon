# recommendations Delta Spec

## ADDED Requirements

### Requirement: Fetch created-for-you playlists

The system SHALL fetch the user's ListenBrainz created-for-you playlists
(`GET /1/user/{username}/playlists/createdfor`) when the playlists view is
entered and render them as a "Created for you" section with title, generation
date, and track count. The ListenBrainz username SHALL come from persisted
settings stored at connect time, backfilled via `GET /1/validate-token` when
absent.

#### Scenario: Section lists remote playlists

- **WHEN** the playlists view is entered while a ListenBrainz token is
  connected and the account has created-for-you playlists
- **THEN** the section lists each playlist with its title, date, and track
  count

#### Scenario: Connected account without playlists

- **WHEN** the account returns zero created-for-you playlists
- **THEN** the section shows the "no playlists yet" guidance instead of the
  list

### Requirement: Match recommended tracks to the local library

Each playlist track SHALL be matched against the local library by normalized
artist and title (fallback: contained title with equal artist), with a 5 s
duration-agreement check when both durations are known. Matched rows SHALL
resolve to their library record; unmatched rows SHALL render disabled with a
"not in library" hint.

#### Scenario: Track present in library

- **WHEN** a recommended track's normalized artist and title equal a library
  record's
- **THEN** the row renders as playable and resolves to that record

#### Scenario: Track absent from library

- **WHEN** no library record matches a recommended track
- **THEN** the row renders disabled and excluded from playback order

### Requirement: Play a recommendation playlist

Activating a created-for-you playlist SHALL start playback of its matched
records in playlist order via the shared playback path; next, previous, and
the playing highlight SHALL follow that order until another source takes
over.

#### Scenario: Start playback from a recommendation

- **WHEN** the user activates a matched row in a created-for-you playlist
- **THEN** playback starts at that row's record and continues through the
  playlist's matched records in order

### Requirement: Save a recommendation as a local playlist

The section SHALL offer an action that copies a created-for-you playlist's
matched records into a regular local playlist, which then persists and
behaves like any local playlist.

#### Scenario: Save a recommendation

- **WHEN** the user triggers the save action on a created-for-you playlist
- **THEN** a new local playlist appears in the local list containing the
  matched records in playlist order

### Requirement: Degraded states without a connection or on failure

The section SHALL distinguish: no ListenBrainz token (prompt to connect via
the scrobbling popover), no stored username (backfill first), fetch failure
(inline error with retry).

#### Scenario: Not connected

- **WHEN** no ListenBrainz token is stored
- **THEN** the section shows the connect prompt and performs no network
  requests

#### Scenario: Fetch failure

- **WHEN** the created-for-you request fails
- **THEN** the section shows an inline error with a retry action
