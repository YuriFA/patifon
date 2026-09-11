# Tasks: design-system-in-code

## 1. Canonical tokens

- [x] 1.1 Replace the `:root` block in `src/styles/main.css` with the
      canonical token set from `.superdesign/design-system.md` (color
      roles, six shadow tokens, four texture gradients, `--wave-dim`),
      keep the legacy names as aliases per the design's mapping table, and
      retarget the `.bar` rescope block to the alias names so the dark
      strip renders unchanged. Verify: `npm run typecheck` green; a grep
      audit finds no legacy token name defined or referenced outside the
      alias block and `.bar` rescope; the full suite is green.

## 2. Shared primitives stylesheet

- [x] 2.1 Create `src/styles/ui.css` with `.mech-button` (+ `.is-on`),
      `.glass-screen` (+ scanlines `::before`), the `.fader` family
      (rail/hairline/fill/cap, horizontal and vertical caps),
      `.type-eyebrow`, `.type-badge`, and the 6px scrollbar rules, values
      verbatim from the design system; import it from `src/main.tsx`.
      Verify: `npm run typecheck && npm run lint && npm run format:check`
      green; a side-by-side value review against
      `.superdesign/design-system.md` matches 1:1.

## 3. Inline icon set

- [x] 3.1 Create `src/ui/icons.tsx` exporting the canon's lucide icons as
      inline SVG components (exact lucide paths, `currentColor`,
      stroke-width 2, `size` prop): RadioReceiver, Library, ListMusic,
      Radio, Search, FolderPlus, Music, BarChart, SkipBack, Pause, Play,
      SkipForward, Volume, VolumeHalf, VolumeX, Sliders, RadioTower,
      Star. Verify: `npm run typecheck && npm run lint` green; paths match
      the design system's iconography list.

## 4. Document metadata

- [x] 4.1 Update `<meta name="theme-color">` in `index.html` to the
      canonical bg `#f6f2ec`. Verify: `npm run test:e2e` pwa suite green.

## 5. Token application e2e

- [x] 5.1 Add a scenario to `e2e/player.spec.ts` asserting the shell
      renders on the canonical tokens (computed `background-color` of the
      shell equals `rgb(246, 242, 236)`, and `--primary` resolves to
      `#0f766e`). Verify: `npm run test:e2e` green with the new scenario.
