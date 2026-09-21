## Context

The shell is one CSS grid (`.audio_player` in `src/styles/main.css`):
`grid-template-columns: 380px 1fr`, deck spanning both columns below. Today it
is capped at `max-width: 1440px`, centered with auto margins, and dressed with
hairline side borders plus the plinth page shadow - chrome that visually floats
the column on the page background. The mobile shell (below 760px) already
renders full-width with `border-left/right: none; box-shadow: none`, so the
"floating column" treatment exists only on desktop. See proposal.md - Why.

The design-token rule in the ui-shell spec makes `.superdesign/design-system.md`
the source of truth: its Layout section currently reads "full width up to 1440px
centered ... Side hairline borders, plinth-level page shadow", so it must be
amended before the CSS changes.

## Goals / Non-Goals

Goals:

- Shell spans the full viewport width at every desktop width; the stage absorbs
  the extra width.
- One consistent full-bleed treatment: desktop matches the mobile shell by
  dropping the side borders and page shadow.

Non-Goals:

- No responsive changes to the sidebar width, the deck, or the 760px breakpoint.
- No stage-internal layout rework (canvas sizes already scale with the
  container; visualizer/lyrics/vinyl behavior is out of scope).
- No change to page-scroll behavior (body stays non-scrolling).

## Decisions

- **Delete the cap rather than raise it.** `max-width: 1440px`,
  `margin-left/right: auto`, `border-left/right` and `box-shadow:
var(--shadow-plinth)` leave `.audio_player` together; keeping any of them
  would preserve the centered-column look the change removes. The mobile block
  then no longer needs to override `max-width`/borders/shadow, but its
  overrides are left in place (additive CSS only, matching the mobile-shell
  change's recorded decision).
  - Alternative considered: raising the cap to a larger value. Rejected: any
    fixed cap re-creates the same complaint at some screen size.
- **Design system first.** Amend the `.superdesign/design-system.md` Layout
  section wording in the same change, per the tokens source-of-truth rule, so
  the canonical document never describes removed CSS.
- **No spec-driven e2e additions beyond the suite staying green.** Existing
  shell scenarios (no page scroll, two-column grid at desktop) already assert
  the observable contract; the width itself is pure styling verified visually.

## Risks / Trade-offs

- [Very wide stage makes centered stage content (turntable, lyrics column)
  look sparse] → Stage content already centers itself in the column; accepted
  trade-off, revisit only if it looks wrong in practice.
- [Visualizer canvases sized in CSS scale up automatically, but pixel density
  may soften on ultrawide] → Out of scope; canvases already track container
  size, no resize observer work in this change.

## Migration Plan

Single-commit CSS + design-system edit. Rollback is reverting the commit. No
data, API, or build-config impact.

## Open Questions

- (none)
