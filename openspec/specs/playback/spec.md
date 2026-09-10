# playback Specification

## Purpose

Core music transport: loading playlist tracks into the Web Audio graph and
controlling playback (play, pause, stop, next, previous, seek) in a way that
works under modern browser autoplay policies.

## Requirements

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
track through the progress bar. Seeking MUST not stop playback. For library
tracks with cached waveform peaks the seek affordance SHALL be the waveform
strip; otherwise the existing plain seek control SHALL be used. Seek
behavior (ratio mapping, buffer display) SHALL be unchanged.

#### Scenario: Seek forward

- **WHEN** the user clicks or drags the progress bar to a position ahead of the current one
- **THEN** playback continues from the chosen position

#### Scenario: Same seek semantics on the waveform

- **WHEN** the user seeks via the waveform strip
- **THEN** the resulting position equals the position the plain seek control
  would set for the same ratio

### Requirement: No audio node accumulation across track switches

The system MUST NOT accumulate audio source nodes when tracks are switched.
Each media element MUST feed the audio graph through at most one source node
for its lifetime, and switching tracks repeatedly MUST NOT degrade audio or
leak graph nodes.

#### Scenario: Repeated track switching

- **WHEN** the user switches tracks many times in a session
- **THEN** audio keeps playing correctly and the audio graph holds no orphaned sources from previous tracks

### Requirement: Typed playback event surface

The system SHALL expose playback lifecycle (play, pause, track switch, end)
and media progress (time updates, buffer ranges) as named events whose names
and payload types are checked at compile time. Subscribing with an event name
outside the contract MUST fail type checking, and every event handler MUST
receive its payload with the declared type so consumers need no runtime
casts to read it.

#### Scenario: Consumer subscribes to a playback event

- **WHEN** a module subscribes to a lifecycle or progress event of the player
- **THEN** the event name is validated against the event contract at compile
  time and the handler receives the documented payload type without casting

#### Scenario: Misspelled event name

- **WHEN** a consumer subscribes with an event name that is not part of the
  event contract
- **THEN** the project type check (`tsc --noEmit`) fails

### Requirement: Keyboard transport and seek

The transport controls (play/pause, next, previous) and the seek control
SHALL be operable by keyboard alone: each SHALL be reachable by keyboard
focus in reading order, activation SHALL trigger the same behavior as
pointer activation, and the focused control SHALL be visually indicated.
Seeking by keyboard SHALL move playback position in discrete steps.

#### Scenario: Keyboard play and pause

- **WHEN** the play/pause control is focused and the user activates it with
  the keyboard
- **THEN** playback starts or pauses exactly as with pointer activation

#### Scenario: Keyboard seek steps position

- **WHEN** the seek control is focused and the user presses the forward step
  key
- **THEN** playback position moves forward by a step without interrupting
  playback

### Requirement: Playback rate

The player SHALL support a bounded playback rate for library playback,
with normal speed at the center of the range and roughly equal steps in
both directions. Changing the rate SHALL affect the audible speed
immediately, SHALL NOT require restarting playback, and the rate SHALL
persist across track changes and visualization mode switches until the
user changes it again. Radio playback SHALL NOT be affected: engaging a
station MUST NOT apply the rate to the stream, and the rate SHALL be
reapplied to subsequent library playback as set.

#### Scenario: Rate persists across tracks

- **WHEN** the user raises the playback rate and the next library track starts
- **THEN** the new track plays at the raised rate without a per-track reset

#### Scenario: Radio is unaffected

- **WHEN** a radio station takes over while the rate differs from normal
- **THEN** the station plays at its normal speed, and the rate is applied
  again when a library track plays next
