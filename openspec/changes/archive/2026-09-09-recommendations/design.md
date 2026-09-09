# Design: recommendations

## Context

- Source endpoints (probed live 2026-09-09):
  - `GET /1/user/{user}/playlists/createdfor` -> `{playlists: [{playlist:
{title, creator, date, annotation, identifier}}]}`. Public, no auth.
    Fresh accounts return `playlist_count: 0` (YuriFA today); the official
    `listenbrainz` account served the shape sample.
  - `GET /1/playlist/{mbid}` (api host) -> JSPF: `playlist.track[] = {title,
creator (artist), album, duration (ms), identifier: [recording-url],
extension[...jspf#track].additional_metadata}`. No audio URLs anywhere.
  - `identifier` values point at `listenbrainz.org/playlist/<mbid>` (HTML);
    the MBID is extracted and fetched from the api host.
  - The CF recommendations endpoint returns `204` for fresh accounts - not a
    viable primary source; the created-for-you playlists are.
- The playlists view already owns a mode flag, an index/tracks render pair,
  and the playback path for arbitrary record orders (`playRecords` in
  `library/source.ts`); local playlist records are `{id, name, trackIds[]}`
  over `LibraryRecord {title, artist, album, duration, ...}`.
- Scrobbling settings persist only the token; the username is currently
  discarded at connect time.

## Decisions

- **D1 - Source: created-for-you playlists, not CF recommendations.** CF
  answers 204 until the account accumulates data; playlists also arrive
  weekly regardless, and carry curated order. One list call per view entry;
  one detail call per playlist expand (lazy, respects the 1 rps guidance).
- **D2 - Username: persist at connect, backfill on demand.** `setToken` now
  also stores `user_name` from the validate response
  (`listenbrainz-username`). Accounts connected earlier have no stored name:
  the first time the section is shown, one `GET /1/validate-token` with the
  stored token backfills it. No reconnect required, no manual entry UI.
- **D3 - No persistence for LB playlists.** They regenerate weekly; refetch
  on playlists-view entry, keep an in-memory session cache for back/forward
  within the session. Only the username string persists.
- **D4 - Matching is a pure module.** Normalize (lowercase, trim, strip
  diacritics and punctuation); a match is equal normalized artist AND title;
  fallback: one side's normalized title contains the other and artists
  match; when both durations are known (>0) require agreement within 5 s.
  First match wins. The module takes no DOM/store dependencies so e2e and
  future unit coverage stay simple.
- **D5 - Playback through the existing path.** A playlist's matched records,
  in LB order, feed `playRecords` - next/prev, highlight, and queue
  insertion behave exactly like local playlists. Unmatched rows render
  disabled (`title` tooltip "not in library") and are skipped when building
  the play order.
- **D6 - Section lives inside the playlists view.** The index render gains a
  "Created for you" group above the local playlist list: each entry a row
  (title, generation date, track count) expanding in place to track rows.
  Local playlist records stay untouched; no rename of existing classes; new
  styles go to `src/styles/recommendations.css` to keep `main.css` clean.
- **D7 - States.** No stored token: section shows "connect via the heart
  button" with a link that opens the scrobbling popover. Token but zero
  playlists: "ListenBrainz will build these from your listening history;
  new playlists appear on Mondays". Fetch failure: inline error with a
  retry button. All copy in English, matching the app.

## Risks / Trade-offs

- Matching is heuristic; fuzzy-mismatched local files stay unplayable rather
  than playing the wrong song. Accepted: silent wrong-song playback is worse
  than a visible "not in library" row.
- LB shape changes would break the client; the client validates minimally
  (array/field presence) and degrades to the error state instead of
  throwing.
- Two extra requests per session entry are negligible against the 1 rps
  limit and the CORS-open public endpoints.
