# radio Delta Spec

## Purpose

Live radio inside the player: search the community station catalog, play
stations through the existing transport, and surface station metadata to the
OS. Radio is an online-only mode.

## ADDED Requirements

### Requirement: Station search by name

The system SHALL offer a radio mode that searches the radio-browser station
catalog by name and lists matching stations with their name, tags and
bitrate. When the catalog is unreachable, the system SHALL show a visible
error state instead of an empty list.

#### Scenario: Searching lists matching stations

- **WHEN** the user types a station name fragment in radio mode
- **THEN** matching stations appear in the list with name, tags and bitrate

#### Scenario: Catalog unavailable

- **WHEN** the catalog cannot be reached while searching in radio mode
- **THEN** a visible error state is shown and the previous list is not silently lost

### Requirement: Playing a station

The system SHALL start playing a station's live stream when the user
activates its row, using the existing transport controls (play/pause,
volume, mute, OS media keys). The playing station SHALL be highlighted in
the list.

#### Scenario: Click a station row

- **WHEN** the user clicks a station row
- **THEN** the station's live stream plays and the row is highlighted

#### Scenario: Transport applies to the station

- **WHEN** a station is playing and the user activates play/pause or changes the volume
- **THEN** the station playback pauses/resumes and the volume follows the same control as library playback

#### Scenario: Switching back to the library

- **WHEN** a station is playing and the user activates a library track
- **THEN** the station stops and the library track plays

### Requirement: Live stream transport semantics

Radio streams are live: the system SHALL NOT offer seeking or a playback
position for a playing station, and the progress area SHALL indicate a live
state instead of a position.

#### Scenario: Live state instead of a position

- **WHEN** a station plays
- **THEN** the progress area shows the live state and does not offer a seek position

### Requirement: Playback is reported to the catalog

The system SHALL report every station playback to the catalog's click
endpoint for that station, so community ranking counts the listen.

#### Scenario: Reporting a listen

- **WHEN** a station starts playing
- **THEN** the catalog click endpoint for that station's uuid is requested

### Requirement: Station metadata on OS surfaces

While a station plays, the system SHALL publish its name and icon to the
Media Session, and the OS play/pause action SHALL act on the station.

#### Scenario: Station on OS surfaces

- **WHEN** a station plays
- **THEN** the Media Session metadata carries the station name and icon when the station provides one, and the OS play/pause action pauses and resumes the station

### Requirement: Stream and engine support

The system SHALL play direct HTTP/ICY audio streams and SHALL play HLS
streams (`.m3u8`) through an HLS engine. The selection SHALL be automatic
per station.

#### Scenario: Direct stream plays

- **WHEN** a station's stream URL is a direct HTTP/ICY audio stream
- **THEN** it plays through the media element

#### Scenario: HLS stream plays through the HLS engine

- **WHEN** a station's stream URL is an HLS playlist
- **THEN** playback goes through the HLS engine feeding the media element

### Requirement: Failed stream shows an error state

When a station's stream cannot be played (dead stream, network failure), the
system SHALL show a visible error state on the station row instead of hanging
silently.

#### Scenario: Dead stream

- **WHEN** a station's stream fails to start or terminates with an error
- **THEN** the station row shows an error indication and playback state returns to stopped

### Requirement: Saved stations persist across sessions

The system SHALL let the user save and unsave stations from the radio list.
Saved stations SHALL persist in IndexedDB: radio mode SHALL show them without
a search, and they SHALL remain playable after a page reload.

#### Scenario: Saving a station

- **WHEN** the user activates the save control on a station row
- **THEN** the station is marked as saved and appears among the saved stations

#### Scenario: Reload shows saved stations

- **WHEN** the user reloads the page after saving stations and opens radio mode without a search query
- **THEN** the saved stations are listed and playing one of them works

### Requirement: Now-playing station display

While a station plays, the system SHALL show the playing station's name, and
its icon and tags when available, in the area otherwise occupied by the
visualizer, so the user can see what is playing.

#### Scenario: Station card in the visualization area

- **WHEN** a station plays
- **THEN** the visualization area shows the station's name and, when available, its icon and tags
