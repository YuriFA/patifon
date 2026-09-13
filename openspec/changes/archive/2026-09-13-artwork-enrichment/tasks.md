# Tasks: artwork-enrichment

## 1. Catalog client

- [x] 1.1 Add `src/library/artwork.ts`: `fetchExternalArtwork(record)` resolving to `Blob | null` - iTunes Search request (`entity=album` with album term, `entity=song` fallback, limit 3, artist containment sanity check), `artworkUrl100` 100x100 -> 600x600 replacement, image fetched as `Blob`; every failure path resolves to `null` (no throws, no console). Verify: `npm run typecheck` green.

## 2. Orchestration and persistence

- [x] 2.1 In `src/library/artwork.ts`: session-scoped per-(artist, album) dedup with in-flight promise sharing and a negative `Set`; exports a single `enrichArtwork(record)` entry point. Verify: `npm run typecheck` green.
- [x] 2.2 Wire the trigger in `src/library/ui.ts`: on `track:play`, when the playing record has `artwork == null` and an artist, run enrichment, write the `Blob` back through `idbPut` (tracks store, unchanged schema), update the in-memory record, and `notifyView()`. Verify: `npm run build` green; manual pass - play an artless MP3 in dev, row and vinyl art appear after the fetch.

## 3. E2e coverage

- [x] 3.1 Mocked iTunes routes in the e2e suite: playing an artless track fetches and shows the artwork (route returns a search result plus a tiny image body); the enriched art survives reload via IndexedDB; a second track of the same album triggers exactly one search request (request count asserted); embedded-artwork tracks and missing-artist tracks trigger no request; a 404 catalog answer keeps the placeholder. Verify: `npm run test:e2e` green.

## 4. Verification

- [x] 4.1 Full matrix `npm run lint && npm run typecheck && npm run format:check && npm run build && npm run test:e2e`. Verify: exit 0.
- [x] 4.2 Manual pass with real network: play `~/Downloads/system-of-a-down-aerials.mp3` (no embedded art, artist tagged) - cover appears after playback starts; offline reload keeps it. Verify: observed in dev.
