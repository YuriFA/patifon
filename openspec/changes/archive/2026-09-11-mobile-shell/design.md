# Design: mobile-shell

## Decisions

### The canvas draft is the composition source of truth

The mobile layout implements the approved Superdesign draft "Patifon Mobile

- Warm Earth Hi-Fi Player" (draft id `0075d21e`, v2; preview
  `https://p.superdesign.dev/draft/0075d21e-1bed-46d5-a360-2e3fae66f4bc`),
  not a fresh invention. It reuses the existing Warm Earth tokens verbatim:
  no new colors, shadows, radii, or type sizes are introduced by this change;
  the design system file (`.superdesign/design-system.md`) already covers
  mobile as a recomposition, so no token or canon edits are needed. The only
  new vocabulary is layout: where regions sit and how big they are at narrow
  widths.

### One breakpoint, CSS-only reflow, zero DOM restructuring

A single `@media (max-width: 760px)` block in `main.css` owns the reflow.
Below 760px the 380px sidebar plus a usable stage no longer fit; at 761px+
(tablets and desktops) the existing two-column grid is untouched - desktop
stays byte-identical, which also keeps every existing e2e spec valid
without viewport annotations.

`index.html` is NOT restructured. The list markup lives inside the sidebar
container while the stage lives in the main container, and the mobile
column needs them interleaved (stage above list). Instead of moving DOM
(and re-plumbing the feature modules that query these elements), the two
grid containers (`.playlist`, `.audio_visualize`) become `display:
contents` on mobile: their children join a single flex column on
`.audio_player`, positioned with `order` (header first, area tabs + stage
next, shared list after, deck last). The shell itself becomes the scroll
container, with `.library__header` sticky at the top and `.deck` sticky at
the bottom - so "one scrollable content column between pinned chrome" falls
out of sticky positioning inside the shell's scroll. `display: contents`
is baseline-supported everywhere the app runs.

Consequences handled explicitly in the mobile block: the sidebar's panel
shadow/z-index die with its box (fine - the mobile header is a card-bottom
bordered block per the draft), and `.audio_visualize`'s
`overflow: hidden` anchor disappears (the visualizer canvas gets explicit
mobile sizing instead of relying on the clipped grid cell).

### The deck stacks its rows instead of shrinking them

Desktop deck: 140px, one controls row. Mobile deck per the draft: the
strip row stays 40px full-width; below it `.player-controls` becomes a
two-row stack - now-playing readout + volume group in the first row,
transport buttons + panel toggles in the second - with deck height
`auto` (~210px at 390px). The existing island roots (`#nowplaying-root`,
`#volume-root`, `#transport-root`, `#equalizer-root`, `#scrobbling-root`)
are separate flex children, so the stacking is a grid/flex rearrangement
of those roots plus sizing overrides - no component markup changes.

### Popups become bottom sheets through CSS only

`usePopup` (toggle, `aria-expanded`, Escape, outside pointer-down,
one-open-at-a-time) already satisfies every behavioral scenario; only the
presentation differs. On mobile the popup panels swap the absolute
anchor-above-trigger for `position: fixed; inset-inline: 0; bottom: 0`,
rounded top corners, a drag-handle affordance, and a slide-up transition;
the pointer-caret is hidden. Because outside-dismiss listens on
`pointerdown` at the document level, tapping above the sheet closes it -
the same semantics users already have. No `popup.ts` changes.

### The turntable scales as a unit

The vinyl deck is drawn from fixed pixel anatomy (platter 380, vinyl 350,
tonearm geometry hand-tuned over eight commits). Mobile does NOT restyle
individual parts - that would fork the canon. Instead the plinth scales as
one unit on mobile (the draft's ~340px card with the ~240px platter):
the percentage-based anatomy follows the plinth width, and the remaining
fixed-px parts (tonearm, deck buttons, screws) scale together through the
CSS `zoom` property - which, unlike `transform: scale()`, also scales the
layout box, so no wrapper compensation is needed - with the width divide
(`calc(100% / zoom)`) keeping the rendered box at full column width.

### Canvas sizing under the flow layout

The visualizer canvases are sized once at boot from `clientWidth`/
`clientHeight`. On mobile the stage participates in the scroll flow, so
the canvas cell gets an explicit mobile height (a `vh`-based fraction of
the content column) and boot sizing follows from it. `main.tsx`/visualizer
resize handling is verified (not preemptively rewritten) - only add a
resize hook if testing shows boot sizes go stale across the breakpoint or
device rotation.

### Verification lives in one new spec file

Playwright's default project viewport (1280x720) keeps covering desktop
specs. Mobile scenarios go into a new `e2e/mobile-shell.spec.ts` that sets
`test.use({ viewport: { width: 390, height: 844 } })` per file and asserts
observable layout facts (computed styles and geometry, not screenshots):
single column with no horizontal overflow, sticky header/deck offsets,
deck row stacking, sheet docking, 44px target geometry, and the desktop
grid intact at the default viewport in the same file's desktop-flavored
scenarios.
