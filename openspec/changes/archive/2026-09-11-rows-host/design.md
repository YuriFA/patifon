## Context

The rows of all three view modes already render through Preact islands
(`LibraryRows`, `RadioRows`, `PlaylistsRows`), but all three portal into
the one static `.library__list` element, and list ownership is reconciled
by hand: `useLibraryView` (owned-ref + `flushSync`) in
`library-view.tsx` and `useOwnership` in `radio-view.tsx` implement the
same wipe-before-reconcile invariant with different reactivity idioms.
The sidebar island renders inert controls (`.library__add`,
`.library__add-dir`, `.playlists__back`, `.playlists__new`,
`.library__file-input`, the search placeholder) that
radio/playlists/library modules mutate by class name; the island's
static props are all that keeps those mutations alive. Fan-out to
islands uses four different mechanisms (see proposal). Full-sequence
context: the `engaged-transport` change lands first and shrinks the boot
interfaces; this change builds on its `bridge.mode`/snapshot signal
shapes.

## Goals / Non-Goals

**Goals:**

- The mode signal drives row rendering: one host, one handover, zero
  hand-written ownership logic.
- Sidebar chrome is owned by the island that renders it; other modules
  call exported actions instead of mutating DOM.
- One fan-out idiom (signal-of-snapshot with the empty hint inside) for
  all features; producers stop touching DOM.

**Non-Goals:**

- No visual redesign, no new user-facing capabilities beyond the sharpened
  ownership semantics already specced.
- No change to the engaged-transport seam landed by the previous change.
- The visualization area's per-tab ownership (vinyl deck, lyrics panel,
  canvases via `areaMode`) stays as is - it already has one writer per
  element.

## Decisions

1. **A `RowsHost` island owns the list region.** It renders the
   `<ul class="library__list">` and the empty-hint node, and switches the
   rows component on `bridge.mode` (`{mode === "library" ? <LibraryRows/>:
...}`). Preact unmounts the previous rows before mounting the next, so
   the handover invariant becomes the framework's job; both ownership
   hooks and the three portals die. Class names stay, so BEM selectors
   and e2e keep working. Alternative considered: a vanilla list-owner
   module the islands register with - rejected: it re-implements
   reconciliation the framework already provides and was only justified
   while vanilla writers existed.
2. **Sidebar chrome gets real handlers.** The island renders the import,
   new-playlist and back buttons with `onClick` calling exported actions
   from `library/` and `playlists/` modules; visibility derives from
   `bridge.mode` and the playlists view state signal; the placeholder
   derives from `bridge.mode`. The vanilla class-name mutations are
   deleted. The file input stays inside the island and the import action
   forwards to it via a ref.
3. **Signal-of-snapshot per feature.** `libraryRowsView` (new) joins
   `stationRowsView` and `playlistsRowsView`; the snapshot carries rows,
   playback/queue state, and the empty-hint text. Islands render the hint
   from the snapshot; producers never touch DOM.
4. **Playlists escape hatches collapse.** Catalog mutations (create,
   save recommendation, track edits) write `playlistsRowsView` directly,
   so `refreshPlaylistsView`/`rerenderPlaylists` and the island's
   internal `render()` calls disappear.
5. **Recommendations rows move into a signal-fed island.** A
   `recommendationsRowsView` snapshot (rows + per-track playing flag)
   replaces `renderList`'s `replaceChildren` and
   `updatePlayingHighlight`'s `querySelectorAll` patching; the highlight
   derives from the snapshot in the island. Row markup and classes stay
   identical.
6. **Boot order relaxes.** With the host owning the list and the sidebar
   owning its chrome, feature inits no longer depend on island mount
   order for these elements; the remaining boot-order comment shrinks to
   whatever `engaged-transport` left.

## Risks / Trade-offs

- [Snapshot writes before island mount] -> signals replay the current
  value on first read; the host mounts before `initLibrary` resolves and
  re-renders when the first snapshot lands.
- [Recommendations row markup regresses in the JSX port] -> classes,
  icons and the expand/save/play behavior are ported 1:1; the
  recommendations e2e scenarios (including the playing highlight) gate
  the task.
- [Hidden reliance on class mutations in e2e] -> e2e asserts via classes
  on rendered state, not on who wrote it; `shell.spec` and
  `library.spec` scenarios cover the moved buttons.
- [`flushSync` removal changes scroll/anchor behavior of list updates] ->
  the sync wipe existed to dodge a portal race that disappears with the
  host; library list e2e (search while playing, queue marks) gates it.

## Migration Plan

Lands after `engaged-transport`. Order: host (1) -> sidebar chrome (2) ->
fan-out idiom (3) -> full gate (4). Each group keeps the full e2e suite
green before the next starts. Rollback is a revert; no persistence
changes.

## Open Questions

- none
