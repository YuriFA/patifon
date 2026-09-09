# Proposal: pwa

## Why

The player is a full music library that lives entirely in the browser, but it
is tied to the network: a fresh tab load fails offline, the app is not
installable, and the imported library (IndexedDB, audio blobs included) sits
in best-effort storage the browser may evict under pressure. Making it a PWA
covers all three: installable standalone app, offline app shell, and
persistent storage for the library.

## What Changes

- Add `vite-plugin-pwa` (Workbox `generateSW`) precaching the built app
  shell, with a web manifest and an app icon.
- Self-host the UI font: remove the Google Fonts stylesheet link (the only
  external asset) and use the system font stack, so the shell has no network
  dependencies.
- Request persistent storage (`navigator.storage.persist()`) at startup so
  the IndexedDB library is not evicted.
- Service worker updates automatically on new deployments (no user prompt).

## Capabilities

### New Capabilities

- `pwa`: installable standalone app with an offline app shell, offline
  library playback, and persistent storage for the library.

### Modified Capabilities

(none)

## Impact

- `vite.config.ts`: plugin configuration (manifest, precache, autoUpdate).
- `index.html`: manifest link, theme color, icon; Google Fonts link removed.
- `src/styles/main.css`: font-family switches to the system stack.
- `public/assets/images/icon.svg`: new app icon (SVG, follows the existing
  SVG asset convention).
- `src/main.ts`: `navigator.storage.persist()` call.
- e2e: offline reload boots the shell, offline playback of an imported
  track, manifest/icon served, persist call observed.
