# lyrics Specification

## Purpose

Song lyrics for library playback: fetch from the open LRCLIB catalog, cache
locally, and show them synchronized with the playing track.

## Requirements

### Requirement: Lyrics are fetched for the playing track

When a library track starts playing, the system SHALL request lyrics from the
LRCLIB API using the track's artist and title metadata, passing the track
duration to refine the match. The request SHALL identify the client via the
`X-User-Agent` header. Radio playback and library playback without artist or
title metadata SHALL NOT trigger requests.

#### Scenario: Lyrics requested on playback

- **WHEN** a library track with artist and title metadata starts playing
- **THEN** the LRCLIB API is queried with that artist, title and duration

#### Scenario: No request without metadata

- **WHEN** a track starts playing while radio is engaged or its artist or
  title metadata is empty
- **THEN** no lyrics request is made

### Requirement: Cached lyrics are reused

Fetched lyrics SHALL be persisted in IndexedDB keyed by artist and title, and
repeat plays SHALL use the cache without a network request. The cache SHALL
store both the plain text and the synced form when available.

#### Scenario: Repeat play uses the cache

- **WHEN** a track whose lyrics were fetched before plays again, including
  while offline
- **THEN** the lyrics come from the cache and no API request is made

### Requirement: Synchronized lyrics display

While a library track plays, the LYRICS tab is selected, and synced lyrics
are available, the system SHALL show the lyrics with the line matching the
current playback position highlighted, following the position as it
changes. Activating a line SHALL seek playback to that line's timestamp.
Plain text lyrics SHALL be shown without highlight or seeking when no
synced form exists.

#### Scenario: Highlight follows playback

- **WHEN** synced lyrics are shown and the playback position passes a timestamp
- **THEN** the corresponding line becomes the highlighted one

#### Scenario: Clicking a line seeks

- **WHEN** the user activates a synced lyrics line
- **THEN** playback seeks to that line's timestamp

#### Scenario: Plain text without timestamps

- **WHEN** only plain lyrics exist for the track
- **THEN** the text is shown without highlight or seeking affordances

### Requirement: Lyrics panel is hidden when unavailable

The system SHALL hide the lyrics panel when there are no lyrics for the track
(a not-found API answer is a normal outcome), when the track is paused it
SHALL keep the last state visible, and SHALL clear the panel when playback
stops or radio takes over. A failed lyrics request SHALL behave like no
lyrics, never as an error surface.

#### Scenario: No lyrics found

- **WHEN** the API answers that no lyrics exist for the track
- **THEN** no lyrics panel is shown and playback is unaffected

#### Scenario: Panel clears on stop and radio

- **WHEN** playback stops or a radio station takes over
- **THEN** the lyrics panel is removed from the visualization area

### Requirement: Lyrics view mode

The lyrics panel display SHALL be gated by the area's LYRICS tab instead
of a badge toggle. While a different tab is selected, the panel SHALL NOT
be shown for any track, and the selected mode SHALL keep rendering the
area. Selecting the LYRICS tab SHALL resolve and show lyrics for the
track that is already playing, exactly as the removed toggle's on-state
did. When no lyrics resolve for the playing track while the LYRICS tab
is selected, the area SHALL show a muted empty state instead of a blank
area.

#### Scenario: Another tab keeps its mode rendering

- **WHEN** the user selects the VISUALIZER or VINYL tab while a track with
  lyrics plays
- **THEN** the lyrics panel is hidden and the selected mode keeps rendering

#### Scenario: Selecting mid-track shows the current lyrics

- **WHEN** the user selects the LYRICS tab while a track with lyrics plays
- **THEN** the lyrics panel appears for the playing track

#### Scenario: Empty state without lyrics

- **WHEN** the LYRICS tab is selected and no lyrics exist for the track
- **THEN** the area shows a muted no-lyrics empty state and playback is
  unaffected
