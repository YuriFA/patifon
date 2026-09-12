# radio-deck

## Why

When a radio station takes over the transport the shell keeps showing library
artifacts: the deck strip holds the previous track's duration and a live seek
lane, the LIVE badge overlaps the stale total time, the area tabs (Lyrics /
Vinyl / Visualizer) remain clickable but render nothing, and the visualization
area goes empty. Radio playback has its own nature (live, no position) and
deserves its own display.

## What Changes

- Add a radio deck display: while a station is engaged, the visualization area
  renders a vintage tabletop receiver - wood body, dot grille with a STEREO
  plate, full-width pseudo-FM dial (88-108) with a red needle at the station's
  deterministic position, a retro screen with the station name and
  genre/bitrate, functional volume knob, decorative tuning knob, telescopic
  antenna and feet.
- State visuals: playing (lit dial, antenna raised), paused (dimmed, antenna
  folded), stream error (flickering NO SIGNAL on the station screen, needle
  parked left, unlit grille).
- Area tabs and visualizer style controls are hidden while radio owns the
  area; on release the previously selected tab returns.
- Deck strip: stale position/duration are cleared while radio is engaged
  (both time readouts empty, seek disabled), and an enlarged LIVE badge
  occupies the total-time slot (bright while playing, dimmed while paused).
- Transport now-playing panel: while radio is engaged it shows an "On air"
  label with the station name and no mini meter.
- Remove the station-now card from the visualization area (element, styles,
  show/hide logic) - the deck display replaces it.
- Equalizer popup: while radio is engaged, show a notice that the equalizer
  affects library playback only.

## Capabilities

### New Capabilities

- `radio-deck`: the receiver display that owns the visualization area while a
  radio station is engaged, including its states, dial, station screen and
  volume knob.

### Modified Capabilities

- `radio`: live-state strip semantics (stale time clearing, LIVE badge slot
  and dim states) and the now-playing station display (station-now card
  removed in favor of the radio deck).
- `ui-shell`: the transport now-playing panel shows radio content ("On air" +
  station name) instead of staying empty.
- `equalizer`: the equalizer popup shows a radio-notice while a station is
  engaged.

## Impact

- New: `src/ui/radio-deck.tsx` (+ styles in `src/styles/main.css` or a
  dedicated css file imported from `src/main.tsx`).
- Changed: `src/ui/bridge.ts` (station signal; position/duration cleared for
  radio), `src/ui/seek-bar.tsx`, `src/ui/area-tabs.tsx`, `src/ui/now-playing.tsx`,
  `src/ui/equalizer-popup.tsx`, `src/radio/ui.ts` (live indicator states,
  station-now logic removal), `index.html` (station-now removal, radio-deck
  root), styles, visualizer controls visibility.
- Deleted: `src/radio/now-playing.ts` (station card helpers).
- e2e: new scenarios in `e2e/radio.spec.ts` (deck display, strip states, on-air
  panel, eq notice), additions to `e2e/player.spec.ts` if needed.
