# playlists Specification

## Purpose

Named, ordered, persistent track lists plus a play-next queue: the user
groups their library and controls the playing order.

## Requirements

### Requirement: Playlists persist across sessions

The system SHALL store playlists in IndexedDB, each with a name, an ordered
list of track references, and creation time. Playlists and their order SHALL
survive reloads and offline use. An empty playlist SHALL be a valid,
storable state.

#### Scenario: Playlist survives a reload

- **WHEN** the user creates a playlist with tracks and reloads the page
- **THEN** the playlist exists with the same name and track order

### Requirement: Creating and editing playlists

The system SHALL let the user create a playlist, rename it, delete it, add
library tracks to it from the track's row, remove tracks from it, and
reorder tracks within it. Adding a track that is already in the playlist
SHALL be allowed (duplicates permitted).

#### Scenario: Create, fill, reorder, delete

- **WHEN** the user creates a playlist, adds two tracks, moves one down and
  then deletes the playlist
- **THEN** each action is reflected immediately and the deleted playlist no
  longer appears after a reload

#### Scenario: Track deletion cleans playlists

- **WHEN** a library track that belongs to a playlist is removed from the
  library
- **THEN** the playlist no longer references it and remains playable

### Requirement: Playlists view

The system SHALL provide a playlists view mode (alongside library and radio)
listing all playlists and, when one is opened, its tracks in order with the
library row interaction set (play, remove, reorder). Activating a playlist
SHALL start playing its tracks in order.

#### Scenario: Open and play a playlist

- **WHEN** the user opens a playlist and activates its first track
- **THEN** playback starts from that track and next/prev follow the playlist
  order

#### Scenario: Now playing is highlighted

- **WHEN** a playlist track is playing
- **THEN** its row is highlighted in the open playlist view

### Requirement: Play next queue action

The system SHALL offer a "play next" action on library rows that inserts the
track into the playing order immediately after the currently playing track
without creating or modifying a playlist. The insertion SHALL apply to
subsequent next-track transitions until the queue region plays through.

#### Scenario: Play next inserts after current

- **WHEN** track A plays and the user applies "play next" to track B
- **THEN** the next transition plays B, and the transition after that resumes
  the original order
