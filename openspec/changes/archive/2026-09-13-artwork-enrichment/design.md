# Design: artwork-enrichment

## Context

`LibraryRecord.artwork` holds the embedded cover as a `Blob | null`
(`src/library/import.ts` parses it via music-metadata; `src/library/store.ts`
persists it). Rendering derives object URLs from that field
(`artworkUrlFor` in `src/library/ui.ts`) and feeds them into the rows island
and playlists view, so any update to the field re-renders everywhere through
`notifyView`. Research (live-checked 2026-09-13):
`https://itunes.apple.com/search` is keyless, sends
`Access-Control-Allow-Origin: *`, and `artworkUrl100` upscales to a real
600x600 JPEG by replacing `100x100` with `600x600` in the URL (verified:
200, image/jpeg, 170980 bytes). MusicBrainz + Cover Art Archive were
unreachable from the probe host and stay out until re-verified. Deezer lacks
ACAO; Spotify needs a server secret.

## Goals / Non-Goals

**Goals:**

- Album art for playing tracks that lack embedded art, persisted offline as
  Blobs alongside the existing field.
- Bounded network behavior: no import-time requests, one request per album,
  session-scoped negative cache.

**Non-Goals:**

- MusicBrainz/Cover Art Archive as a (canonical) source - second iteration
  after live re-verification (research section 2.2).
- Enriching other metadata (genre, year) or artist bios.
- A manual "pick artwork" control.
- Persisted negative results across sessions.

## Decisions

1. **iTunes Search API is the only source in v1.** Keyless, CORS-open,
   live-verified. The catalog is Apple's, good enough for mainstream covers.
2. **Trigger on playback, not list rendering.** `track:play` with
   `artwork == null` and non-empty `artist` starts one enrichment. List
   rendering would fan out one request per visible row on scroll; playback is
   naturally rate-limited and matches where artwork matters most (now-playing,
   vinyl). Trade-off: rows of never-played albums keep placeholders - accepted.
3. **Query shape:** `term = artist + " " + (album ?? title)`,
   `entity=album` when the record has an album tag, else `entity=song`;
   `limit` small (3). Sanity-check the winner: normalized `artistName` must
   contain the record's normalized artist; on mismatch, treat as no match.
   This rejects cross-artist noise without a fuzzy library.
4. **Upsampling:** replace `100x100` with `600x600` in `artworkUrl100` and
   fetch the image as a `Blob` with the response content type (mirrors how
   embedded art becomes a Blob in `import.ts`). 600 covers UI needs today;
   larger sizes were not verified live.
5. **Dedup and negative cache are in-memory and session-scoped** (module-level
   `Map` for in-flight and resolved pairs, `Set` for failures). Persistence of
   negatives would need a record field or store bump; re-trying a failed album
   once per session is acceptable and self-healing.
6. **Write path:** update the in-memory record's `artwork`, `idbPut` it back
   to the `tracks` store (same shape), then `notifyView()` - existing object
   URL caching in `artworkUrlFor` keys by record id and lazily creates URLs,
   so a null-to-Blob transition needs no URL invalidation.
7. **Failure is silence:** network errors, non-OK responses, unparsable
   bodies, and sanity mismatches all resolve to `null` and mark the pair
   negatively - the placeholder stays, playback is unaffected. No console
   logging (repo rule), no error surfaces.
8. **Abort policy:** enrichment is fire-and-forget (`void`), not aborted on
   track switch - the result is album-scoped, still useful for the next track
   of the same album, and cheaper than cancelling mid-flight.

## Risks / Trade-offs

- **iTunes rate guidance (~20 req/min, not live-verified):** playback-triggered
  single requests per album stay far below it; a burst-play stress is bounded
  by the per-album dedup.
- **CORS on the image CDN itself:** status/type/size were verified live, but
  the ACAO header on the image response was not captured (research section 8).
  If the CDN ever omits ACAO, the Blob fetch fails and the feature degrades to
  placeholders - same silent path, no spec change needed. E2e mocks cover the
  happy path against the real contract shape.
- **Wrong-album matches** (compilations, same-titled albums): the artist
  containment check plus album-term search keeps this rare; a wrong-but-
  plausible cover is the accepted failure mode (deleting and re-importing
  with embedded art overrides it).
- **API drift:** iTunes Search is a long-stable documented endpoint; if it
  disappears, degradation is silent placeholders again.
