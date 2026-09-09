# Tasks: redesign-phase-1

## 1. Foundation

- [ ] 1.1 Dependencies and config: `preact`, `@preact/signals`, `@preact/preset-vite`, `react-aria`; Vite preset + `react`/`react-dom` aliases; `jsxImportSource: preact` in tsconfig. Verify: `npm run build` green with a stub component.
- [ ] 1.2 Signals bridge `src/ui/bridge.ts`: signals for `position`, `duration`, `buffered`, `isPlaying`, `volume`, `muted`, `radioState`, `mode`, updated from the typed player events and `onRadioStateChange`. Verify: `npm run typecheck` green.
- [ ] 1.3 Theme tokens in `main.css` (`:root` custom properties: surfaces, text, accent, radii, mono font stack) applied to the shell. Verify: `npm run build` green.

## 2. Shell

- [ ] 2.1 Restructure `index.html` into the persistent regions (sidebar / visualization area / transport) with stable IDs; keep old inner markup of not-yet-migrated regions working. Verify: `npm run build` green, app boots.
- [ ] 2.2 Island mounts in `main.ts`: sidebar chrome (header, filter input, add buttons, mode buttons), library rows region, transport; existing vanilla `initX` calls keep their element references. Verify: `npm run test:e2e` green except intentionally rewritten selectors.

## 3. Library island

- [ ] 3.1 Shared row component + library rows rendered via portal into the persistent list container; rows render only in library mode; row keyboard activation per spec. Verify: `npm run test:e2e` green (library specs updated).
- [ ] 3.2 Filter input in the sidebar island routed through `routeSearch`; library data/import/source logic stays in `library/ui.ts` behind an activation API. Verify: `npm run test:e2e` green (filter scenarios).
- [ ] 3.3 Ownership handoff e2e: library -> radio -> library leaves no duplicated or interleaved rows; radio/playlists write the same container unchanged. Verify: `npm run test:e2e` green.

## 4. Transport island

- [ ] 4.1 Transport buttons (play/pause, next, previous) as react-aria buttons bound to bridge signals and player methods; glyph reflects the engaged source. Verify: `npm run test:e2e` green (transport scenarios).
- [ ] 4.2 Seek slider (react-aria) with the waveform strip canvas mounted by ref; keyboard seek steps; time labels from `position`/`duration` signals. Verify: `npm run test:e2e` green (seek scenarios).
- [ ] 4.3 Volume: react-aria slider + mute button with keyboard adjustment per spec. Verify: `npm run test:e2e` green (volume scenarios).

## 5. Spec scenarios to e2e

- [ ] 5.1 Keyboard scenarios: row activation, transport play/pause, seek step, volume step + keyboard mute. Verify: `npm run test:e2e` green.
- [ ] 5.2 Shell scenarios: regions persist across mode switches and reload; theme tokens drive accent/colors (spot-check via computed style). Verify: `npm run test:e2e` green.

## 6. Verification

- [ ] 6.1 Full matrix `npm run lint && npm run typecheck && npm run format:check && npm run build && npm run test:e2e`. Verify: exit 0.
- [ ] 6.2 Manual pass in a real browser: library round trip with playback, radio takeover and station card (old styles), waveform seek, keyboard-only walk of transport + volume; visual check against the mockup direction. Verify: checklist noted in the change summary.
