# lyrics Delta Spec

## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: Karaoke display toggle

## ADDED Requirements

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
