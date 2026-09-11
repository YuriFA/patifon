## Decisions

1. **Analyser taps pre-volume, post-EQ.** The graph becomes
   `source -> EQ -> analyser -> gain -> destination`. The volume knob
   stops scaling the visualization; equalizer changes still do, because
   the user deliberately shaped the sound being displayed. Radio is
   unaffected (its element lives outside the graph), so its existing
   takeover rules hold unchanged. MilkDrop consumes the same analyser and
   therefore also becomes volume-independent - one consistent rule for
   everything visual.
2. **One shared spectrum pipeline, three consumers.** A new
   `src/visualizer/spectrum.ts` owns band mapping and dynamics: log bands
   (40 Hz - 16 kHz, peak per band), mirror permutation (bass center),
   AGC, attack/release, peak-hold. Both canvas styles and the
   now-playing mini meter consume its per-frame column levels. This
   deletes the two divergent mappings (`columns.ts` linear bins,
   `now-playing.tsx` pseudo-log) instead of adding a third.
3. **Mirror layout, not log left-to-right.** The user-observed reference
   (center jumps most, edges least) is the mirrored spectrum of classic
   hi-fi analyzers; log spacing fixes the staircase _inside_ the mirror.
   Odd band count keeps a single true center column; the count derives
   from canvas width so columns fill it edge to edge.
4. **AGC over fixed dB scale.** A recent-peak normalizer with slow decay
   keeps quiet masters alive; a floor on the tracked peak prevents
   silence-pumping. Chosen over an honest fixed dB scale because the
   display is an instrument _feel_, not a measurement device.
5. **Two styles, one renderer contract, LCD default.** Both styles draw
   the same band data on the same 2D canvas - LCD dot-matrix (unlit cell
   ghosts, lit teal cells, peak-hold cells, scanline texture) and LED
   ladder (segment stacks in a recessed charcoal window, peak-hold dots).
   LCD is the default (product decision from the live prototype review);
   the choice persists under `spectrum-style` in localStorage. The switch
   lives as two latched buttons in the existing `.visualizer-controls`
   row - same slot and mech-button style as the Bars/MilkDrop toggle -
   visible only in VISUALIZER mode. Same canvas, same size: switching
   never reflows the area.
6. **Pause = animated sink, ending cleared.** Physical-device feel: on
   stop, columns fall via the release path and the canvas ends empty, so
   the "no frozen frame" guarantee is preserved with a bounded (~300 ms)
   transition instead of an instant clear.
7. **Visual source of truth.** The approved superdesign drafts
   `f2edc494` (LED ladder) and `92846f2f` (LCD matrix), plus the animated
   local prototype compared side by side, define the look (window frame,
   screws, labels, segment/cell sizes, colors from the existing token
   set: `--primary`, `--secondary`, scanline texture).
8. **E2E determinism via analyser stub.** Playwright injects a fake
   `AnalyserNode` (`getFloatFrequencyData` returning a fixed spectrum)
   through `addInitScript`; scenarios then assert canvas pixels (center
   column taller than edges, style switch keeps canvas box, pause ends
   cleared) - real FFT output is not assertable.
