# Proposal: local-library

## Why

The player still plays a hardcoded list of three external 2017-era URLs that
are mostly dead. The agreed roadmap makes the player useful for its owner:
import your own audio files, keep the library between sessions, find tracks
fast.

## What Changes

- The empty `.playlist` area becomes a library view: a search box and a track
  list (title, artist, duration, thumbnail).
- Tracks are imported three ways: drag-and-drop of files onto the page,
  "add files" via a file input (works in every browser), and - where
  supported - a directory picker (Chromium File System Access API) that
  imports all audio files in the chosen folder (non-recursive).
- Metadata (title, artist, album, duration, embedded cover art) is extracted
  from tags; when tags are missing the importer falls back to filename
  parsing ("Artist - Title.ext").
- The library persists in IndexedDB (file blobs + metadata + artwork), so
  tracks survive page reloads without re-importing.
- Selecting a track in the list plays it; the current track is highlighted.
  The player switches from hardcoded URLs to the persisted library; the
  initial library is empty.
- Fuzzy search (Fuse.js) filters the visible list as the user types.
- **BREAKING** (internal): `Playlist`/`AudioPlayer` accept blob-object URLs;
  the demo URL list is removed.
- No binary audio files are committed to the repo; e2e generates fixtures
  in memory.

## Capabilities

### New Capabilities

- `library`: importing audio files (drag-and-drop, file input, directory
  picker), tag metadata extraction with filename fallback, persistence in
  IndexedDB across reloads, artwork extraction and display, fuzzy search
  filtering, and click-to-play selection.

### Modified Capabilities

(none - the existing playback/volume/equalizer/visualizer requirements are
source-agnostic and unchanged)

## Impact

- `src/`: new modules - library store (IndexedDB wrapper), importer
  (tag extraction), library UI (list rendering, search); `main.ts` wires the
  library into the player; `Playlist`/`Track` extended for blob sources.
- `package.json`: new dependencies `music-metadata` and `fuse.js`.
- `e2e/`: fixtures generated in-page (drop events with in-memory files).
- Player startup: with an empty IndexedDB the library list is empty; no
  demo tracks.
