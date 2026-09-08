# library Specification

## Purpose

A local music library: the user imports their own audio files once, the
player keeps them between sessions, and the user can find and play any track
quickly.

## Requirements

### Requirement: Import audio files

The system SHALL import audio files the user drops onto the page and audio
files chosen through an "add files" control. Where the browser supports it,
the system SHALL also offer a directory picker importing the audio files of a
chosen folder (non-recursive). Files the browser cannot play MUST be ignored.

#### Scenario: Drop files onto the page

- **WHEN** the user drops audio files onto the page
- **THEN** each playable file appears in the library list

#### Scenario: Add files through the picker

- **WHEN** the user activates the "add files" control and selects audio files
- **THEN** each selected playable file appears in the library list

#### Scenario: Directory picker where supported

- **WHEN** the browser supports the File System Access directory picker and the user picks a folder with audio files
- **THEN** all directly contained audio files are imported

#### Scenario: Non-audio files are ignored

- **WHEN** the import source contains files the browser cannot play (for example a .txt or an image)
- **THEN** they are not added to the library

### Requirement: Tag metadata with filename fallback

For every imported file the system SHALL extract title, artist, album,
duration and embedded cover art from the file's tags when present. When a tag
is missing, the system SHALL fall back to parsing the file name as
"Artist - Title" and, failing that, to the bare file name.

#### Scenario: Tagged file

- **WHEN** a file with ID3/Vorbis/MP4 tags is imported
- **THEN** the library list shows the tag title, artist and album, and the duration comes from the audio itself

#### Scenario: Untagged file

- **WHEN** a file named "Artist - Title.wav" without tags is imported
- **THEN** the library list shows "Title" as the track title and "Artist" as the artist

### Requirement: Library persists across sessions

The system SHALL persist imported tracks (audio data, metadata, artwork) in
IndexedDB. After a page reload the library list SHALL be restored without
re-importing, and tracks SHALL remain playable.

#### Scenario: Reload restores the library

- **WHEN** the user reloads the page after importing tracks
- **THEN** the library list shows the same tracks and clicking one plays it

### Requirement: Fuzzy search over the library

The system SHALL filter the visible library list as the user types in the
search box, matching track title, artist and album fuzzily. Clearing the
search SHALL restore the full list.

#### Scenario: Search narrows the list

- **WHEN** the user types a fragment of a track title into the search box
- **THEN** the list narrows to matching tracks and playback of a visible track works normally

#### Scenario: Clearing search

- **WHEN** the user clears the search box
- **THEN** the full library list is shown again

### Requirement: Selecting a track plays it

The system SHALL start playing a library track when the user activates its
row in the list, and SHALL highlight the currently playing track.

#### Scenario: Click a track row

- **WHEN** the user clicks a track row while another track plays
- **THEN** playback switches to the clicked track and its row is highlighted

#### Scenario: Current track highlight

- **WHEN** a library track is playing
- **THEN** its row carries the playing highlight

### Requirement: Library rows expose playlist actions

Library rows SHALL gain "add to playlist" and "play next" actions. Existing
row behavior (activation plays the track, playback highlight) SHALL be
unchanged.

#### Scenario: Add to playlist from a row

- **WHEN** the user opens a row's playlist action and picks a playlist
- **THEN** the track is appended to that playlist without interrupting
  playback
