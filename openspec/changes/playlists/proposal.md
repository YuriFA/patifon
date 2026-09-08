# Proposal: playlists

## Why

The player has no playlists: the library doubles as a single playlist, so the
user cannot group tracks (albums, moods, favorites), queue "play next", or
keep a listening order across sessions. Every mainstream player treats
playlists as core functionality; the research (`docs/research/product-and-audio-landscape-directions.md`
section 1.1) lists them as the missing layer of the "local Spotify" stack.

## What Changes

- New "playlists" capability: named, ordered, persistent track lists stored in
  IndexedDB, created from the library (per-row action or selection).
- A playlists view mode alongside the library and radio modes (same mode
  button pattern): list of playlists, a playlist's tracks, add/remove/reorder.
- "Play next" queue action on library rows: inserts a track into the playing
  order right after the current one without creating a playlist.
- Playing a playlist plays its tracks in order through the existing transport;
  next/prev follow the playlist order while it plays.
- Track removal from the library keeps playlists consistent: entries pointing
  to a deleted track are dropped.

## Capabilities

### New Capabilities

- `playlists`: persistent user-defined track lists, a playlists view, the
  play-next queue action, and playlist-aware playback order.

### Modified Capabilities

- `library`: library rows gain "add to playlist" and "play next" actions, and
  the playlists view reuses the library list rendering.

## Impact

- New module `src/playlists/` (store, view, queue logic).
- IndexedDB database version bump (3 -> 4) with a `playlists` store.
- Small integration points: library rows, the mode switcher, and the playlist
  rebuild in `src/library/ui.ts`.
- No changes to radio behavior, lyrics, or the visualization area rules.
