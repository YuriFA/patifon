# Design: local-library

## Context

See proposal.md - Why. Relevant current state: the `.playlist` div is empty;
`AudioPlayer` owns one media element and a `Playlist` of URL-based `Track`s;
`main.ts` builds the hardcoded three-URL list; the graph is built lazily on
first gesture (phase-1 design).

## Goals / Non-Goals

**Goals:**

- Import, persist, search and play the user's own audio files, per the
  `library` capability spec.
- Keep the player core source-agnostic: library tracks are just `Track`s with
  blob-object URLs.

**Non-Goals:**

- No recursive folder scanning, no folder-handle persistence with permission
  re-prompts (a future refinement - the whole file is stored instead).
- No playlists/playlists-management UI, no sorting, no library editing
  (rename/delete) - the change covers import/persist/search/play only.
- No Vitest unit suite yet (unit testing of the store can ride on the later
  TS/testing phase if needed); e2e covers the behaviors.

## Decisions

1. **Libraries (fact-checked 2026-09-07):**
   - `music-metadata` 11.x - browser path is `import { parseBlob } from
"music-metadata"` in any bundler (exports map: default condition ships
     `lib/core.js`; Node-only parseFile sits behind the "node" condition).
     Returns `format.duration` and `common.picture[]` (`data: Uint8Array`),
     TS types included, no WASM. parseBlob failures (exotic/corrupt files)
     are caught per file - the track is still imported with fallback
     metadata and duration 0 (rendered "-:--").
   - `fuse.js` 7.x - `import Fuse from "fuse.js"`; `new Fuse(list, { keys:
["title", "artist", "album"], threshold: 0.4 })`; search results
     re-render the list.
2. **Storage: own minimal IndexedDB promise wrapper** (`src/utils/idb.ts`,
   ~60 lines, zero deps): database `audio-player` v1, object store `tracks`
   with keyPath `id` (`crypto.randomUUID()`), records
   `{ id, fileName, title, artist, album, duration, addedAt, file: Blob,
artwork: Blob | null }`. Blobs are structured-cloneable, so the audio
   bytes stay a reference to the on-disk file - no duplication concerns at
   our scale (Chrome origin quota: 60% of disk). Alternative `idb` package
   rejected: the wrapper is smaller than the dependency's value here.
3. **Player integration - the library IS the playlist.** On startup the
   store is read and `Playlist.replaceTracks()` receives `Track`s built from
   records: `src = URL.createObjectURL(record.file)` (previous URLs revoked
   on every replace), `name = record.title`. `AudioPlayer` gains
   `replaceTracks(tracks)`; transport, seek, equalizer, visualizer work
   unchanged (blob URLs need no route interception and seek natively).
   `main.ts` no longer contains the demo URL list.
4. **Import surface (progressive enhancement):**
   - whole page is a dropzone (dragover adds a visual class), files filtered
     by audio extensions (mp3, wav, ogg, oga, flac, m4a, aac, opus, webm)
     and/or `audio/*` MIME;
   - "add files" `<input type="file" multiple accept="audio/*">` - the
     universal path;
   - directory picker button rendered only when `"showDirectoryPicker" in
window` (Chromium): import the folder's direct children with the same
     filter. Native dialogs cannot be automated in e2e - picker path is
     verified manually, the other two paths are e2e-covered.
5. **UI:** the `.playlist` area becomes the library: search input on top,
   scrollable track list (thumbnail 32px or a note icon when no artwork,
   title - artist, album on hover title attr, right-aligned duration
   "m:ss"); click row plays; playing row gets an accent highlight; rows for
   the currently playing track re-render on player `track:*` events.
   All styles plain CSS in `src/styles/main.css` following phase-1 patterns.
6. **Metadata extraction** (`src/library/import.ts`): `parseBlob(file)` →
   `{ title: common.title, artist: common.artist ?? common.albumartist,
album: common.album, duration: format.duration, artwork: first picture }`;
   fallback: filename `Artist - Title.ext` split on the LAST " - "; bare
   name otherwise. Artwork `Uint8Array` → `new Blob([data], { type:
picture.format })`.

## Risks / Trade-offs

- **Storing File blobs in IndexedDB** keeps a reference, not a copy; if the
  user moves/deletes the original file the track may fail to play. Accepted
  for this change (failure surfaces as a media error; no special handling).
- **Object URL lifecycle:** URLs are revoked on library replacement; a
  playing URL is revoked only by the next replace - no user-visible issue.
- **music-metadata parse failures** on exotic containers degrade to fallback
  metadata (never block the import).
- **Fuse threshold 0.4** is a tuning default; adjusting it later is a
  one-line change.
