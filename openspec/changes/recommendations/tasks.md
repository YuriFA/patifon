# Tasks: recommendations

## 1. API client and username

- [x] 1.1 `src/recommendations/api.ts`: `fetchCreatedFor(username)` (list),
      `fetchPlaylist(mbid)` (detail, MBID extracted from identifier URL);
      minimal shape validation; errors typed for the retry state. Reuse the
      api host; no auth header needed. Verify: e2e route mocks.
- [x] 1.2 Username persistence in `src/scrobbling/settings.ts`
      (`getUsername`/`setUsername`, key `listenbrainz-username`); store
      `user_name` in the connect flow; lazy backfill via validate-token when
      missing. Verify: e2e connect test asserts the stored username.

## 2. Matching

- [x] 2.1 `src/recommendations/match.ts`: pure matcher (normalize, exact
      artist+title, contained-title fallback, 5 s duration check) returning
      per-track resolutions over `LibraryRecord[]`. Verify: e2e seeded-library
      cases (exact, diacritics/punctuation, contained, duration mismatch,
      absent).

## 3. View section

- [x] 3.1 "Created for you" section in the playlists view index: rows with
      title/date/count, in-place expand fetching details; session memory cache;
      styles in `src/styles/recommendations.css`. Verify: e2e visual states.
- [x] 3.2 States: not connected (connect prompt opening the scrobbling
      popover), zero playlists, fetch error with retry. Verify: e2e per state.

## 4. Playback and save

- [x] 4.1 Playable matched rows via `playRecords` in LB order, disabled
      unmatched rows, playing highlight. Verify: e2e play-through.
- [x] 4.2 "Save as local playlist" action: creates a local playlist of the
      matched records (store helpers + catalog update), appears in the local
      list. Verify: e2e save-then-play from the local list.

## 5. Verification

- [x] 5.1 Full matrix `npm run lint && npm run typecheck &&
npm run format:check && npm run build && npm run test:e2e`. Verify:
      exit 0.
- [ ] 5.2 Manual pass with the real account once LB playlists exist for it:
      section lists them, matches resolve, playback and save work. Verify:
      checklist in the change summary.
