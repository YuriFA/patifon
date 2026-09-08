# Proposal: track-waveform

## Why

Seeking today is a thin abstract progress line with no shape of the track:
the user cannot see quiet/loud parts, intros, drops or breaks before jumping.
A SoundCloud-style waveform (research: `docs/research/product-and-audio-landscape-directions.md`
section 2.1, 2.6) turns the seek bar into a map of the track and is the most
requested player UX affordance. Peaks are pre-rendered once at import and
cached, so the wave appears instantly on every later play.

## What Changes

- New "track-waveform" capability: peaks of the playing library track
  rendered as an interactive waveform strip that doubles as the seek bar.
- Peak pre-rendering at import time (OfflineAudioContext over the decoded
  track, min/max per bucket), cached in IndexedDB; waveforms render from
  cache without decoding again.
- Tracks imported before this change get peaks computed lazily on first play
  (background task, non-blocking).
- Played part of the wave is tinted, remainder dimmed; clicking and dragging
  anywhere on the wave seeks (replacing the bare progress line for library
  tracks).
- Radio keeps its existing progress semantics (live streams have no
  waveform; the plain progress line stays for radio).

## Capabilities

### New Capabilities

- `track-waveform`: peak computation, caching, and the interactive seekable
  waveform strip for library playback.

### Modified Capabilities

- `playback`: the seek affordance for library tracks becomes the waveform
  strip; buffer indication and seek ratio semantics stay unchanged.

## Impact

- New module `src/waveform/` (peak computation, cache, strip rendering).
- IndexedDB database version bump (4 -> 5) with a `waveforms` store.
- Import pipeline gains an optional peak-extraction step; the progress bar
  area renders the strip for library tracks.
- No changes to radio playback, lyrics, or the visualization area rules.
