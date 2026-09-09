# Preact + signals for the UI redesign

A full visual redesign (HI-FI SYSTEM direction, 2026-09-09 mockup) rewrites
every view regardless of stack, so the migration cost of a UI framework is
already paid by the redesign itself. We adopt **Preact + @preact/signals**
for the view layer while the playback core stays vanilla TypeScript
modules. Accessibility comes from native elements first; Zag.js (first-party
`@zag-js/preact`) is the sanctioned library for genuinely hard a11y
patterns (see Amendment).

## Context

The architecture audit (2026-09-09) found the state core clean after the
app-modes change; the remaining UI pains are duplicated row builders across
four modules and a hand-rolled, keyboard-inaccessible RangeSlider. The
project is a solo, long-term portfolio PWA (Tauri later), no SSR. Hard
constraints: the `<audio>` element must never remount (one
`MediaElementAudioSourceNode` per element for its lifetime - remounting
silently kills the Web Audio graph), first-load bundle stays small
(butterchurn already lazily chunked), the stack must run in WebView/Tauri.

## Decision

- Views become Preact islands; the playback core (`AudioPlayer`, Web Audio
  graph, radio playback, `modes.ts`, IndexedDB stores) stays vanilla
  TypeScript modules.
- Media elements are imperative singletons created outside the reactive
  tree; Preact never renders `<audio>`/`<video>` and only calls player APIs
  (signals such as `player.position` / `isPlaying` in, method calls out).
- Accessibility: native elements and platform semantics first
  (`input[type=range]`, `button`, `dialog`); a headless library is allowed
  only for patterns the platform cannot express well. Amended 2026-09-10:
  that library is Zag.js, not react-aria.

## Considered options

- **Stay vanilla** - the honest default: a shared row builder plus a native
  `input[type=range]` would meet the stated pains cheaply. Rejected because
  the redesign removes the migration-cost argument, and JSX + signals
  ergonomics pay off across a whole-view rebuild.
- **Solid + Kobalte** - cleanest signal paradigm, but the thinnest
  ecosystem; a compat-less library break leaves one maintainer. Ranked
  second.
- **Lit** - custom elements coexist best with vanilla code, but the redesign
  needs bespoke components no library provides, `html` templates are verbose
  at this scale, and shadow DOM means reworking the global BEM styles.
- **React** - 40kb+ against a hard bundle constraint and zero learning
  value for a React-experienced owner.
- **Preact + signals** (chosen) - React-ecosystem escape hatch via
  `preact/compat` (TanStack Query/Table/Form ship official Preact
  packages; `virtual-core` is framework-agnostic), the same signals
  paradigm as Solid, ~4-6kb, direct reuse of the owner's React experience.
  Compat does NOT extend to react-aria - see Amendment.

## Consequences

- New UI code is Preact islands mounted per view region; `initX` bootstrap
  modules shrink to island mounts and store wiring.
- All media playback keeps flowing through the vanilla player APIs; a signal
  layer binds player state to components (no DOM event re-plumbing).
- E2E: layout-specific selectors will be rewritten per redesign wave;
  behavioral assertions through `window.player` / `window.radio` /
  `window.appReady` survive.
- Revisit triggers: multi-contributor growth (React mainstream onboarding
  may outweigh Preact), a hard need for a Solid/Radix-class component
  ecosystem, or Tauri revealing a WebView incompatibility.

## Amendment (2026-09-10): native-first a11y, Zag.js instead of react-aria

The original decision named react-aria as the accessibility layer. During
redesign-phase-1 its event plumbing (usePress/useSlider) did not fire
reliably over `preact/compat`; a pointer to known incompatibilities is
preactjs/preact#4972 (`useSyncExternalStore` vs react-aria-components).
Adobe closed the Preact-support request as _not planned_
(adobe/react-spectrum#781), citing reliance on React's synthetic event
system. Phase 1 shipped native controls instead and met every a11y
scenario in the specs.

Revised policy: native-first for controls; Zag.js (`@zag-js/preact`, a
first-party adapter in the Zag.js monorepo, headless WAI-ARIA state
machines) is the sanctioned exception for hard patterns - dialog focus
trapping, combobox - where the platform (`<dialog>`, `popover`) is
insufficient. Virtualize a grown track library with
`@tanstack/virtual-core` directly. Landscape and citations:
`docs/research/preact-component-libraries.md`.
