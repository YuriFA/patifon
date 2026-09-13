## MODIFIED Requirements

### Requirement: Lyrics are fetched for the playing track

When a library track starts playing, the system SHALL request lyrics through
a fallback chain: the LRCLIB exact-match endpoint first, then the LRCLIB
search endpoint with client-side candidate ranking (album match, duration
proximity, preference for synced lyrics), then the lyrics.ovh API by artist
and title. LRCLIB requests SHALL identify the client via the `X-User-Agent`
header and pass the track duration to refine the match. Radio playback and
library playback without artist or title metadata SHALL NOT trigger requests.
The chain SHALL stop at the first source that returns usable lyrics.

#### Scenario: Lyrics requested on playback

- **WHEN** a library track with artist and title metadata starts playing
- **THEN** the LRCLIB exact-match endpoint is queried with that artist, title and duration

#### Scenario: Search fallback on exact-match miss

- **WHEN** the exact-match endpoint answers that no record exists and the LRCLIB search endpoint returns candidates with lyrics
- **THEN** the best candidate is chosen by album match and duration proximity, preferring synced lyrics, and no further source is queried

#### Scenario: External fallback after LRCLIB misses

- **WHEN** both LRCLIB endpoints yield no usable lyrics and lyrics.ovh returns text for the artist and title
- **THEN** the plain text is used as the lyrics with no synced form

#### Scenario: Chain exhaustion behaves like absence

- **WHEN** every source in the chain yields no usable lyrics
- **THEN** the outcome is treated as no lyrics, never as an error surface

#### Scenario: No request without metadata

- **WHEN** a track starts playing while radio is engaged or its artist or title metadata is empty
- **THEN** no lyrics request is made to any source
