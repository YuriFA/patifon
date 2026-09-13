# Proposal: vinyl-label-artwork

## Why

The VINYL deck's center label is a static "STEREO / 33⅓ RPM" placeholder even
when the playing track carries album artwork (embedded on import or enriched
from the catalog). A real record's label is its identity surface: showing the
cover there is the single most recognizable vinyl affordance still missing
from the deck. The artwork-enrichment change already anticipated this surface
("row and vinyl art appear after the fetch") but nothing rendered it.

## What Changes

- When the loaded library track has artwork, the center label renders it: a
  circular `img` filling the label inside its dark ring, rotating with the
  platter, with the spindle hole on top. The STEREO/33⅓ RPM spans are omitted
  while artwork shows.
- When the track has no artwork, the label stays exactly as it is today
  (static placeholder, spindle hole).
- Artwork follows the engaged source: the label shares the bridge's
  now-playing data path (a new `trackArtworkUrl` signal), so track changes,
  source release, and late enrichment (a cover fetched after playback
  started) all update the label.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `vinyl`: the vinyl view mode requirement now specifies the label content -
  track artwork when available, static placeholder otherwise.

## Impact

- `src/ui/bridge.ts`: one new signal (`trackArtworkUrl`), written by the
  existing `syncNowPlaying` alongside title/artist.
- `src/library/ui.ts`: the enrichment completion writes the signal (same
  pattern as radio writing `bridge.station`).
- `src/ui/vinyl-deck.tsx`: conditional label content (img vs spans).
- `src/styles/main.css`: `.vinyl-deck__label-art` rule.
- `e2e/vinyl.spec.ts`: scenarios for embedded artwork, artless placeholder,
  and enrichment swapping the placeholder for the fetched cover.
- No persistence, schema, or network changes.
