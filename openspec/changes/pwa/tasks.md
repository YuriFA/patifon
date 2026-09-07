# Tasks: pwa

## 1. App shell self-containment

- [x] 1.1 Remove the Google Fonts stylesheet link from `index.html`; replace the `"Roboto", sans-serif` font stack in `src/styles/main.css` with the system font stack. Verify: `npm run build` output contains no cross-origin asset references; visual check in dev.

## 2. Installable app

- [x] 2.1 Add `public/assets/images/icon.svg` (app icon, maskable-safe design) and reference it as the favicon in `index.html`. Verify: `npm run dev` shows the icon in the tab.
- [x] 2.2 Add `vite-plugin-pwa` (`generateSW`, `registerType: "autoUpdate"`), manifest (name, short_name, standalone display, theme/background colors matching the dark UI, SVG icon any + maskable). Verify: built `dist/` contains `manifest.webmanifest` and `sw.js`; `index.html` links the manifest.

## 3. Persistent storage

- [x] 3.1 Call `navigator.storage.persist()` once at startup in `src/main.ts`. Verify: `npm run typecheck` green.

## 4. E2e coverage

- [x] 4.1 Spec scenarios to tests: manifest and icon served same-origin and linked from the document; offline reload boots the interface; previously imported track plays while offline; persistent-storage call observed at startup. Verify: `npm run test:e2e` green.

## 5. Verification

- [x] 5.1 Full matrix `npm run lint && npm run typecheck && npm run format:check && npm run build && npm run test:e2e`. Verify: exit 0.
- [ ] 5.2 Manual pass in a real Chromium: install prompt appears, installed app launches standalone in its own window, offline relaunch boots the library. Verify: checklist noted in the change summary.
