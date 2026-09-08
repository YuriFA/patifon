# scrobbling Delta Spec

## Purpose

Submit library playback to ListenBrainz: a validated user token,
playing-now listens, completed listens, and offline-safe retries.

## ADDED Requirements

### Requirement: Token setup and status

The system SHALL let the user paste a ListenBrainz user token in a control
bar popup, validate it against `/1/validate-token`, and show the connection
status. A valid token SHALL be persisted and survive reloads; scrobbling
SHALL be toggleable off and on without deleting the token. When
scrobbling is off or no valid token is set, the system SHALL submit nothing.

#### Scenario: Connect with a valid token

- **WHEN** the user pastes a valid token and confirms
- **THEN** the status shows connected, the token survives a reload, and
  library playback is scrobbled

#### Scenario: Connect with an invalid token

- **WHEN** the user pastes an invalid token and confirms
- **THEN** the status shows rejected, nothing is persisted, and nothing is
  submitted

### Requirement: Playing-now listen

When a library track starts playing and scrobbling is active, the system
SHALL submit a `playing_now` listen with the track's metadata. Rapid track
switches SHALL NOT produce more than one playing-now submission per second.
A failed playing-now submission SHALL NOT be retried or queued.

#### Scenario: Track starts playing

- **WHEN** a library track begins playing with scrobbling active
- **THEN** a playing-now listen with artist and title is submitted

#### Scenario: Rapid switching is throttled

- **WHEN** the user switches tracks faster than once per second
- **THEN** playing-now submissions keep at least one second apart

### Requirement: Completed-listen submission with completion rule

When a library track finishes naturally or is switched away from, the
system SHALL submit a single listen if the track was listened to for at
least half its duration or at least 240 seconds, whichever comes first.
Submissions shorter than the rule SHALL NOT be sent. The player MUST NOT
accumulate audio nodes or stall playback because of scrobbling.

#### Scenario: Played past the threshold

- **WHEN** a track plays past half its duration and is then switched or ends
- **THEN** one listen is submitted

#### Scenario: Skipped early

- **WHEN** the user switches away before half the duration and before 240
  seconds
- **THEN** no listen is submitted

### Requirement: Store-and-forward retry queue

Submissions that fail (offline, server error, rate limit) SHALL be queued
in IndexedDB with their metadata and submitted time, and retried when the
browser comes back online or on the next successful submission. The queue
SHALL preserve submission order and survive reloads. Queue processing
SHALL respect the API rate limit (at most one request per second).

#### Scenario: Offline listens are retried

- **WHEN** a listen submission fails while offline and connectivity returns
- **THEN** the queued listen is submitted in order

#### Scenario: Queue survives a reload

- **WHEN** listens are queued and the page reloads
- **THEN** the queue still submits them after connectivity returns

#### Scenario: Rate limit is respected

- **WHEN** several listens are queued
- **THEN** they are submitted at most one per second
