## Why

On wide screens the app shell is capped at 1440px and centered, leaving large
empty margins on both sides. The stage (visualizer, lyrics, vinyl) - the visual
center of the app - wastes the space the user actually has, so the shell should
stretch to the full viewport width regardless of screen size.

## What Changes

- Remove the 1440px max-width and horizontal centering from the app shell: at
  any desktop width the shell fills the entire viewport width.
- Drop the desktop-only hairline side borders and the plinth page shadow that
  only made sense for a centered floating column (mobile already renders
  without them).
- Sidebar stays 380px; the visualization area absorbs all extra width; the
  transport deck spans the full width as before.
- Update the canonical design system (`.superdesign/design-system.md`) Layout
  section first, then the shell CSS, per the design-token source-of-truth rule.

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `ui-shell`: the desktop layout requirement changes from "centered at a
  maximum width with hairline side borders" to "stretched to the full viewport
  width at every width"; the pinned 1440px cap and side chrome are removed.

## Impact

- `.superdesign/design-system.md` - Layout section wording for the shell.
- `src/styles/main.css` - `.audio_player` desktop rules (max-width, centering
  margins, side borders, plinth shadow).
- No DOM changes; the mobile shell (below 760px) is untouched.
- e2e: existing shell scenarios keep passing; no new behavior to assert beyond
  the unchanged no-page-scroll guarantee.
