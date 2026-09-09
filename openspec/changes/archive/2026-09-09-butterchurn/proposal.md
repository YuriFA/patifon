# Proposal: butterchurn

## Why

The visualization area renders one flat 2D column bar chart - functional but
not a reason to keep the app open. Butterchurn (the WebGL2 MilkDrop
implementation, research section 3.8) turns the same AnalyserNode data into
thousands of community presets of reactive scenes: a showcase feature that
costs one dependency and no graph changes, since the player already owns an
AudioContext and an AnalyserNode.

## What Changes

- New `butterchurn` capability: a second visualizer mode "MilkDrop" in the
  visualization area, rendered by Butterchurn on a WebGL2 canvas layered
  over the existing column renderer.
- A mode switch control in the visualization area toggles Bars / MilkDrop;
  the choice persists across reloads.
- Presets rotate automatically and can be skipped manually.
- The module is lazy-loaded on first enable (separate bundle chunk);
  without WebGL2 support the mode control is hidden and the classic
  renderer stays.
- Existing exclusion rules are inherited: radio and the lyrics panel clear
  and pause the visualization; playback stop freezes out of the render
  loop.

## Capabilities

### New Capabilities

- `butterchurn`: the MilkDrop render mode, mode switching with persistence,
  preset rotation, lazy loading, and the WebGL2 fallback behavior.

### Modified Capabilities

- `visualizer`: the visualization area hosts two render modes (classic
  columns and MilkDrop); the existing clear/pause rules apply to both.

## Impact

- New module `src/visualizer/butterchurn.ts` (engine wrapper) and a mode
  control in `src/visualizer/`; the existing columns renderer stays as-is.
- AudioPlayer gains a public `audioContext` getter (the graph already
  creates it lazily; no graph topology change - Butterchurn taps the
  existing AnalyserNode).
- New dev dependency `butterchurn` (+ `butterchurn-presets`), loaded via
  dynamic import.
- No changes to radio, lyrics, playlists, waveform, or scrobbling behavior.
