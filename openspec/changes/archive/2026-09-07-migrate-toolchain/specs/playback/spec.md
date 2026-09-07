## Purpose

Core music transport: loading playlist tracks into the Web Audio graph and
controlling playback (play, pause, stop, next, previous, seek) in a way that
works under modern browser autoplay policies.

## ADDED Requirements

### Requirement: Play a track on user gesture

The system SHALL start playback of the selected track when the user activates
the Play control. Playback SHALL begin audibly within the same user-gesture
task, satisfying browser autoplay policies; if the audio context starts in a
suspended state, the system MUST resume it as part of that gesture before
playback is expected to be heard.

#### Scenario: First play after page load

- **WHEN** the page has loaded and the user clicks Play
- **THEN** the selected track starts producing sound

#### Scenario: Autoplay policy suspends audio

- **WHEN** the underlying audio context is in a suspended state when the user clicks Play
- **THEN** the system resumes the context and playback becomes audible without requiring a page reload

### Requirement: Transport controls

The system SHALL provide play, pause, stop, next-track and previous-track
controls operating on the current playlist. Pause MUST retain the playback
position; stop MUST reset it. Play after pause MUST continue from the retained
position.

#### Scenario: Pause and resume

- **WHEN** a track is playing and the user pauses, then plays again
- **THEN** playback continues from the position where it paused

#### Scenario: Next and previous track

- **WHEN** the user activates next (or previous) while a track is playing
- **THEN** playback switches to the following (or preceding) playlist track and starts immediately

### Requirement: Seek within a track

The system SHALL let the user jump to an arbitrary position of the current
track through the progress bar. Seeking MUST not stop playback.

#### Scenario: Seek forward

- **WHEN** the user clicks or drags the progress bar to a position ahead of the current one
- **THEN** playback continues from the chosen position

### Requirement: No audio node accumulation across track switches

The system MUST NOT accumulate audio source nodes when tracks are switched.
Each media element MUST feed the audio graph through at most one source node
for its lifetime, and switching tracks repeatedly MUST NOT degrade audio or
leak graph nodes.

#### Scenario: Repeated track switching

- **WHEN** the user switches tracks many times in a session
- **THEN** audio keeps playing correctly and the audio graph holds no orphaned sources from previous tracks
