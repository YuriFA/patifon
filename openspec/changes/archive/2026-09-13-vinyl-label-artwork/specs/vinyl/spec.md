## ADDED Requirements

### Requirement: Center label artwork

The deck's center label SHALL render the loaded library track's artwork as a
circular image filling the label whenever the track has artwork - embedded on
import, persisted from earlier enrichment, or enriched during playback - in
place of the static STEREO/33⅓ RPM text. The artwork SHALL rotate with the
platter and the spindle hole SHALL remain visible on top of it. When the
track has no artwork the label SHALL keep the static STEREO/33⅓ RPM
placeholder. The label content SHALL follow the engaged source: track
changes and source release swap or clear it like the now-playing panel, and
a radio takeover still clears the whole deck.

#### Scenario: The label shows the track's cover

- **WHEN** a track with artwork is loaded in VINYL mode
- **THEN** the center label renders the artwork as a circular image instead
  of the STEREO/33⅓ RPM text, with the spindle hole on top

#### Scenario: Artless tracks keep the placeholder

- **WHEN** the loaded track has no artwork
- **THEN** the center label shows the static STEREO/33⅓ RPM placeholder and
  no artwork image

#### Scenario: A late enrichment swaps the placeholder

- **WHEN** a track without artwork starts playing and the catalog enrichment
  delivers a cover afterwards
- **THEN** the label replaces the placeholder with the cover without a track
  change or manual refresh

#### Scenario: The label follows track changes

- **WHEN** playback moves from a track with artwork to one without
- **THEN** the label swaps back to the static placeholder
