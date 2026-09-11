# redesign-phase-2 - Design

## Context

Phase 1 left the shell as Preact islands over a signals bridge
(`src/ui/bridge.ts`), the transport as native controls, and the
visualization area still owned by vanilla modules: the visualizer
controller runs one frame loop for two renderers (`bars`, `milkdrop`,
persisted in localStorage `visualizer-mode`), badge toggles overlay the
area corner, and the lyrics module toggles a karaoke badge and shows the
panel as an overlay with an automatic takeover of the area.

Design source: the Warm Earth canvas draft
(`docs/design/superdesign-canvas-phase2.md`, draft `6dbe3073`): tabs
LYRICS / VINYL / VISUALIZER top-right, a turntable deck as the VINYL
mode, a NOW PLAYING panel in the transport, teal-on-beige tokens with a
dark transport strip.

Decision from scoping: the deck's pitch fader is functional (playback
rate), not decor.

## Goals / Non-Goals

Goals:

- One explicit owner of the visualization area at any time, switched by
  tabs, following the phase-1 region-ownership pattern.
- The deck as a real control surface: start/stop and pitch.
- Token-level theme move to Warm Earth.

Non-Goals:

- Volume knob, EQ/scrobbling popups, radio and recommendations restyle
  (phase 3).
- Any change to lyrics fetch/cache/sync semantics.
- Radio content in the transport panel (radio keeps its station card).

## Decisions

### 1. Area mode model

`VisualizerMode` ("bars" | "milkdrop") becomes the renderer choice INSIDE
the VISUALIZER tab. A new area-mode signal in the bridge holds
`"lyrics" | "vinyl" | "visualizer"`, persisted under a new localStorage
key `visualization-mode`. Migration: on first load, absent
`visualization-mode` falls back to `"visualizer"`; the old
`visualizer-mode` value keeps meaning the renderer choice (no migration
needed - same key, narrower scope). Default area mode: VISUALIZER.

The tabs are a small Preact island (`AreaTabs`) mounted in the
visualization area header, buttons with `aria-pressed`, reflecting the
bridge signal. The MilkDrop preset-skip badge stays, rendered only while
the VISUALIZER tab is active with MilkDrop chosen. The old badge row
(mode toggle + karaoke badge) is deleted.

### 2. Ownership handoff for the area

The area gets the same writer contract as the phase-1 list: lyrics view,
vinyl deck, and the visualizer canvases each own the area body exactly
when their tab is active; a switch flushes the outgoing owner's DOM
removal before the incoming owner writes (same `flushSync` boundary
pattern as the library handoff). Radio takeover and stopped-playback
clear rules stay as today per spec.

### 3. Vinyl deck rendering

DOM/CSS, no canvas: the deck is static JSX (plinth, platter, label,
tonearm, controls) whose motion is CSS - platter rotation via CSS
animation with `animation-play-state` driven by the `isPlaying` signal,
tonearm as a transform transition. This avoids a third render loop and
works without WebGL2 (spec requirement). The deck island is mounted once
and shown only in VINYL mode; radio and no-track states clear it per
spec.

Deck controls: start/stop is a button calling the same player methods as
transport play/pause. The pitch fader is a native vertical
`input[type=range]` (native-first, per ADR-0001 amendment; Zag.js is not
needed for a single slider) styled to the draft's deck fader.

### 4. Pitch mapping and rate semantics

Display range -8..+8, center 0 = normal speed, linear mapping
`rate = 1 + value * 0.0625` (+8 = 1.5x, -8 = 0.5x). The fader writes
`player.playbackRate`; the bridge gets a `playbackRate` signal so the
fader and any future rate UI stay in sync. The rate persists across mode
switches and track changes (spec: no per-track reset); radio playback
ignores it (radio bypasses the graph and streams cannot be rate-scaled).
Keyboard: native range steps (1 display unit).

### 5. Now playing panel

The transport island gains a panel region fed by bridge signals
(`nowPlayingTitle`, `nowPlayingArtist`) set from library playback events
and cleared on stop; radio does not write it (spec). The mini meter is a
small canvas driven by the existing analyser node in the same frame loop
family - a 16-bar downsample, not a second AnalyserNode.

### 6. Warm Earth tokens

Token values change in `:root` (teal accent, warm beige surfaces, ink
text) plus new transport-strip tokens for the dark strip variant.
Component styles read tokens only, so the change is token values + the
transport strip's background/border rules. Known transitional debt (kept
until phase 3): scrobbling and recommendations panels keep their
phase-0 styles and will look off against the new tokens - acceptable,
matches the phase-1 precedent with the radio card.

## Risks

- CSS rotation of a large element can be expensive on low-end GPUs;
  mitigation: transform-only animation, `will-change: transform` on the
  platter, pause the animation when the tab is inactive.
- Vertical range inputs differ across engines; mitigation: cap the
  styling work, verify keyboard steps in the e2e on Chromium and fall
  back to rotated horizontal input if vertical layout misbehaves.
