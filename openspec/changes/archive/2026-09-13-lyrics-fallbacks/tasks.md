# Tasks: lyrics-fallbacks

## 1. Search fallback with ranking

- [x] 1.1 Extend `src/lyrics/api.ts`: extract the request/X-User-Agent/429 plumbing into a helper, add `searchLyrics` against `/api/search` (artist_name, track_name, album_name when present), and a pure `rankCandidates(candidates, record)` implementing decision 2 (drop instrumental/empty, album match, duration proximity 5s/10s, prefer synced). Verify: `npm run typecheck` green.
- [x] 1.2 Chain in `fetchLyrics`: `/api/get` non-OK (non-429-final) -> `searchLyrics` -> ranked best; same `AbortSignal` across the chain; results map into the existing `LyricsResult`. Verify: `npm run build` green.

## 2. External fallback

- [x] 2.1 Add the lyrics.ovh leg to `fetchLyrics`: normalized (casefold, strip parenthetical/suffix qualifiers, collapse whitespace) artist/title path segments on `/v1/{artist}/{title}`, `{"lyrics"}` trimmed into `plain`, `synced: null`; any non-OK or unparsable answer ends the chain as `null`. Verify: `npm run typecheck` green.

## 3. E2e coverage

- [x] 3.1 Scenarios in `e2e/lyrics.spec.ts` with route mocks: exact hit short-circuits the chain (search and lyrics.ovh never requested); get-404 -> search array -> best candidate wins (candidate with matching album + closer duration preferred over a bootleg); search candidate with `syncedLyrics` renders karaoke highlight; get-404 + empty search -> lyrics.ovh plain text renders without highlight and is cached; all sources failing keeps the muted empty state. Verify: `npm run test:e2e` green.

## 4. Verification

- [x] 4.1 Full matrix `npm run lint && npm run typecheck && npm run format:check && npm run build && npm run test:e2e`. Verify: exit 0.
- [x] 4.2 Manual pass with real network: play tracks whose lyrics previously failed to resolve (the motivating Aerials case) - search fallback recovers lyrics; karaoke still works for synced candidates; plain-only tracks scroll without highlight. Verify: observed in dev.
