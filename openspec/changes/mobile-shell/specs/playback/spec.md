# playback Delta

## MODIFIED Requirements

### Requirement: Play a track on user gesture

The system SHALL start playback of the selected track when the user activates
the Play control. Playback SHALL begin audibly within the same user-gesture
task, satisfying browser autoplay policies; if the audio context starts in a
suspended state, the system MUST resume it as part of that gesture before
playback is expected to be heard. When no source is engaged and the library
holds tracks, activating Play SHALL engage the library source (so the
now-playing panel, MediaSession and scrobbling follow it) before playback
starts.

#### Scenario: First play after page load

- **WHEN** the page has loaded and the user clicks Play
- **THEN** the selected track starts producing sound

#### Scenario: Autoplay policy suspends audio

- **WHEN** the underlying audio context is in a suspended state when the user clicks Play
- **THEN** the system resumes the context and playback becomes audible without requiring a page reload

#### Scenario: Idle transport plays the library

- **WHEN** no source is engaged and the user activates Play while the
  library holds tracks
- **THEN** the library source engages (now-playing panel, MediaSession and
  scrobbling follow it) and the first library track starts
