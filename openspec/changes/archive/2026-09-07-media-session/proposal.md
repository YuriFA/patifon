# Proposal: media-session

## Why

The player currently lives entirely inside the browser tab: nothing appears
in the OS media controls, on the lock screen, or on headset buttons. Every
other music surface the user touches (Spotify, YouTube Music, Apple Music)
exposes playback to the operating system via the Media Session API, and the
player already has everything the OS needs - a single media element, known
track metadata, and embedded artwork stored with every library record.

## What Changes

- Add a Media Session integration: track title/artist/album/artwork are
  published as `MediaMetadata` while a track plays, `playbackState` follows
  real playback, and OS/hardware transport actions (play, pause, previous,
  next, seek-to) are wired to the player.
- Publish `setPositionState` so OS surfaces can show an accurate position
  and duration.
- No changes to existing transport behavior: OS actions reuse the same
  player methods the on-page controls use.

## Capabilities

### New Capabilities

- `media-session`: OS-level media controls - metadata with artwork, playback
  state, position state, and transport action handlers.

### Modified Capabilities

(none)

## Impact

- New module `src/media-session.ts` (feature detection + registration).
- Wiring in `src/main.ts` (init, playback state, position state) and
  `src/library/ui.ts` (per-track metadata with artwork object URLs from
  library records).
- New e2e coverage: captured action handlers + `navigator.mediaSession`
  metadata/state assertions via an init script; no real OS integration is
  automatable in headless Chromium, so handlers are invoked directly.
- Browser support per MDN BCD: Chrome 73+, Firefox 82+, Safari 15+; older
  browsers and environments without `navigator.mediaSession` degrade to the
  current behavior (no-op, no errors).
