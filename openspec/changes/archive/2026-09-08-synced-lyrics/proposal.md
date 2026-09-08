# Proposal: synced-lyrics

## Why

The player shows no lyrics today. Every mainstream player surfaces the words of the
song being played, and LRCLIB offers an open, key-free lyrics API with timestamped
LRC data that matches the library tracks we already import with artist/title/duration
metadata. This is the last phase of the agreed roadmap.

## What Changes

- New "lyrics" capability: fetch lyrics for the playing library track from LRCLIB
  (plain text and timestamped LRC), matched by artist/title and refined by duration.
- Synced display: the lyrics panel highlights the line matching the current playback
  position and follows it as the track plays; clicking a line seeks to its timestamp.
- Graceful absence: no lyrics found (404 is a normal answer), radio playback, and
  import metadata too sparse all hide the panel instead of showing an error.
- Cache fetched lyrics in IndexedDB so repeat plays work offline and do not hit the
  API again; honor the documented `X-User-Agent` client identification and stay
  well under the rate limit (one fetch per track activation, never batch scans).

## Capabilities

### New Capabilities

- `lyrics`: fetching, caching, and synchronized display of song lyrics for library
  playback.

### Modified Capabilities

- `visualizer`: the visualization area hosts the lyrics panel while a library track
  plays; the waveform and the radio card rules from the radio capability stay intact
  (radio mode keeps hiding the waveform, and lyrics apply to library tracks only).

## Impact

- New module `src/lyrics/` (LRCLIB client, LRC parser, IndexedDB cache, panel UI).
- Small integration points: playback activation in the library, the visualization
  area layout, and the existing IDB database (new store, version bump to 3).
- No changes to radio behavior, storage schema of existing stores, or transport.
