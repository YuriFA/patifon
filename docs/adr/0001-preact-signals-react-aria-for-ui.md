# Preact + signals + react-aria for the UI redesign

A full visual redesign (HI-FI SYSTEM direction, 2026-09-09 mockup) rewrites
every view regardless of stack, so the migration cost of a UI framework is
already paid by the redesign itself. We adopt **Preact + @preact/signals +
react-aria** for the view layer while the playback core stays vanilla
TypeScript modules.

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
- Accessibility primitives (tabs, slider, dialogs, popovers) come from
  react-aria; bespoke controls (vinyl turntable, volume knob) are hand-built
  on the same patterns.

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
  `preact/compat` (react-aria, TanStack work; Radix-class internals-dependent
  libs may not), the same signals paradigm as Solid, ~4-6kb, direct reuse of
  the owner's React experience.

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
