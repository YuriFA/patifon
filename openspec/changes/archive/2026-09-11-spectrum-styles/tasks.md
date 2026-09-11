## 1. Audio graph

- [x] 1.1 Move the analyser node before the volume gain in `connectGraph`
      (`source -> EQ -> analyser -> gain -> destination`), keeping the lazy
      graph build and the no-analyser fallback path intact.
      Verify: new e2e scenario in `e2e/player.spec.ts` - play a stubbed
      spectrum, change volume via `window.player`, assert canvas amplitudes
      unchanged.

## 2. Shared spectrum pipeline

- [x] 2.1 Create `src/visualizer/spectrum.ts`: log bands 40 Hz - 16 kHz
      with per-band bin peak, mirrored permutation (bass center), AGC with
      slow decay and noise floor, per-column attack/release, peak-hold, band
      count derived from width.
      Verify: consumed by both styles and the mini meter without duplicate
      mapping code (`rg getFloatFrequencyData` finds it only there and in
      `analyser.ts`).
- [x] 2.2 Replace the linear mapping in `columns.ts` and the pseudo-log
      mapping in `now-playing.tsx` with the shared pipeline.
      Verify: typecheck + lint pass; old mapping constants gone.

## 3. Spectrum styles

- [x] 3.1 Implement the LCD matrix renderer (default): dot-matrix cell
      grid with unlit ghosts, lit teal cells, peak-hold cells, scanlines,
      following the approved draft `92846f2f`.
      Verify: e2e with the analyser stub - center column taller than the
      edges, lit-cell color matches `--primary`, cells fill the canvas
      height.
- [x] 3.2 Implement the LED ladder renderer: segment stacks in a recessed
      charcoal window, unlit ghost segments, peak-hold dots, following the
      approved draft `f2edc494`; same canvas and footprint as LCD.
      Verify: e2e - switching styles keeps the canvas box identical
      (`getBoundingClientRect` before/after) and only pixel content changes.
- [x] 3.3 Add the style switch: two latched buttons in
      `.visualizer-controls`, visible only in VISUALIZER mode, persisted as
      `spectrum-style` in localStorage, LCD default on fresh profiles,
      no-WebGL2 environments unaffected (2D canvas only).
      Verify: e2e - default is LCD, switch to LED survives reload, buttons
      hidden under LYRICS/VINYL tabs.
- [x] 3.4 Animated pause falloff: on stop, columns sink via release and
      the canvas ends cleared within ~300 ms (replaces instant clear for the
      spectrum renderer; MilkDrop keeps its existing clear).
      Verify: e2e - pause, poll canvas pixels: non-background pixels decay to
      zero within the bound, none remain after.

## 4. Now-playing mini meter

- [x] 4.1 Render the transport meter through the shared pipeline in the
      selected style (LCD cells / LED bars), mirrored layout, clearing with
      the panel as today.
      Verify: e2e - meter follows the persisted style and clears when
      playback stops.

## 5. Sync and gate

- [x] 5.1 Sync deltas into `openspec/specs/visualizer` and
      `openspec/specs/ui-shell`, then archive the change.
      Verify: `openspec validate --specs` green; `npm run typecheck && npm
run lint && npm run format:check && npm run test:e2e` all green.
