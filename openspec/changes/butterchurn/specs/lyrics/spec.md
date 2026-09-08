# lyrics Delta Spec

## Purpose

User control over the karaoke lyrics display: the panel takes the
visualization area while shown, so its visibility must be switchable.

## ADDED Requirements

### Requirement: Karaoke display toggle

The lyrics panel display SHALL be gated by a user toggle in the
visualization area's control badges. With the toggle off, the panel SHALL
NOT be shown for any track, and the active visualizer mode SHALL keep
rendering the area. With the toggle on, the panel behaves as specified by
the lyrics capability, including resolving lyrics for the track that is
already playing when the toggle is switched on. The choice SHALL persist
across reloads and SHALL default to on.

#### Scenario: Karaoke off keeps the visualizer running

- **WHEN** the toggle is switched off while a track with lyrics plays
- **THEN** the lyrics panel is hidden and the visualization keeps rendering

#### Scenario: Enabling mid-track shows the current lyrics

- **WHEN** the toggle is switched on while a track with lyrics plays
- **THEN** the lyrics panel appears for the playing track

#### Scenario: Toggle state persists across reloads

- **WHEN** karaoke is switched off and the page reloads with a lyrics-capable
  track playing
- **THEN** the panel stays hidden until the toggle is switched on
