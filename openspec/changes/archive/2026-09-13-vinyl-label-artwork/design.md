# Design: vinyl-label-artwork

## Decisions

### The label reads artwork from the bridge, not from library internals

The deck is a Preact island and the bridge is the established one-way path
for now-playing data (`trackTitle`, `trackArtist`). Artwork is the same
category of data, so it becomes `bridge.trackArtworkUrl: signal<string | null>`,
written by the existing `syncNowPlaying`. The URL helper (`artworkUrlFor`)
moved out of `library/ui.ts` into `src/library/artwork-url.ts` (same object-URL
cache, one URL per record) so the bridge can import it without a cycle:
`library/ui.ts` imports the bridge for the enrichment poke, so the bridge must
not import `library/ui` back. `vinyl-deck.tsx` stays free of library imports.

### Late enrichment pokes the signal from the library side

`syncNowPlaying` runs on `track:play`, before an enrichment fetch resolves.
The completion path in `maybeEnrichArtwork` (after `saveTrack`) therefore
writes `bridge.trackArtworkUrl` directly, but only when the enriched record
is still `currentRecord()` - otherwise a cover fetched for track A could
land on track B that started playing meanwhile. This mirrors radio's
`src/radio/ui.ts` writing `bridge.station` from a feature folder - the
feature owns the event, the bridge owns the signal. No new event type, no
polling, no `player.on` in the component.

### The image replaces the placeholder text, not overlays it

While artwork shows, the STEREO/33⅓ RPM spans are not rendered (no
`opacity` juggling); the spindle hole stays a sibling painted on top, since
the hole punches through a real label. The `img` is `position: absolute;
inset: 0; border-radius: 50%; object-fit: cover` inside the label circle,
so it rotates with the platter for free (it sits inside the rotating
`.vinyl-deck__platter`) and any aspect ratio crops to the circle. `alt=""`
keeps it decorative: the transport panel already carries the title.

### No new geometry

The label's size, ring border, and centering are untouched; only the
content swaps. Radio takeover needs no handling of its own: the deck is
already hidden, and the source change clears the signal like it clears
title/artist.
