## Why

Three islands portal into one static list element and reconcile ownership
by hand: two hooks implement the same wipe-before-reconcile invariant with
different reactivity idioms, the sidebar island renders controls that other
modules mutate imperatively (hidden flags, placeholders), and each feature
feeds its island through a different mechanism (listener-set + snapshot
function, signal + imperative escape hatches, signal + raw DOM patching).
The ownership rule is already a spec requirement (ui-shell: Region
ownership per active mode) but is enforced by convention in four places,
so every new writer risks duplicate or lingering rows.

## What Changes

- One rows host island renders the active view's rows by switching on the
  mode signal and owns the shared list element plus the empty-hint node;
  the three row portals and both list-ownership hooks are deleted.
- The sidebar chrome island stops rendering inert controls: the import
  buttons, the playlists new/back buttons, and the file input get real
  handlers or mode-derived visibility inside the island, and the search
  placeholder derives from the mode signal; radio/playlists/library stop
  mutating island-rendered DOM by class names.
- One fan-out idiom: every feature exposes a signal-of-snapshot with the
  empty-hint text inside the snapshot. The library listener-set/snapshot
  pair, the playlists `refreshPlaylistsView`/`rerenderPlaylists` escape
  hatches, and the recommendations `replaceChildren` + class-patching are
  replaced; recommendation rows render through a signal-fed island with
  the playing highlight derived in the island.
- Feature producers stop touching DOM: hints and highlights derive from
  snapshots in the islands.

## Capabilities

### New Capabilities

- none

### Modified Capabilities

- `ui-shell`: Region ownership per active mode sharpens - the list handover
  happens exactly once per mode switch and no view mutates another
  region's chrome; the sidebar context actions and search placeholder
  follow the active mode.
