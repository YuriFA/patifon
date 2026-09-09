# media-session Specification

## Purpose

OS-level media integration: while the player runs, the operating system's
media surfaces (media keys, lock screen, notification area) show what is
playing and let the user control playback without touching the tab.

## Requirements

### Requirement: Track metadata is published to the OS

While a track is playing or paused, the system SHALL publish its title,
artist and album to the Media Session as `MediaMetadata`. When the playing
track comes from the library and carries embedded artwork, the system SHALL
publish that artwork image too. When a metadata field is missing, the
system SHALL publish the fields it has and omit the missing ones.

#### Scenario: Library track with artwork

- **WHEN** a library track with embedded artwork plays
- **THEN** the Media Session metadata carries the track title, artist, album and at least one artwork image

#### Scenario: Track without tags

- **WHEN** a track without tag metadata plays
- **THEN** the Media Session metadata carries the fields known from the file (for example the file-name-derived title and artist)

### Requirement: Playback state follows real playback

The system SHALL report `playing` to the Media Session while audio plays and
`paused` when it is paused or stopped.

#### Scenario: State transitions

- **WHEN** playback starts, pauses or resumes through any control (page or OS)
- **THEN** the Media Session playback state reports "playing" or "paused" accordingly

### Requirement: Transport actions control playback

The system SHALL register Media Session handlers for play, pause, previous
track, next track and seek-to. Activating them from the OS SHALL produce the
same behavior as the matching on-page control: play and pause toggle
playback, previous and next switch tracks, seek-to moves playback to the
requested position in the current track.

#### Scenario: OS play and pause

- **WHEN** the user activates the play or pause action on an OS media surface
- **THEN** playback starts or pauses exactly as with the on-page play/pause control

#### Scenario: OS previous and next

- **WHEN** the user activates the previous or next track action on an OS media surface
- **THEN** playback switches to the previous or next track exactly as with the on-page controls

#### Scenario: OS seek-to

- **WHEN** the user activates the seek-to action with a position in the current track
- **THEN** playback continues from that position

### Requirement: Position state is published

While a track with known duration plays, the system SHALL publish position
state (current position, duration, playback rate) so OS surfaces can render
an accurate progress indication, and SHALL keep it updated as playback
advances.

#### Scenario: Position renders on OS surfaces

- **WHEN** a track with known duration plays
- **THEN** the published position state reflects the current position, duration and playback rate

### Requirement: Graceful degradation without Media Session

In browsers or environments that do not expose `navigator.mediaSession`,
the system SHALL behave exactly as before this capability: playback works
normally and no media session code throws.

#### Scenario: Media Session unavailable

- **WHEN** the page runs in an environment without `navigator.mediaSession`
- **THEN** playback and all on-page controls work normally and no errors are reported
