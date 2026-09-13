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

### Requirement: Track rows are keyboard operable

A library track row SHALL be activatable (start playback of that track) using
the keyboard alone: rows SHALL be reachable by keyboard focus in list order,
and activation SHALL not require a pointer. The focused row SHALL be
visually indicated.

#### Scenario: Keyboard activation starts playback

- **WHEN** the user focuses a track row with the keyboard and activates it
- **THEN** that track starts playing and the playing highlight moves to it,
  identical to pointer activation

### Requirement: External artwork enrichment on playback

When a library track without embedded artwork starts playing and the track
has an artist, the system SHALL query an external artwork catalog (iTunes
Search API) once per unique artist-and-album pair per session, fetch the
cover image, and persist it as the track's artwork `Blob` in IndexedDB using
the existing artwork field. Tracks that already carry artwork, tracks without
an artist, radio playback, and imports themselves SHALL NOT trigger catalog
requests. A failed lookup (no match, network error, unparsable response)
SHALL be remembered for the session and leave playback and the placeholder
rendering unaffected.

#### Scenario: Playing an artless track enriches it

- **WHEN** a track with no embedded artwork but with artist metadata starts playing
- **THEN** the catalog is queried for that artist and album, the cover image is persisted as the track's artwork, and the library row and now-playing surfaces show it

#### Scenario: Enrichment persists across reloads

- **WHEN** the page is reloaded after a track's artwork was enriched
- **THEN** the track still shows the enriched artwork without any new catalog request

#### Scenario: One request per album

- **WHEN** a second track of an album whose artwork was already enriched (or already failed enrichment) starts playing in the same session
- **THEN** no additional catalog request is made for that album

#### Scenario: Embedded artwork wins

- **WHEN** a track with embedded artwork plays
- **THEN** no catalog request is made and the embedded artwork is used

#### Scenario: No artist, no request

- **WHEN** a track without artist metadata starts playing
- **THEN** no catalog request is made

#### Scenario: Failed lookup degrades silently

- **WHEN** the catalog has no match for the artist and album or the request fails
- **THEN** the track keeps its placeholder, playback is unaffected, and the failure is not re-attempted for that album in the same session
