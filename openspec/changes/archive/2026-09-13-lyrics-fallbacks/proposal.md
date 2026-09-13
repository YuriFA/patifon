# Proposal: lyrics-fallbacks

## Why

The lyrics client uses LRCLIB's exact-match endpoint (`/api/get`), which
answers 4xx whenever the artist/title/album/duration combination has no exact
record - a common case that leaves the LYRICS tab empty even though lyrics
exist under a slightly different release. Research
(`docs/research/artwork-enrichment-and-lyrics-fallbacks.md`, live-checked
2026-09-13) verified two fallbacks: LRCLIB's own `/api/search` (same CORS
profile, same record shape, returns a candidate array) and lyrics.ovh
(keyless, CORS-open, plain text only). LRCLIB stays the primary source.

## What Changes

- Chain the lookups: `/api/get` (unchanged, including the 429 retry) -> on a
  non-matching answer, `/api/search` with client-side candidate ranking
  (non-empty lyrics, non-instrumental, album match, duration proximity,
  prefer synced) -> lyrics.ovh `/v1/{artist}/{title}` as the last resort.
- Normalize artist and title before the external fallback (casefold, strip
  parenthetical qualifiers like "(Remastered ...)" / "- Live", collapse
  whitespace).
- Fallback lyrics degrade honestly: plain-only sources render without
  karaoke highlight, matching the existing plain-lyrics behavior; the cache
  shape (`plain`/`synced`, keyed by artist+title) is unchanged.
- Absence stays a normal outcome: chain exhaustion resolves to `null` and the
  muted empty state, never an error surface.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `lyrics`: the fetch requirement becomes a fallback chain with candidate
  ranking; all other lyrics requirements (cache, sync display, panel
  behavior) hold unchanged.

## Impact

- `src/lyrics/api.ts` only: `fetchLyrics` becomes the chain orchestrator plus
  a ranking helper and a lyrics.ovh client part. No store, schema, or UI
  changes.
- `e2e/lyrics.spec.ts` gains scenarios for the search fallback, ranking, and
  the external fallback (route mocks for both endpoints).
