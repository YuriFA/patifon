# Design: media-session

## Context

The player owns one `HTMLAudioElement` behind `AudioPlayer` (src/audio-player.ts):
`play()/pause()/playNext()/playPrev()/rewind(ratio)`, an EventEmitter that
forwards media events as `track:play`, `track:pause`, `track:timeupdate`, ...
The library layer (src/library/ui.ts) knows the playing record (title, artist,
album, `artwork: Blob`) and already keeps an object-URL cache for artwork
(`artworkUrlFor`). Demo tracks are gone: every playlist entry now comes from a
library record, so index `i` in the player maps to record `i` in the restored
list. Media Session API support per MDN BCD: Chrome 73+, Firefox 82+, Safari
15+; `navigator.mediaSession` is also present in headless Chromium, so e2e can
assert against the real API surface.

## Goals / Non-Goals

**Goals:**

- OS media surfaces show correct track metadata and artwork while a library
  track plays.
- OS transport actions (play, pause, previous, next, seek-to) drive the same
  player methods as the on-page controls.
- `playbackState` and `setPositionState` track real playback.
- Zero behavior change where `navigator.mediaSession` is missing.

**Non-Goals:**

- PWA/service-worker integration (separate roadmap phase).
- `seekforward`/`seekbackward`/`stop`/`skipad` action handlers; chapter or
  artwork "sizes/srcset" variants beyond the single embedded image.
- Generating fallback artwork when a record has none.

## Decisions

1. **New module `src/media-session.ts` owns all `navigator.mediaSession`
   interaction.** Exports `initMediaSession(player, metadataProvider)`.
   The module registers action handlers once at init, subscribes to
   `track:play`/`track:pause` (playback state) and `track:timeupdate`
   (position state), and calls `metadataProvider()` whenever metadata may
   have changed (track switch events + at init).
   - Alternative: put the calls directly in ui.ts/main.ts - rejected: it
     scatters browser-API plumbing across UI code that is already at the
     function-size lint ceiling, and makes the media-session contract
     untestable in isolation.

2. **Metadata provider is a settable callback, not a hard dependency.**
   `initMediaSession(player, provider)` where provider returns
   `{ title, artist, album, artworkUrl } | null`. ui.ts registers a provider
   that maps `player.currentTrackIndex` to the current library record and
   reuses its artwork object-URL cache. main.ts wires everything and needs no
   knowledge of records. Non-library or unknown tracks (index out of range)
   produce `null` and the session keeps its previous metadata rather than
   throwing.

3. **`AudioPlayer` gains a public `get duration(): number`** (element
   duration or 0). `seekto` maps `details.seekTime / duration` onto the
   existing `rewind(ratio)`; no new seek API. Adding `duration` is the
   smallest honest read-only surface; alternatives (exposing the raw element,
   a seek-by-seconds method) add API without new capability.

4. **Defensive registration.** Every `setActionHandler` and
   `setPositionState` call is wrapped in try/catch (some browsers throw for
   unsupported actions), `setPositionState` only runs with a finite positive
   duration, and the whole module no-ops when `!("mediaSession" in navigator)`.
   Feature detection is per the MDN recommended pattern.

5. **playbackState semantics:** `paused` at init, `playing` on `track:play`,
   `paused` on `track:pause`. Track end chains through the existing `ended`
   handler (playNext), which fires the appropriate media events, so no extra
   state is needed.

## Risks / Trade-offs

- **blob: artwork URLs**: Chromium renders blob: artwork in OS surfaces;
  Safari may ignore it. Harmless degradation - metadata text still shows.
- **Position-state churn**: updating on every `timeupdate` (~4 Hz) matches
  the MDN guidance and is negligible work; no throttling unless profiling
  says otherwise.
- **Headless e2e fidelity**: OS-level rendering cannot be asserted; e2e
  verifies the API contract (captured handlers, metadata object, state) and
  invokes handlers directly. Real-OS behavior is a manual check item.
- **Handler-before-user-gesture**: registering handlers and metadata at init
  is allowed by spec; Chrome activates the session only when audio plays.
