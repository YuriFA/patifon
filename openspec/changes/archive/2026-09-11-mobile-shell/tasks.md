# Tasks: mobile-shell

- [x] 1.1 Add the `@media (max-width: 760px)` shell block in `src/styles/main.css`: `.audio_player` becomes a `100dvh` flex column scroll container; `.playlist` and `.audio_visualize` become `display: contents`; assign `order` to their children (header, area tabs, stage, shared list, empty/recommendations) with the deck pinned last; kill the desktop grid artifacts (side borders, plinth shadow, per-container scroll) on mobile.
      Verify: at 390x844 the app loads with header pinned top, deck pinned bottom, content scrolling between them and zero horizontal overflow (`scrollWidth === clientWidth`).
- [x] 1.2 Make `.library__header` sticky at the top and `.deck` sticky at the bottom inside the mobile scroll container, with safe-area padding (`env(safe-area-inset-top)` / `env(safe-area-inset-bottom)`) and `viewport-fit=cover` added to the viewport meta in `index.html`.
      Verify: e2e asserts `getBoundingClientRect().top === 0` for the header and `bottom === innerHeight` for the deck after scrolling the content column.
- [x] 1.3 Compact the sidebar chrome for mobile per the draft: 16px page gutters, tightened brand-row and search paddings, mode switcher buttons unchanged in language.
      Verify: visual pass against the draft preview at 390px; desktop viewport unchanged.
- [x] 2.1 Stage flow: area tabs render above the stage in the column; `.audio_visualize` children (bars canvas, WebGL canvas, station card, lyrics, vinyl root, visualizer controls) stack with explicit mobile sizing - canvas cell gets a `dvh`-based height, station card and lyrics constrain to the column width.
      Verify: at mobile viewport with the VISUAL tab active the canvas paints without clipping or horizontal overflow; LYRICS and radio station card render inside the column.
- [x] 2.2 Scale the turntable as a unit: introduce `--vinyl-scale` consumed by `.vinyl-deck__plinth` (`transform: scale()` with the compensated layout box) set to the draft's mobile proportions (platter ~240px at 390px width).
      Verify: e2e measures the platter element at ~240px width at 390px viewport; tonearm/platter anatomy unchanged at desktop viewport.
- [x] 2.3 Release the shared list into the flow: `.library__list` and the rows-roots drop their inner scroll on mobile and grow with content; row hover-only affordances keep their anatomy.
      Verify: scrolling the content column scrolls stage + list together; list rows never clip horizontally at 390px.
- [x] 3.1 Stack the deck: `.player-controls` becomes a two-row stack on mobile (now-playing readout + volume group, then transport buttons + panel toggles), deck height `auto` with the strip row unchanged at 40px; hide the desktop-only gutters/margins that break the narrow layout.
      Verify: e2e asserts the transport row sits fully below the readout row and all deck content fits inside the viewport width.
- [x] 4.1 Bottom sheets: in the mobile block, restyle `.equalizer-popup` and the scrobbling popup to `position: fixed; inset-inline: 0; bottom: 0` with rounded top corners, slide-up transition, and a drag-handle affordance; hide the pointer caret; keep them styled from theme tokens.
      Verify: e2e opens the EQ and scrobbling popups at mobile viewport - each docks to the bottom edge full-width, `aria-expanded` toggles, Escape and outside pointer-down close it.
- [x] 5.1 Touch ergonomics: every shell-chrome and deck control (mode switcher, transport buttons, panel toggles, mute) reaches a >=44px hit area on mobile through sizing/padding overrides; interactive text links keep their language.
      Verify: e2e asserts >=44px client rects for each target class at mobile viewport.
- [x] 6.1 Full gate on the same tree: `npm run typecheck && npm run lint && npm run format:check && npm run build && npm run test:e2e` - the whole suite green (existing desktop specs at the default viewport, the new mobile spec at 390x844).
      Verify: all commands exit 0; no regressions in desktop layout assertions.
- [x] 6.2 Sync the main spec: merge the ui-shell delta into `openspec/specs/ui-shell/spec.md` and run `openspec validate --specs`.
      Verify: validation passes with no complaints.
- [x] 7.1 Visual-pass follow-ups from the first mobile run: place the vinyl stage under the area tabs (missing `#vinyl-root` order), make the EQ and SCROB toggles adjacent at the deck row's right edge, and engage the library source on transport-only playback so the now-playing panel appears (playback spec scenario added).
      Verify: mobile spec asserts vinyl below the header, `scrob.left - eq.right <= 13`, and the deck-stacks scenario now starts playback via the transport play button.
