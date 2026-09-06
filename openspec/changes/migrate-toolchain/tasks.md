# Tasks: migrate-toolchain

## 1. Toolchain scaffold

- [ ] 1.1 Create branch `modernization` from `master`. Verify: `git branch --show-current` prints `modernization`.
- [ ] 1.2 Rewrite `package.json`: name `audio-player`, type module, engines `>=20.19`, scripts `dev`/`build`/`preview` (vite), `lint` (oxlint), `format` (oxfmt), `typecheck` (tsc --noEmit), `test:e2e` (playwright test); devDependencies `vite`, `typescript`, `oxlint`, `oxfmt`, `@playwright/test`, `@fission-ai/openspec`; delete all 2017 dependencies. Verify: `npm install` succeeds on Node 24 with zero deprecation errors about the old stack.
- [ ] 1.3 Add `vite.config.ts` (root entry, dev server port), `tsconfig.json` (strict, ES2022, DOM lib, noEmit), `.oxlintrc.json` (correctness+suspicious categories, no style rules), `.oxfmtrc` (defaults). Verify: `npm run lint` and `npm run typecheck` exit 0 on the scaffolded (empty src) state.
- [ ] 1.4 Move `src/index.html` to repo root, retarget script to `/src/main.ts`, stylesheet to `/src/styles/main.css`; move `src/static/assets` images to `public/assets`. Verify: `npm run dev` serves the page shell.

## 2. Code migration to TypeScript

- [ ] 2.1 Convert utils first (`utils/event-emitter.ts` with the `EventEmitter` rename, `utils/range-slider.ts`, remaining helpers), deleting dead ones (`DOMBuilder`, `ObjectAssign` if unused after migration). Verify: `npm run typecheck` green.
- [ ] 2.2 Convert `Track` to metadata-only (`track.ts`: id, src, name - no element, no event forwarding). Verify: typecheck green; grep shows no `createMediaElementSource` outside the player.
- [ ] 2.3 Convert `Playlist`, `Equalizer` (presets table, +/-12 dB clamp), `Analyser`. Verify: `npm run typecheck` green.
- [ ] 2.4 Convert `AudioPlayer`: single owned `HTMLAudioElement`, one source node created on first gesture, `resume()` on suspended state before `play()`, `statechange` observed, event listeners attached once, clamped volume setter, legacy mute semantics, next/prev wrap via existing reset-to-0 behavior. Verify: `npm run typecheck` and `npm run lint` green.
- [ ] 2.5 Convert `main.js` UI glue to `src/main.ts` (same selectors, same behaviors, no console.log). Verify: manual pass in `npm run dev` - transport, volume, wheel, seek, equalizer popup, presets.
- [ ] 2.6 Translate `src/styles/main.scss` + helpers to a single `src/styles/main.css` with native nesting and custom properties. Verify: visual pass in dev server against the old look; no `.scss` files remain.

## 3. Old stack removal

- [ ] 3.1 Delete `gulp/`, `gulpfile.js`, `.babelrc`, `.eslintrc`, `src/scripts/`, `src/styles/*.scss`. Verify: `grep -r "gulp\|babelify\|browserify"` in repo (excluding docs/openspec) returns nothing; `npm run build` still succeeds.

## 4. E2E smoke (Playwright)

- [ ] 4.1 Add `playwright.config.ts` (chromium, webServer running `vite preview` against the production build) and `e2e/player.spec.ts` serving an in-memory generated sine WAV via route interception. Verify: `npm run test:e2e` green.
- [ ] 4.2 Cover the capability specs: play-after-load starts (autoplay-resume), pause/resume keeps position, next/prev switch tracks, seek keeps playing, volume slider + mute reflect state, equalizer preset applies to all bands, visualizer renders while playing / freezes on pause / survives resize. Verify: every scenario in `openspec/changes/migrate-toolchain/specs/` maps to at least one passing test.

## 5. Final verification and archive prep

- [ ] 5.1 Full matrix: `npm run lint && npm run typecheck && npm run format && npm run build && npm run test:e2e` all green in one sequence. Verify: exit 0.
- [ ] 5.2 Manual parity checklist from proposal (all controls behave as before). Verify: checklist ticked in the change notes.
- [ ] 5.3 Delete `docs/research/refresh-and-development-directions.md` sections 1-2 content now captured by this change (per roadmap per-phase consumption policy; keep sections referenced by later phases or split the file). Verify: remaining research files still cover phases 2-7 facts.
