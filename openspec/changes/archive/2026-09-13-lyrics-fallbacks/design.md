# Design: lyrics-fallbacks

## Context

`src/lyrics/api.ts` `fetchLyrics` calls `https://lrclib.net/api/get` with
artist/title/album/duration, identifies via `X-User-Agent`, retries 429 once
honoring `Retry-After`, and treats every non-OK or empty answer as `null`.
The caller (`src/lyrics/ui.ts` `show`) caches positive results under
`lyricsKey(artist, title)` and renders `synced` as karaoke, `plain` as plain
text. Research (live-checked 2026-09-13):

- `/api/search?artist_name=&track_name=` returns an ARRAY of the same record
  shape (`trackName`, `artistName`, `albumName`, `duration` fractional,
  `instrumental`, `plainLyrics`, `syncedLyrics`), same CORS profile, and
  server ordering that puts bootlegs first - ranking must be client-side.
- `/api/get` can also return a live bootleg on a 200, so ranking is useful
  beyond 4xx recovery.
- lyrics.ovh `GET /v1/{artist}/{title}` returns `{"lyrics": "..."}`, keyless,
  CORS-open, plain only, no duration metadata.
- Musixmatch (in-band 401 without a key) and ChartLyrics (dead) are excluded;
  Genius has no lyrics body in its API.

## Goals / Non-Goals

**Goals:**

- Higher lyrics hit rate with LRCLIB remaining the only synced source.
- Zero UI/store/schema changes; honest plain-text degradation.

**Non-Goals:**

- Persisted negative caching with TTL (re-trying the chain on repeat plays
  matches today's behavior; revisit if traffic warrants).
- User-configurable sources; a "report wrong lyrics" flow.
- Any additional external providers beyond lyrics.ovh.

## Decisions

1. **Chain order: `/api/get` -> `/api/search` -> lyrics.ovh.** The search
   fallback is the cheapest (same domain, same CORS/429/X-User-Agent handling
   reusable, keeps a synced chance); the external provider is last so it is
   hit only when LRCLIB has nothing.
2. **Candidate ranking is a pure helper** over the search array: drop
   `instrumental` and records with both lyric fields empty; score exact
   normalized `albumName` match first, then duration proximity to the
   track's duration (strict within ~5 s, soft cap ~10 s - beyond that the
   candidate loses), then presence of `syncedLyrics`; pick the best, return
   `null` when no candidate survives. Normalization for comparison:
   casefold + collapsed whitespace (qualifier stripping stays
   request-side, decision 4).
3. **429 semantics:** only `/api/get` keeps its documented retry; a 429 from
   `/api/search` (same server) after a retried get means the server is
   throttling - resolve the chain to `null` for this attempt rather than
   piling retries. lyrics.ovh has no documented throttling contract; any
   non-OK is final for the chain.
4. **Normalization scope:** the LRCLIB requests keep the record's tags as-is
   (they are already filename-fallback-populated and `album_name` improves
   matching); only the lyrics.ovh artist/title path segments get
   casefolding, qualifier stripping (`(...)`/`[...]` suffixes, ` - Live`
   style suffixes) and whitespace collapsing, because that API matches a
   bare string with no duration signal.
5. **Plain-only fallbacks write `synced: null`** into the existing
   `LyricsResult`, so `saveLyrics` and rendering work untouched; the karaoke
   toggle simply has nothing to highlight. Trim the lyrics.ovh text (the
   response carries stray newlines) exactly like `plainLyrics` today.
6. **One `AbortSignal` flows through the whole chain** - a track switch or
   radio takeover aborts all in-flight requests at once, as today.
7. **Each `api.ts` stays self-contained** (repo rule): the lyrics.ovh client
   lives inside `src/lyrics/api.ts`, no shared fetch helper.

## Risks / Trade-offs

- **lyrics.ovh catalog depth and uptime are unverified beyond one live
  probe** (research 5.1/8): acceptable for a last-resort link - failures
  resolve to `null` like today.
- **Wrong-candidate picks** (covers/live versions from search): ranking on
  album + duration makes studio albums win when tags carry an album; for
  album-less records duration alone decides, and a close-duration live
  version can win - accepted, same class of error `/api/get` already makes.
- **Request fan-out** (up to 2-3 requests per uncached track): bounded by
  the existing positive cache; repeat plays never re-hit the network.
- **lyrics.ovh legal/limit posture is unpublished**: single request per
  unfound track with caching is the conservative usage; drop the provider
  immediately if it starts rejecting (non-OK -> silent absence).
