# radio-deck Design

## Context

The shell is Preact islands over a vanilla core: `src/ui/bridge.ts` mirrors
playback state into signals; feature modules (`src/radio/`, `src/visualizer/`,
`src/lyrics/`) subscribe to core events. The visualization area
(`.audio_visualize` in `index.html`) hosts the visualizer canvases, the lyrics
panel, the vinyl deck island, the area tabs and the visualizer style controls.
The approved visual direction is the superdesign draft "Patifon - Radio
Receiver View (mahogany)" v6 (project `4f6b46c2`, draft `4d22b2c1`).

## Decisions

- **The deck follows the source, not the mode.** Visibility is driven by
  `bridge.source === "radio"` (engagement), matching the existing rule that a
  radio takeover clears vinyl/lyrics and blocks the visualizer. On release the
  area returns to the persisted `areaMode` tab - no new persistence.
- **Pure DOM/CSS, no canvas.** Like `VinylDeck`, the receiver is a component
  (`src/ui/radio-deck.tsx`) mounted at a new `#radio-deck-root` inside
  `.audio_visualize`. The superdesign draft HTML is ported to the component's
  JSX + BEM styles (`radio-deck__*`) using theme tokens; draft-only artifacts
  (annotation chips, sidebar, deck strip) are not part of the component.
- **Station data through the bridge.** `bridge` gains a `station` signal
  (`{ name, tags, bitrate, uuid } | null`) written by `src/radio/ui.ts` on
  engage/stop/error. The deck and the now-playing panel read it; no direct
  imports from the radio feature into view components beyond types.
- **Deterministic needle position.** Pseudo-frequency = hash of
  `stationuuid` mapped to 88.00-108.00 (`FNV-1a`-style rolling hash, modulo
  2001, divided by 100), needle left offset = `(pseudo - 88) / 20 * 100%` of
  the scale lane. Error state parks the needle at the left end. The hash is
  pure and testable.
- **Stale strip clearing in the bridge.** `syncPosition`/`syncPlayback` write
  `position = 0`, `duration = 0` when the active source is radio. This covers
  late library `timeupdate` events, so SeekBar renders empty readouts and a
  disabled seek (its existing `duration > 0` gate) with no new logic.
- **LIVE badge occupies the total-time slot.** `src/radio/ui.ts` already
  toggles a `progress_live` class on `.progress`; it is extended to three
  states: `is-playing`, `is-idle` (paused/error). CSS moves `.progress__live`
  from its absolute overlay position into the total-time slot (static flex
  item, enlarged type) and hides `.deck__time_total` while engaged. The
  waveform strip already clears itself for radio.
- **Now-playing panel radio variant.** `NowPlaying` renders, for
  `bridge.source === "radio"`, an `ON AIR` label + station name and omits the
  mini meter (no analyser for radio; the current code already decays to idle).
- **Area chrome hiding.** `AreaTabs` returns null while
  `bridge.source === "radio"`; the visualizer style controls root gets
  `hidden` from the visualizer controls module under the same condition.
- **station-now removal.** The `.station-now` element is dropped from
  `index.html` together with its styles and `src/radio/now-playing.ts`;
  `src/radio/ui.ts` loses `showNowPlaying`/`hideNowPlaying` calls
  (`enterRadioView`/`exitRadioView` keep only list concerns). Media Session
  station metadata is untouched.
- **EQ notice.** `EqualizerPopup` shows a static notice line ("Affects library
  playback only") while `bridge.source === "radio"`; no styling beyond theme
  tokens.
- **Volume knob interaction.** The knob is a `role="slider"` element with
  `aria-orientation="vertical"`, `aria-valuenow` (0-100): pointer drag (vertical
  delta), wheel, and Arrow keys write the player volume through the existing
  volume path (`player.volume`), so the deck slider, MediaSession and radio
  element volume stay in sync via `bridge.volume`. Muted state dims the knob.
- **What is explicitly out of scope:** interactive dial (drag-to-tune),
  scrobbling radio listens (ICY metadata), visualizer audio for radio (CORS
  decision keeps radio outside the WebAudio graph).

## Risks / Trade-offs

- The pseudo-frequency is fictional; the dial is decorative by design
  (stations have no real frequencies). Documented in the UI copy ("FM") and
  the spec wording.
- Late library `timeupdate` after engagement could resurrect stale strip
  data; the source check inside `syncPosition` (not just `syncPlayback`)
  closes it.
- The receiver must not fight the visualizer canvases for layout: the deck
  root is a sibling overlay like `#vinyl-root`, hidden unless radio owns the
  area.
