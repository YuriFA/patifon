# Tasks

1. [ ] Replace the icon artwork
   - 1.1 Rewrite `public/assets/images/icon.svg` with the approved Warm Earth
     vinyl composition (canvas backing, squircle tile, record with grooves,
     mint label, teal spindle, tonearm: counterweight, wand, pivot, headshell
     with cartridge and stylus) per design.md geometry.
     Verify: file parses as XML and renders the tile + arm shapes.
   - 1.2 Add `public/assets/images/icon-maskable.svg`: full-bleed `#f6f2ec`
     background, artwork group scaled 0.7 about the center, everything inside
     the 80% safe zone.
     Verify: worst artwork point stays within radius 410 of the canvas center.
2. [ ] Align the PWA manifest
   - 2.1 In `vite.config.ts` set `background_color` and `theme_color` to
     `#f6f2ec` and point the `maskable` icon entry at
     `assets/images/icon-maskable.svg` (keep exactly two icon entries).
     Verify: built manifest has the new colors and both icon srcs.
3. [ ] Cover the change in e2e
   - 3.1 Extend the manifest scenario in `e2e/pwa.spec.ts` to fetch every
     manifest icon (not only the first) and assert all resolve same-origin.
     Verify: `npx playwright test e2e/pwa.spec.ts` is green.
4. [ ] Full gate and sync
   - 4.1 Run `npm run typecheck && npm run lint && npm run format:check &&
npm run build && npm run test:e2e`.
     Verify: all green.
   - 4.2 Sync the delta into `openspec/specs/pwa/spec.md` and run
     `openspec validate --specs`.
     Verify: validator passes.
