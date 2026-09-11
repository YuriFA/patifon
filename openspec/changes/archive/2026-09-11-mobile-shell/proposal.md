# Proposal: mobile-shell

## Why

The app ships as a PWA but its shell is desktop-only: `.audio_player` is a
fixed 380px-sidebar grid with zero `@media` rules anywhere in the styles, so
on a phone the library list and the transport deck are squeezed into an
unusable ~390px-wide desktop grid. The mobile composition of the same screen
has already been designed and approved on the Superdesign canvas (draft
"Patifon Mobile - Warm Earth Hi-Fi Player", project "music player") in the
same Warm Earth canon, so the design decision is settled; what is missing is
the responsive implementation behind it.

## What Changes

Add one mobile breakpoint that reflows the existing shell into the approved
single-column composition - sidebar chrome becomes a sticky header, the stage
and the shared list flow in one scrollable column under it, the transport
deck stays pinned at the bottom with its rows stacked, and the transport
popups (EQ, scrobbling) present as bottom sheets. Touch ergonomics (44px
targets, safe-area insets, dynamic viewport height) come along with the
breakpoint. The desktop layout and all existing behavior stay byte-for-byte
unchanged above the breakpoint; the reflow is CSS-only - no DOM
restructuring of `index.html`, no changes to island wiring or feature logic.

## Capabilities

### New Capabilities

### Modified Capabilities

- `ui-shell`: the persistent-region-layout requirement gains the mobile
  single-column arrangement (sticky header, one scrollable content column,
  pinned stacked deck); the transport-popups requirement gains the mobile
  bottom-sheet presentation; a new requirement pins mobile touch ergonomics
  (target sizes, safe areas, dynamic viewport height).

## Impact

- `src/styles/main.css` (and `ui.css` where mech buttons live): the whole
  mobile block - shell reflow, header compaction, stage/list flow, deck
  stacking, sheet presentation, touch sizing. No token changes.
- `index.html`: `viewport-fit=cover` on the viewport meta only.
- `src/ui/vinyl-deck.tsx` / CSS: a scale custom property so the turntable
  renders at the draft's mobile size as a unit.
- `src/main.tsx`: visualizer canvas sizing must stay correct under the new
  layout (verify; adjust only if the flow layout breaks boot-time sizing).
- `e2e/mobile-shell.spec.ts` (new): mobile-viewport scenarios for the reflow,
  the sheet, and the ergonomics; existing specs keep running at the desktop
  viewport.
