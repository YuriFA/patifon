# design-system-in-code - Proposal

## Why

The Warm Earth design language now has a canonical source of truth:
`.superdesign/design-system.md` (the Patifon design system), pinned against
the canvas draft v7. The implemented app still runs the phase-2 token set,
which drifted from the canon: different hex values (`--surface #ece7db` vs
canon bg `#f6f2ec`, `--accent #178f80` vs canon primary `#0f766e`), legacy
names that do not mirror the design system's roles, no tokens for the
mechanical shadows/textures the canon defines, and no shared primitives for
the mech button, glass screen, or fader slider languages. Porting the page
1:1 (the next change) requires the system to exist in code first, so both
the canvas and the app derive from one token set.

## What Changes

- The `:root` token set in `src/styles/main.css` is replaced by the
  canonical token set from the design system: canonical names and values
  (`--bg`, `--card`, `--secondary`, `--border`, `--accent-tint`, `--fg`,
  `--muted`, `--primary`, `--destructive`, `--metal-*`, `--vinyl`,
  `--wave-dim`), the six shadow tokens, and the four texture gradients.
- Legacy token names (`--surface`, `--surface-raised`, `--surface-sunken`,
  `--text`, `--text-dim`, `--accent`, `--line`, ...) remain as temporary
  aliases pointing at the canonical values, so every existing view keeps
  rendering; the aliases are deleted by the follow-up port change as it
  adopts the canonical names per region.
- A new `src/styles/ui.css` defines the design system's shared primitives:
  `.mech-button` (+ `.is-on` latched state), `.glass-screen` (inset screen
  shadow + scanlines overlay), the fader language (recessed rail with
  center hairline, fill, raised cap with teal indicator line, horizontal
  and vertical), the eyebrow/badge type utilities, and the 6px scrollbar.
- A new `src/ui/icons.tsx` provides the canon's icon set as inline lucide
  SVG components (no iconify CDN - the app is an offline PWA).
- `<meta name="theme-color">` becomes the canonical bg `#f6f2ec`.
- No layout, region, component, or behavior changes in this wave: the app
  renders the same structure on the canonical values.

## Capabilities

### New Capabilities

- none

### Modified Capabilities

- `ui-shell`: the Theme tokens requirement now derives from the canonical
  design system (`.superdesign/design-system.md` is the source of truth;
  token names mirror the design system's roles), replacing the phase-2
  "Warm Earth with a dark transport strip" wording.
