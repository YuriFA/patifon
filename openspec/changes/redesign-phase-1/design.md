# Design: redesign-phase-1

## Context

The shell (index.html) is a static BEM markup tree; `main.ts` queries
elements and hands them to feature `initX` modules that own their regions
imperatively (`replaceChildren`). Radio and playlists write into the same
list element the library uses; radio/playlists also reuse the shared filter
input. The player state flows to UI through the typed event contract
(`track:*`) and getters; radio exposes `onRadioStateChange` (multi-subscriber)
and `radioState()`. ADR-0001 fixes the stack: Preact + @preact/signals +
react-aria for views, vanilla core. Phase 1 covers the shell, library view
and transport; visualization content, lyrics, station card, popups and
recommendations stay as-is inside the new shell until phases 2-3.

## Goals / Non-Goals

**Goals:**

- New HI-FI shell (sidebar / visualization area / transport) as persistent
  static regions with Preact islands mounted per region.
- A signals bridge exposing player and radio state to components without
  moving playback into the reactive tree.
- Library rows and transport controls on shared, accessible primitives.
- Region ownership that lets vanilla writers (radio, playlists) keep working
  unchanged until their phase.

**Non-Goals:**

- No restyling of radio, playlists, recommendations, EQ/scrobbling popups,
  station card, lyrics (phases 2-3) - they remain visually old inside the
  new shell for now.
- No dark theme, no webfont bundling (system mono stack only).
- No changes to playback, radio, playlists, or scrobbling behavior - specs
  outside the deltas stay true.
- No vinyl/visualizer work (phase 2).

## Decisions

1. **Static shell, islands at fixed mount points.** index.html defines the
   three regions with stable element IDs; `main.ts` mounts Preact roots
   into them and wires vanilla modules as before. No full-app single root:
   islands boundle-split naturally and cannot fight over each other's DOM.
2. **Signals bridge, one direction.** `src/ui/bridge.ts` (vanilla) creates
   the signal set (`position`, `duration`, `buffered`, `isPlaying`,
   `volume`, `muted`, `radioState`, `mode`) and keeps them updated from the
   existing typed player events and `onRadioStateChange`. Components read
   signals and call player/radio methods for commands; no new event paths.
3. **Persistent list container + portal.** The shared list `<ul>` stays a
   persistent static element with a stable reference. The library island
   renders its rows into it through a portal; outside library mode the
   portal renders nothing, so radio/playlists keep writing the same element
   with vanilla `replaceChildren` exactly as today. Ownership follows the
   active mode; the handoff is covered by an e2e scenario.
4. **Library rendering moves into the island; data stays vanilla.**
   `library/ui.ts` keeps records, import, persistence, source switching and
   exposes an activation API (`activateRecord`, filter state via the existing
   `routeSearch`); `buildRow`/`renderList` become the Preact row component
   (the shared row primitive for later waves). The filter input lives in the
   sidebar island and calls `routeSearch(value)` - the vanilla routing and
   the guarded vanilla writers keep working unchanged.
5. **Transport = react-aria primitives over the bridge.** Play/pause/next/
   previous as react-aria buttons; seek as a react-aria Slider whose track
   hosts the existing waveform strip canvas (vanilla `strip.ts` keeps
   drawing; the canvas is appended by ref); volume as a react-aria Slider +
   mute button. Time labels are signal-bound text.
6. **Theme as tokens.** CSS custom properties on `:root` (surfaces, text,
   accent, radii, font stack); the mono stack is
   `ui-monospace, "SF Mono", Menlo, Consolas, monospace` - no webfont in
   this phase. Old-styled leftovers (popups, station card) read tokens where
   trivially possible, full restyle deferred.
7. **Vite/TS integration.** `@preact/preset-vite` + aliases
   `react`/`react-dom` -> `preact/compat` (required by react-aria); JSX
   via `jsxImportSource: preact` in tsconfig. Dependencies: `preact`,
   `@preact/signals`, `@preact/preset-vite`, `react-aria` (+ `intl-icons`
   not needed), all build-time.

## Risks / Trade-offs

- **react-aria over preact/compat** is a compatibility layer -> narrow
  surface: only Slider/Button/Tabs-class components; any misbehaving control
  falls back to a native element implementation behind the same component
  API. Verified per control in e2e.
- **Portal ownership handoff** can regress (stale rows, double render) ->
  dedicated e2e scenarios: library -> radio -> library leaves no duplicated
  or interleaved rows; rapid switches are covered by the existing
  app-modes scenarios extended with the new markup.
- **Transitional visuals**: phase 2-3 regions keep old styles inside the new
  shell -> acceptable for one release; tokens applied where trivial.
- **Signals/event drift** (a signal not updated on some path) -> the bridge
  subscribes to the same typed events e2e already assert against; progress
  and state assertions in existing specs act as the net.
- **Selector rewrite blast radius** in e2e -> layout classes stay BEM-style
  and semantic; behavioral asserts move to `window.*` handles where
  possible, so future waves stop touching them.

## Migration Plan

Single branch, committed in waves: (1) deps, config, signals bridge,
tokens; (2) shell markup + mounts; (3) library island; (4) transport
island; (5) e2e rewrites + keyboard scenarios. The suite is green after
each wave; rollback is reverting the branch. No storage or API changes.

## Open Questions

None - scope, stack and seam are settled by ADR-0001 and the roadmap.

## Amendment (implementation)

Decision 5's react-aria route hit its planned fallback: over preact/compat,
react-aria's event plumbing (usePress/useSlider pointer and press handlers)
never fires, while prop rendering works. The sliders are native
`input[type=range]` elements layered invisibly over the styled track -
keyboard, pointer and screen-reader semantics come from the platform - and
transport/mute are native buttons. react-aria, react-stately and the react
aliases were removed; the a11y spec scenarios are covered by native
semantics.
