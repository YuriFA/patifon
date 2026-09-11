## Why

The bars visualizer maps FFT bins to columns linearly (bin `i * step`), so
the bass-heavy left half always towers over a nearly flat right half - the
"staircase" look. The analyser also sits after the volume gain node
(`source -> EQ -> gain -> analyser -> destination`), which makes the whole
visualization track the volume knob. The now-playing mini meter duplicates
its own pseudo-log mapping with the same symptoms, and neither surface
speaks the app's skeuomorphic hi-fi design language (plain teal fills, no
display window, no instrumentation).

## What Changes

- Tap the analyser before the volume gain node: visualization shows the
  music, not the volume knob; equalizer adjustments still apply; radio
  playback (own element, outside the graph) is unaffected.
- Replace the linear bin mapping with one shared spectrum pipeline:
  logarithmically spaced bands from 40 Hz to 16 kHz (peak of the bins per
  band), mirrored layout with bass in the center falling off toward both
  edges, recent-peak (AGC) normalization so the display fills its height
  regardless of track loudness, instant attack with smooth release, and
  falling peak-hold markers.
- Re-render the bars mode as two selectable spectrum styles on the 2D
  canvas, defaulting to LCD: an LCD dot-matrix (unlit cell ghosts, lit
  teal cells, peak-hold cells, scanlines) and an LED segment ladder
  (discrete segments in a recessed charcoal window, peak-hold dots).
  Style switching uses two latched buttons in the existing
  `.visualizer-controls` row (bottom-right of the visualization area) and
  persists in localStorage.
- The transport's now-playing mini meter renders through the same shared
  pipeline and follows the selected spectrum style.
- On pause/stop, columns sink with a short animated falloff and the canvas
  ends cleared (no frozen frame), replacing the instant clear.
- MilkDrop is untouched except that it now consumes the same pre-volume
  analyser signal.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `visualizer`: pre-volume analyser tap, animated pause falloff, spectrum
  band mapping, two spectrum styles with a persisted default (LCD).
- `ui-shell`: the now-playing meter follows the shared band mapping and
  the selected spectrum style.
