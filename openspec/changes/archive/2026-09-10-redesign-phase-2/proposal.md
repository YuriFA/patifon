# redesign-phase-2

## Why

Phase 1 shipped the Preact shell, library, and transport on the light HI-FI
theme with a red accent. The visualization area still runs the phase-0
interaction model (two badge toggles, lyrics as a hidden overlay) and the
owner picked the Warm Earth canvas draft
(`docs/design/superdesign-canvas-phase2.md`) as the design direction for the
next wave: the area becomes an explicit LYRICS / VINYL / VISUALIZER mode
switcher with a turntable centerpiece, the transport gains a now-playing
treatment, and the accent moves from red to teal on warm beige.

## What Changes

- Visualization area gets an explicit three-mode switcher - LYRICS, VINYL,
  VISUALIZER - as top-right tabs replacing the MilkDrop/Karaoke badge
  toggles. The VISUALIZER tab keeps the existing columns and MilkDrop
  renderers and their persisted choice; the preset-skip badge stays.
- **BREAKING** (interaction model, not data): the lyrics karaoke badge
  toggle and the visualizer area takeover rules are replaced by the tab
  model. Lyrics fetch, cache, and synchronized-display rules are unchanged;
  the panel is shown by selecting the LYRICS tab instead of appearing
  automatically.
- New VINYL mode: a turntable deck (plinth, spinning platter, center label,
  tonearm, start/stop) rendered for library playback. The deck's start/stop
  controls playback; its pitch fader functionally sets playback rate
  (displayed -8..+8) and is a real control, not decor.
- New `playbackRate` behavior on the player: bounded, adjustable via the
  pitch fader, persisted across mode switches and track changes until the
  user moves it again.
- Transport bar now-playing treatment: a NOW PLAYING panel (label,
  track - artist for library playback; existing station card content for
  radio) with a small live bars meter.
- Theme tokens move to the Warm Earth direction: teal accent, warm beige
  surfaces, dark transport strip with teal accents. Views derive from
  tokens, so this is a token-level change plus transport strip styling.

## Capabilities

### New Capabilities

- `vinyl`: the turntable view mode - deck rendering tied to playback state,
  start/stop affordance, and the functional pitch fader.

### Modified Capabilities

- `visualizer`: area switches from badge toggles to the LYRICS / VINYL /
  VISUALIZER tab model; one writer at a time across the three modes;
  VISUALIZER tab keeps columns/MilkDrop.
- `lyrics`: karaoke badge toggle becomes the LYRICS tab; panel visibility
  follows the selected mode; fetch/cache/sync rules unchanged.
- `ui-shell`: initial theme token set becomes Warm Earth (teal accent, warm
  beige surfaces, dark transport strip); transport bar gains the NOW
  PLAYING panel.
- `playback`: bounded playback-rate control exposed by the vinyl pitch
  fader.

## Out of Scope

- Rotary volume knob, EQ popup, scrobbling popup restyle (phase 3).
- Radio view redesign and the recommendations panel restyle (phase 3).
- Any change to lyrics fetching, caching, or synchronization semantics.
