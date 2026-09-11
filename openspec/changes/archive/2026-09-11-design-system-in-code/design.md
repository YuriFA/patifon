# design-system-in-code - Design

## Context

Phases 1-3 rebuilt every visible surface on the phase-2 Warm Earth token
set (`--surface*`, `--text*`, `--accent`, `--line`, `--transport*`). The
canvas design has since been iterated to draft v7 and formalized into
`.superdesign/design-system.md` (the Patifon design system), which the
owner pinned as the single source of truth: cream `#f6f2ec` surfaces, teal
`#0f766e` primary, light mechanical deck, system mono, fader-cap sliders,
continuous gapless waveform. The implemented values differ from the canon
at nearly every token, and the canon defines materials the code has no
tokens for (mech shadows, metal wash, scanlines, strobe rim).

This wave lands the system itself. The page port (follow-up change
`patifon-page-port`) then restructures the regions against it.

## Goals / Non-Goals

Goals:

- `:root` mirrors the design system 1:1: same names, same values, plus the
  shadow/texture tokens and the missing color roles.
- Shared primitives exist as CSS (mech button, glass screen, fader, type
  utilities, scrollbar) with values taken verbatim from the design system.
- The icon set exists as inline SVG components with the exact lucide paths
  the canon lists.
- The app stays fully functional and green (typecheck, lint, format, e2e)
  with zero layout or behavior changes.

Non-Goals:

- Any region restyle or DOM restructure (deck, sidebar, volume fader,
  vinyl deck geometry) - that is `patifon-page-port`.
- Deleting the legacy token names outright; they alias the canonical
  values until each region is ported.
- PWA app icons (the dark/red `icon.svg` predates Warm Earth; separate
  backlog item).
- Iconify/font CDNs - never; offline PWA.

## Decisions

### 1. Canonical token names mirror the design system

The `:root` set adopts the design system's role names verbatim:
`--bg --card --secondary --border --accent-tint --fg --muted --primary
--destructive --metal-light --metal-base --metal-dark --vinyl --wave-dim`,
shadows `--shadow-mech --shadow-mech-pressed --shadow-deck --shadow-panel
--shadow-screen --shadow-plinth`, textures `--texture-metal
--texture-scanlines --texture-vinyl-grooves --texture-strobe`. Values are
copied from `.superdesign/design-system.md` unchanged. Mirroring names
(rather than keeping the phase-2 names with new values) is what makes the
file pair readable as a 1:1 mapping and lets the port change adopt the
canonical names mechanically.

### 2. Legacy names become temporary aliases

Old names map to canonical tokens:

| Legacy             | Canonical alias |
| ------------------ | --------------- |
| `--surface`        | `--bg`          |
| `--surface-raised` | `--card`        |
| `--surface-sunken` | `--secondary`   |
| `--surface-hover`  | `--secondary`   |
| `--text`           | `--fg`          |
| `--text-dim`       | `--muted`       |
| `--text-faint`     | `--muted`       |
| `--accent`         | `--primary`     |
| `--line`           | `--border`      |

`--transport-bg/--transport-line/--transport-text` keep their dark values
(this wave changes nothing about the strip's appearance; the follow-up
port replaces the dark strip with the light deck and deletes them). The
`.bar` rescope block keeps overriding the legacy alias names so the dark
strip continues to render correctly until the port.

### 3. Primitives live in a dedicated stylesheet

`src/styles/ui.css` (imported from `src/main.tsx` next to the other
stylesheets) carries the cross-feature primitives; feature styles stay in
`main.css`/per-feature files. The classes are spec'd from the design
system: `.mech-button` (secondary fill, border, `--shadow-mech`, 6px
radius, 75ms transitions; `:active` and `.is-on` swap to
`--shadow-mech-pressed` + `translateY(1px)`, `.is-on` adds
`--accent-tint` fill and `--primary` ink), `.glass-screen`
(`--card` fill, `--shadow-screen`, `::before` scanlines at 60%),
`.fader` (rail `#f1eee2`, border `#ddd8c9`, inset shadow, 2px hairline
`#e0dac9`; `.fader__fill` in `--primary`; `.fader__cap` 14x26
horizontal / 34x16 vertical, gradient `#fbfaf5 -> #e8e3d3`, border
`#cfc9b8`, 2px `--primary` indicator line), `.type-eyebrow` (9px/700/
+1.5px), `.type-badge` (10px/700/+1px), and the 6px rounded scrollbar.
The classes are unused until the port change adopts them region by
region; oxlint does not lint CSS.

### 4. Icons as inline lucide SVG components

`src/ui/icons.tsx` exports one component per canon icon (RadioReceiver,
Library, ListMusic, Radio, Search, FolderPlus, Music, BarChart,
SkipBack, Pause, Play, SkipForward, Volume, VolumeHalf, VolumeX,
Sliders, RadioTower, Star) with the exact lucide 24x24 stroke-2 paths,
`currentColor`, and a `size` prop. No `iconify-icon` CDN: the app is an
offline PWA and the canvas-only dependency stays on the canvas.

### 5. Documented source-of-truth relationship

The `ui-shell` Theme tokens delta states that the token set mirrors the
canonical design system file and that visual changes update that file
first. The design system file lives in the repo
(`.superdesign/design-system.md`) next to `resume.json` and the init
artifacts, so the repo carries its own design canon.

## Risks

- CSS `var()` renames are invisible to `tsc`; a missed rename renders a
  transparent fallback. Mitigation: a grep audit for every deleted name
  outside the alias block, plus a new e2e scenario asserting the computed
  `--bg`/`--primary` values on the shell.
- Wholesale value changes shift contrast on every surface at once; the
  values are the canon, so the shift is the point - verified by the visual
  pass and the suite, with the real pixel-parity review happening in the
  follow-up port.
- Unused primitive classes could rot if the port stalls; the port change
  is planned immediately after this wave, task-for-task against these
  classes.
