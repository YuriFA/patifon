# Design: pwa

## Context

Vite 8 build (`vite build` + `vite preview` for e2e), single-page app, no
backend. The only external runtime asset is the Google Fonts stylesheet for
Roboto (index.html line 7); everything else is bundled or under `public/`.
The library persists in IndexedDB (own wrapper, `audio-player` db) and plays
through blob object URLs, so playback has no network dependency by design.
SVG assets under `public/assets/images/` are the established icon convention.

## Goals / Non-Goals

**Goals:**

- Installable standalone app (manifest + icon, same-origin only).
- Offline boot and offline library playback after the first visit.
- `navigator.storage.persist()` to protect the library from eviction.

**Non-Goals:**

- Update prompt UI (a toast/button) - the worker updates silently.
- iOS apple-touch-icon PNGs and Safari-specific meta (desktop-first player;
  recorded as a known trade-off below).
- Background sync, periodic sync, push notifications.
- Runtime caching strategies for network content - there is no network
  content; everything is precached or local.

## Decisions

1. **`vite-plugin-pwa` in `generateSW` mode, `registerType: "autoUpdate"`.**
   Workbox precaches the Vite build output; the service worker file is fully
   generated - no hand-written SW to maintain. `autoUpdate` matches the
   project's no-ceremony philosophy: on the next visit the new worker takes
   over without prompting. `injectManifest` would only pay off with custom
   caching, which we do not have.

2. **Drop the Google Fonts link; use the system font stack.** A third-party
   stylesheet cannot be precached reliably and breaks offline boot - the one
   thing this change exists to fix. `main.css` already declares
   `"Roboto", sans-serif`; it becomes the platform system stack. Visual
   delta: Roboto users see their platform UI font - acceptable for a player
   UI, and it removes a render-blocking request entirely.

3. **One SVG app icon (`public/assets/images/icon.svg`), dual purpose.**
   Follows the existing SVG asset convention, keeps the repo binary-free,
   and Chromium accepts `sizes: "any"` SVG for installability. Registered in
   the manifest as `purpose: "any"` and a second `purpose: "maskable"`
   entry. Trade-off: Safari/iOS ignore SVG icons for home-screen installs -
   out of scope for a desktop-first player.

4. **`navigator.storage.persist()` fires once at startup in `main.ts`.**
   Fire-and-forget: the call is the observable contract; the browser's grant
   decision is its own heuristic and is not surfaced in the UI. No wrapper,
   no settings surface.

5. **Dev mode stays SW-free.** `vite-plugin-pwa` does not register a worker
   on the dev server by default; e2e runs against `vite preview` (built
   output), where the worker exists. This keeps HMR clean.

## Risks / Trade-offs

- **Persist grant is not guaranteed**: Chromium decides via engagement
  heuristics; an installed PWA or notification permission typically grants
  it. The spec requires the request, not the grant - tests assert our call,
  not the browser's decision.
- **Offline e2e with `context.setOffline(true)`**: Playwright supports this
  against headless Chromium; the service worker must reach `activated`
  before going offline (await `navigator.serviceWorker.ready`). Flake risk
  is bounded by the retry-less deterministic ordering.
- **Precache size**: the bundle plus Workbox runtime is precached wholesale.
  The app is small (few hundred KB); the library media itself lives in
  IndexedDB and is deliberately NOT precached.
- **Stale worker during e2e reuse**: `reuseExistingServer: true` with a
  rebuilt `dist` could serve an old SW to a persistent browser profile -
  Playwright test contexts are fresh per test, so no cross-test SW state.
