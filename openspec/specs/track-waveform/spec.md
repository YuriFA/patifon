# track-waveform Specification

## Purpose

A seekable waveform of the playing library track: the shape of the track as
the seek bar, computed once and cached.

## Requirements

### Requirement: Peaks are computed at import

When a track is imported, the system SHALL compute waveform peaks by decoding
the audio and reducing it to a fixed-width array of amplitude buckets, and
SHALL persist the peaks in IndexedDB keyed by the track's id. Peak
computation SHALL NOT block the import result: the track becomes playable
before peaks exist.

#### Scenario: Import produces cached peaks

- **WHEN** a supported audio file is imported
- **THEN** its peaks are stored and a later play renders the waveform without
  decoding the file again

#### Scenario: Import completes without peaks

- **WHEN** peak computation fails or the container cannot be decoded
- **THEN** the import still succeeds and the track plays with the plain
  progress line

### Requirement: Waveform is shown for library playback

While a library track plays, the system SHALL render its cached peaks as a
waveform strip in the transport deck's strip row: one continuous, gapless
mirrored silhouette spanning the lane edge to edge (every column touches
its neighbor; no separated bars), the played part in the primary teal and
the remainder in the dim wave color, with a playhead line at the current
ratio. The strip row SHALL carry the current time at its left end and the
total duration at its right end. Radio streams and library tracks without
cached peaks SHALL keep the plain progress line. Peaks SHALL be computed
lazily for library tracks that lack them while such a track plays.

#### Scenario: Waveform replaces the progress line

- **WHEN** a library track with cached peaks plays
- **THEN** the strip row shows the waveform with the played ratio tinted
  and the times at the row's ends

#### Scenario: One continuous silhouette

- **WHEN** the waveform renders across the lane
- **THEN** no gap column exists between the lane edges: the silhouette is
  continuous, not separated bars

#### Scenario: Radio keeps the plain line

- **WHEN** a radio station plays
- **THEN** the plain progress line is shown and no waveform is rendered

#### Scenario: Legacy track gains a wave

- **WHEN** a library track without cached peaks plays
- **THEN** peaks are computed in the background and the wave appears
  without interrupting playback

### Requirement: Waveform is a seek surface

Activating or dragging across the waveform SHALL seek to the matching
position of the track, using the same ratio semantics as the existing seek
control. Buffer indication SHALL remain visible on the strip.

#### Scenario: Click and drag to seek

- **WHEN** the user clicks or drags across the waveform strip
- **THEN** playback moves to the matching position
