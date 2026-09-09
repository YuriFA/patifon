# playback Specification

## ADDED Requirements

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
