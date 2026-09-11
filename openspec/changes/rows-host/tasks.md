## 1. Rows host

- [ ] 1.1 Add the `RowsHost` island: renders `<ul class="library__list">` and the empty-hint node, switches rows on `bridge.mode`; update `index.html` mount points and remove the three row portals from `main.tsx`. Verify: e2e library, radio and playlists row scenarios green; exactly one `.library__list` in the DOM.
- [ ] 1.2 Delete `useLibraryView`'s ownership logic and `useOwnership`; the three rows components render from their snapshot signals directly. Verify: no `flushSync`/owned-ref ownership code remains; mode-switch e2e scenarios green.

## 2. Sidebar chrome ownership

- [ ] 2.1 Sidebar island: give the import, new-playlist and back buttons real handlers calling exported library/playlists actions; derive visibility from `bridge.mode` and the playlists view state; render the file input in the island; derive the search placeholder from `bridge.mode`. Verify: e2e shell, library import and playlists new/back scenarios green.
- [ ] 2.2 Delete the vanilla mutations of island-rendered chrome (placeholder writes, `hidden` flips, `classList` on sidebar buttons) from radio, playlists and library modules. Verify: no `querySelector` of `.library__add`, `.playlists__new`, `.playlists__back`, `.library__search` outside the sidebar island; e2e suites green.

## 3. One fan-out idiom

- [ ] 3.1 Replace the library listener-set/snapshot pair with a `libraryRowsView` signal carrying rows, playback/queue state and the empty-hint text; remove the `notifyView` DOM write. Verify: e2e library search/empty-hint scenarios green.
- [ ] 3.2 Make playlists catalog mutations write `playlistsRowsView` (empty-hint text inside); delete `refreshPlaylistsView`, `rerenderPlaylists` and the internal `render()` fan-out. Verify: e2e playlists suite plus the recommendations save-to-playlists flow green.
- [ ] 3.3 Port recommendation rows to a `recommendationsRowsView` snapshot and a signal-fed island; delete `renderList`'s `replaceChildren` and `updatePlayingHighlight`'s class patching; derive the playing highlight in the island. Verify: e2e recommendations scenarios, including the playing highlight, green.

## 4. Gate

- [ ] 4.1 Run the full gate: `npm run build && npm run typecheck && npm run lint && npm run format:check && npm run test:e2e`. Verify: all green.
