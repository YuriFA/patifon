# Design: track-waveform

## Context

The control bar holds a `RangeSlider`-based progress line (`src/main.ts`,
`handle: false, buffer: true`, `onchange -> player.rewind(ratio)`); position
updates arrive via `track:timeupdate`, buffer via `track:progress`. Import
(`src/library/import.ts`) already reads each `File` (tags via
`music-metadata`); the `File` object is persisted as a Blob in
`LibraryRecord.file`, so any post-import decode can re-read it. The shared
IndexedDB database is at version 4 after the playlists change; version bumps
follow the guarded `createObjectStore` pattern. The visualization area is
owned by the visualizer/lyrics/radio rules, so the waveform lives in the
control bar, not in the content area.

## Goals / Non-Goals

**Goals:**

- SoundCloud-style seekable waveform for library tracks, peaks cached in
  IndexedDB, rendered with played/remainder tinting and buffer indication.
- Import-time pre-render with a lazy fallback for pre-existing tracks.

**Non-Goals:**

- No regions/annotations UI (a later change can anchor lyrics lines as
  regions).
- No waveform for radio (live streams have no meaningful static shape).
- No zoom/minimap/timeline plugins; single fixed-resolution strip.
- No spectral waveform (spectrogram) - amplitude peaks only.

## Decisions

1. **Peaks from `decodeAudioData`, not OfflineAudioContext rendering.** The
   file already decodes to an `AudioBuffer`; peaks reduce channel samples to
   min/max pairs per bucket directly. OfflineAudioContext adds a render pass
   without informational gain for a static shape. Downsample to ~600 buckets
   (2x device-pixel density of the strip), mono-mixed.
2. **`waveforms` store, database version 5.** Key: `LibraryRecord.id`; value:
   `{ peaks: Float32Array-like number[], bucketMs, computedAt }` (peaks
   serialized as a plain array; 600 floats are negligible). Bump follows the
   established guarded-upgrade pattern.
3. **Computation off the critical path.** Import responds as soon as metadata
   is parsed; peaks are computed in a follow-up microtask chain (one file at
   a time, sequential queue) so mass imports do not fork hundreds of decodes
   in parallel. Failure (`decodeAudioData` reject, unsupported container)
   records nothing - the track simply keeps the plain progress line.
4. **Strip replaces the progress line, not the slider machinery.** The
   waveform strip renders inside the existing `.progress` container; the
   `RangeSlider` ratio semantics (click/drag -> `player.rewind(ratio)`,
   buffer overlay) are reused - the strip is a canvas/svg rendering keyed to
   the same ratio. When no peaks exist (radio, undecodable track, peaks not
   yet computed), the strip hides and the plain line shows.
5. **Lazy backfill while playing.** On `track:play` of a library track
   without peaks, a queued decode+reduce job runs in the background; the
   strip swaps in when the store write completes. A session-level in-flight
   map prevents duplicate jobs for the same track.
6. **Drawing:** single `<canvas>` per strip, `devicePixelRatio`-aware, min/max
   columns mirrored around the center line; played ratio tinted with the
   accent color, remainder in the dim grey; buffer range as a translucent
   overlay. Redraw only on ratio change (rAF-coalesced) or resize.

## Risks / Trade-offs

- **Decode cost**: full-file `decodeAudioData` for a long track takes
  seconds; acceptable because it happens once per track (import or first
  play of legacy tracks) and sequentially.
- **Memory**: `decodeAudioData` holds the full PCM buffer transiently
  (~10 MB/min stereo); sequential queue bounds peak usage.
- **Peak width fixed at ~600 buckets**: strip resampling on very wide screens
  interpolates; a higher-density cache would be a later migration, not a
  blocker.
- **Codec coverage**: browsers refuse some containers (`decodeAudioData`
  rejects) - those tracks keep the plain line by design.
