# Tasks: local-library

## 1. Dependencies and storage

- [x] 1.1 Install `music-metadata` and `fuse.js` as runtime dependencies. Verify: `npm install` exits 0 and `npm run build` still passes.
- [x] 1.2 Add `src/utils/idb.ts`: minimal promise wrapper (open database `audio-player` v1, `tracks` store, get/put/getAll). Verify: `npm run typecheck` green.
- [x] 1.3 Add `src/library/store.ts`: `loadTracks()`, `saveTrack(record)`, record type with `crypto.randomUUID()` ids. Verify: `npm run typecheck` green.

## 2. Import pipeline

- [x] 2.1 Add `src/library/import.ts`: audio-file filter (extensions + audio MIME), `parseBlob` metadata extraction (title/artist/album/duration/cover), filename fallback ("Artist - Title.ext"), parse-failure fallback (duration 0). Verify: `npm run typecheck` green.
- [x] 2.2 Wire dropzone (whole page + dragover highlight), "add files" input, conditional directory-picker button; imported files go through import pipeline into the store and the in-memory list. Verify: manual drop of a local audio file adds a row in `npm run dev`.

## 3. Library UI and player integration

- [x] 3.1 Render the library list in `.playlist` (thumbnail/placeholder, title - artist, duration m:ss), playing-row highlight, click-to-play via `Playlist.replaceTracks()` + blob object URLs (revoked on replace); remove the hardcoded demo tracks from `main.ts`. Verify: manual click plays the track in dev server.
- [x] 3.2 Add the search box wired to Fuse.js (keys title/artist/album, threshold 0.4) filtering the visible list; styles for list, rows, search, highlight in `main.css`. Verify: manual search narrows and restores the list.
- [x] 3.3 Restore the library from IndexedDB on page load. Verify: reload keeps tracks playable (manual).

## 4. E2E coverage

- [x] 4.1 Add e2e helpers generating in-page WAV Files (no tags and "Artist - Title.wav" naming) dispatched as drop events. Verify: drop-import test passes.
- [x] 4.2 Spec scenarios to tests: drop import adds rows with fallback metadata; non-audio drop is ignored; reload restores and plays; search narrows and restores; row click switches playback with highlight. Verify: `npm run test:e2e` green.

## 5. Final verification

- [x] 5.1 Full matrix `npm run lint && npm run typecheck && npm run format:check && npm run build && npm run test:e2e`. Verify: exit 0.
- [x] 5.2 Manual pass: directory picker (Chromium), drop UX highlight, empty-library first-run state. Verify: checklist noted in the change summary.
