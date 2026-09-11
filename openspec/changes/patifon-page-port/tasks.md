# Tasks: patifon-page-port

## 1. Shell and deck skeleton

- [ ] 1.1 Merge `.progress` + `.bar` into `.deck` (`.deck__strip` with the
      seek root + LIVE badge, `.deck__controls` with the five island
      roots) in `index.html`; retarget the grid in `main.css` (columns
      `380px 1fr`, rows `1fr 140px`), center the shell at `max-width:
      1440px` with side hairlines + plinth shadow; delete the dark-strip
      styles, the `.bar` rescope, and `--transport-*`; update e2e
      selectors. Verify: full suite green; new e2e scenario asserts no
      page scroll at 1280x800 and 1440x900.

## 2. Waveform strip

- [ ] 2.1 Rewrite `strip.ts` as one continuous gapless mirrored silhouette
      (played `--primary`, upcoming `--wave-dim`, 2px playhead with glow);
      move the time readouts into the strip row ends; keep the invisible
      range as the interaction owner. Verify: waveform spec green; new
      scenario "one continuous silhouette" (no fully transparent column
      between the lane edges on the seeded wave) plus times-in-strip
      assertions.

## 3. Transport deck styling

- [ ] 3.1 Light deck chrome (card fill + metal wash at 40% multiply, deck
      shadow top edge) in `main.css`; mech transport buttons with the
      lucide glyphs (prev/next 56x56, play 80x64 latched while playing);
      `now-playing.tsx` as the glass screen with eyebrow, truncate line,
      VU meter, and "No source" empty state. Verify: player spec green;
      new scenario asserts the play button carries the latched class only
      while playing.

## 4. Volume fader

- [ ] 4.1 Rewrite `volume-control.tsx` on the SeekBar pattern (invisible
      native range over the `.fader` rail/fill/cap, 40x40 round mute mech
      with the three volume glyphs, wheel hook on the group); delete the
      knob angle math; update the volume e2e scenarios from angle drags
      to linear range drags. Verify: volume scenarios (drag, keyboard,
      Home/End, wheel, mute independence) green.

## 5. Panel toggles and popups

- [ ] 5.1 EQ/SCROB toggles become 56x56 mech buttons (icon + sublabel,
      `.is-on` while open, `aria-expanded` kept); popup chrome re-skinned
      to the canon (primary border, radius 8, drop shadow, caret).
      Verify: equalizer + scrobbling suites green, popup open/close
      scenarios unchanged.

## 6. Sidebar

- [ ] 6.1 Brand row (RadioReceiverIcon + "Patifon"), three-button latching
      mode switcher (48x40 mech, icons, active `.is-on`), recessed search
      field, context row (eyebrow + Add Files with FolderPlusIcon) in
      `sidebar-header.tsx`; rows on the TrackRow anatomy (48px artwork,
      playing state with left bar + tint, hover card fill) in the row
      components; recommendations section on the same language; update
      e2e selectors. Verify: library/playlists/radio/recommendations
      suites green; new scenario asserts the brand renders "Patifon".

## 7. Stage

- [ ] 7.1 Mode tabs as latched text mech chips; station card and lyrics
      colors per the canon; visualizer controls on the mech skin.
      Verify: app-modes/lyrics/radio suites green.

## 8. Vinyl deck

- [ ] 8.1 Sync `vinyl-deck.tsx` to the canon: plinth/screws/platter
      strobe rim/vinyl grooves/label ring/tonearm gradients/pulse
      LED/round start/stop; pitch fader on the shared `.fader`
      primitives with the +8/0/-8 scale. Verify: vinyl suite green
      (pitch start/stop tonearm scenarios unchanged).

## 9. Branding and cleanup

- [ ] 9.1 `<title>` + PWA manifest name/short_name -> "Patifon"; update
      the e2e title assertion. Verify: pwa suite green; title shows
      "Patifon".
- [ ] 9.2 Adopt canonical token names in every restyled file, delete the
      `:root` alias block, grep-audit for legacy names, run the full gate
      (`typecheck`, `lint`, `format:check`, `build`, `test:e2e`), and do
      the side-by-side pixel pass against the draft preview URL on the
      reference data (Stand By Me, 01:58/2:57, ~45%). Verify: gate green,
      audit clean, per-region checklist matches the draft.
