## ADDED Requirements

### Requirement: External artwork enrichment on playback

When a library track without embedded artwork starts playing and the track
has an artist, the system SHALL query an external artwork catalog (iTunes
Search API) once per unique artist-and-album pair per session, fetch the
cover image, and persist it as the track's artwork `Blob` in IndexedDB using
the existing artwork field. Tracks that already carry artwork, tracks without
an artist, radio playback, and imports themselves SHALL NOT trigger catalog
requests. A failed lookup (no match, network error, unparsable response)
SHALL be remembered for the session and leave playback and the placeholder
rendering unaffected.

#### Scenario: Playing an artless track enriches it

- **WHEN** a track with no embedded artwork but with artist metadata starts playing
- **THEN** the catalog is queried for that artist and album, the cover image is persisted as the track's artwork, and the library row and now-playing surfaces show it

#### Scenario: Enrichment persists across reloads

- **WHEN** the page is reloaded after a track's artwork was enriched
- **THEN** the track still shows the enriched artwork without any new catalog request

#### Scenario: One request per album

- **WHEN** a second track of an album whose artwork was already enriched (or already failed enrichment) starts playing in the same session
- **THEN** no additional catalog request is made for that album

#### Scenario: Embedded artwork wins

- **WHEN** a track with embedded artwork plays
- **THEN** no catalog request is made and the embedded artwork is used

#### Scenario: No artist, no request

- **WHEN** a track without artist metadata starts playing
- **THEN** no catalog request is made

#### Scenario: Failed lookup degrades silently

- **WHEN** the catalog has no match for the artist and album or the request fails
- **THEN** the track keeps its placeholder, playback is unaffected, and the failure is not re-attempted for that album in the same session
