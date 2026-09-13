# Proposal: artwork-enrichment

## Why

Many imported files (older rips, minimal taggers) carry no embedded cover art,
so library rows, playlists, and the now-playing surfaces show a placeholder
even though the album is famous. Research
(`docs/research/artwork-enrichment-and-lyrics-fallbacks.md`, live-checked
2026-09-13) verified a keyless, CORS-open source: the iTunes Search API
returns artwork URLs and serves a real 600x600 derivative via URL upsampling.
The player can close the gap client-side with no backend and no API key.

## What Changes

- Query the iTunes Search API for tracks that start playing with no embedded
  artwork and at least an artist tag, fetch the 600x600 image, and store it as
  a `Blob` in the existing `LibraryRecord.artwork` field (no DB schema change).
- Enrichment is lazy: triggered by playback, not import, so importing a folder
  never fires network requests.
- One request per unique (artist, album) pair per session, with failed
  lookups remembered for the session (negative cache).
- Enriched artwork flows through the existing rendering paths (library rows,
  playlists, now-playing) via the existing view snapshot - no new UI surfaces.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `library`: adds a requirement for external artwork enrichment on playback of
  tracks without embedded art.

## Impact

- New `src/library/artwork.ts` (iTunes Search client, per-album dedup,
  negative cache, image fetch). `src/library/ui.ts` gains the playback
  trigger. `e2e/library.spec.ts` (or a sibling spec) gains mocked iTunes
  scenarios.
- No IndexedDB version bump: the `tracks` store and `LibraryRecord` shape are
  unchanged; enrichment reuses the `artwork: Blob | null` field.
