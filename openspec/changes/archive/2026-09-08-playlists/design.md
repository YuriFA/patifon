# Design: playlists

## Context

The library already doubles as the player's playlist: `src/library/ui.ts`
rebuilds the AudioPlayer playlist from `LibraryRecord[]` on every change
(`rebuildPlaylist`), rows map to playlist indices, and playback highlight
keys off `player.currentTrackIndex`. Radio added the view-mode pattern
(`toggleMode`, one active mode button, search placeholder swap, control
visibility). The shared IndexedDB database is at version 3 with `tracks`,
`stations`, `lyrics` stores (`src/utils/idb.ts`). Radio rows established the
list-with-actions UI precedent (stars, pinned playing row).

## Goals / Non-Goals

**Goals:**

- Persistent named playlists with order, plus a lightweight "play next" queue
  insertion that needs no playlist.
- Playlist playback that follows the playlist order with existing transport.
- UI consistent with the established mode/list patterns.

**Non-Goals:**

- No playlist import/export (m3u) in this change.
- No smart/auto playlists (most played, recently added).
- No drag-n-drop between views: reorder via dedicated controls inside the
  playlist view (drag comes later if needed).
- No collaborative/social features.

## Decisions

1. **Playlists store references, not copies.** `playlists` store (keyPath
   `id`): `{ id: uuid, name, trackIds: string[], createdAt }`; `trackIds`
   reference `LibraryRecord.id`. Database version 3 -> 4 (same upgrade
   pattern as v2 -> v3: `createObjectStore` guarded by `contains`).
2. **Queue as an insertion window, not a parallel list.** "Play next" keeps a
   `queueAfter: string[]` of library track ids in the playlists module. When
   the player's next transition triggers, the module rebuilds the effective
   order: current track, queued tracks, then the rest of the active list.
   This avoids duplicating the AudioPlayer playlist model; on playlist switch
   the queue clears. Rationale: the AudioPlayer owns a flat index-based
   playlist; a full queue abstraction would touch transport, media session,
   and highlight logic for little gain.
3. **Playlist playback = rebuild + play.** Activating a playlist calls the
   existing `rebuildPlaylist` path with the playlist's records and starts at
   the chosen index. The playlists module remembers the active source
   ("library" or a playlist id) so highlight and next/prev semantics stay
   consistent until another source takes over.
4. **Playlists view reuses the library list.** The playlists view renders into
   the same `.library__list` element with playlist-specific row controls
   (remove, move up/down), following the radio precedent where the mode
   swaps list content and placeholder. A third mode button joins the header:
   `Library | Playlists | Radio`.
5. **Row actions via a small popover.** "Add to playlist" opens a minimal
   popover listing existing playlists plus "New playlist"; "play next" is a
   direct action. Both live in the library row's action zone next to the
   radio star slot pattern.
6. **Deletion consistency on load.** Playlist hydration filters `trackIds`
   against existing library records; a track removed from the library
   disappears from every playlist on next load and on deletion event.

## Risks / Trade-offs

- **Index-based player vs queue window**: transitions that bypass the module
  (ended -> auto-next inside AudioPlayer) must route through the queue
  window; this needs a small hook at the player's next transition, which is
  the main integration risk of decision 2. Fallback: precompute the effective
  order eagerly at queue time (splice into the rebuilt playlist), accepting a
  playlist rebuild on each queue action.
- **Duplicate track ids** are allowed in playlists; index mapping must be
  position-based, not id-based (highlight/seek maps positions).
- **Mode state machine grows** to three modes; the radio/library toggle
  becomes a mode switcher - existing tests for mode toggling need updating.
