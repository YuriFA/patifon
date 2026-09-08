# Tasks: playlists

## 1. Storage and data

- [x] 1.1 Bump IndexedDB to version 4 with a `playlists` store (keyPath `id`); add typed helpers `loadPlaylists`, `savePlaylist`, `deletePlaylist` in `src/playlists/store.ts` (records: `{ id, name, trackIds, createdAt }`). Verify: `npm run typecheck` green; e2e open with a pre-seeded v3 database upgrades without loss.
- [x] 1.2 Hydration filters `trackIds` against existing library records (dropped references disappear on load). Verify: `npm run test:e2e` green.

## 2. Queue ("play next")

- [x] 2.1 Queue module: `queueNext(record)` holds an insertion window; next transition splices queued tracks after the current one; queue clears on source switch. Verify: `npm run test:e2e` green.
- [x] 2.2 Library rows gain a "play next" action; queued rows show a queue indicator until played. Verify: `npm run test:e2e` green.

## 3. Playlists view and playback

- [x] 3.1 Playlists view mode (third header button, radio-mode precedent): list of playlists with create/rename/delete; opening a playlist renders its tracks with remove and move up/down controls. Verify: `npm run build` green.
- [x] 3.2 Playlist playback: activating a track plays the playlist in order via the existing rebuild path; active-source memory keeps highlight and next/prev inside the playlist; duplicates play positionally. Verify: `npm run test:e2e` green.
- [x] 3.3 Library rows gain "add to playlist" (popover: existing playlists + new); adding never interrupts playback. Verify: `npm run test:e2e` green.

## 4. Consistency and spec tests

- [x] 4.1 Library track removal cleans all playlists; cleanup is observable after reload. Verify: `npm run test:e2e` green.
- [x] 4.2 Spec scenarios to tests: playlist survives reload; create/fill/reorder/delete; open and play with playlist-order next/prev; play-next insertion then original order resumes; add-to-playlist without interrupting playback; queue indicator lifecycle. Verify: `npm run test:e2e` green.

## 5. Verification

- [x] 5.1 Full matrix `npm run lint && npm run typecheck && npm run format:check && npm run build && npm run test:e2e`. Verify: exit 0.
- [x] 5.2 Manual pass: create playlist, fill from library, reorder, play through, queue two tracks mid-playlist, reload mid-playlist - order, highlight and persistence correct; radio and lyrics unaffected. Verify: checklist noted in the change summary.
