# Repository Guidelines

## Project Overview

Client-side web audio player PWA with no backend: local music library (drag-drop import, tag parsing), internet radio (Radio Browser), synced lyrics (LRCLIB), ListenBrainz scrobbling and recommendations, 10-band equalizer, waveform strips, and two visualizers (2D canvas bars and Butterchurn WebGL2). Vite + TypeScript, no framework. Development is spec-driven via OpenSpec.

## Architecture & Data Flow

- `index.html` is the entire declarative UI shell (BEM classes, many elements start `hidden`, no mount point). The single script is `<script type="module" src="/src/main.ts">`.
- Bootstrap: `src/main.ts` queries the static DOM, constructs the single `AudioPlayer` (default export of `src/audio-player.ts`), then calls per-feature `initX(player, deps)` (`initLibrary`, `initRadio`, `initPlaylists`, ...). Deps are plain options objects carrying element refs and callbacks; there is no DI container. Bootstrap ends by setting `window.appReady = true` (the e2e readiness gate).
- WebAudio graph, built lazily in `ensureAudioContext` and skipped entirely if WebAudio is unavailable: `<audio>` -> MediaElementSource -> Equalizer (10 chained peaking BiquadFilters, 60 Hz to 16 kHz, `src/equalizer.ts`) -> GainNode -> AnalyserNode -> destination.
- Radio playback deliberately uses a dedicated audio element OUTSIDE this graph (CORS taint; decision recorded in `openspec/changes/archive/2026-09-08-radio-mode/design.md`).
- Event flow: `AudioPlayer` extends the generic `EventEmitter` (`src/utils/event-emitter.ts`) typed by the `AudioPlayerEvents` map (`src/audio-player-events.ts`) and forwards media events as `track:<name>`; features subscribe via `player.on(...)`. View-mode exclusivity and single-audible-source takeover live in `src/modes.ts` (`setMode`, `engageSource`); feature modules subscribe to `onModeChange`/`onSourceChange` for enter/exit, and `src/transport.ts` derives the transport glyph. Radio takes over OS transport via `setActiveSource` (`MediaSessionSource` interface in `src/media-session.ts`).
- Feature folders follow a fixed shape: `api.ts` (network client), `store.ts` (persistence), `ui.ts` (init + render), plus helpers.
- Persistence split:
  - IndexedDB, DB `audio-player` v6 via `src/utils/idb.ts` (stores: tracks with file/artwork Blobs, stations, lyrics cache, playlists, waveforms, listens retry queue).
  - localStorage for small prefs only: ListenBrainz token/username (`src/scrobbling/settings.ts`), visualizer mode, lyrics karaoke toggle.
  - Module-level memory for object-URL caches and transient state.
- Debug/e2e handles: `window.player`, `window.visualizer`, `window.appReady`.

## Key Directories

- `src/` - core files (`main.ts`, `audio-player.ts`, `track.ts`, `playlist.ts`, `equalizer.ts`, `analyser.ts`, `volume.ts`, `media-session.ts`) and feature folders (`library/`, `radio/`, `playlists/`, `lyrics/`, `scrobbling/`, `recommendations/`, `waveform/`, `visualizer/`), plus `utils/`, `styles/`, `types/`.
- `e2e/` - Playwright specs plus `helpers.ts` and `radio.helpers.ts`.
- `openspec/` - `specs/<capability>/spec.md` (current-behavior truth, 15 capabilities) and `changes/` (in-flight proposals; completed ones in `changes/archive/YYYY-MM-DD-<name>/`).
- `docs/` - `ROADMAP.md` (phase plan; each phase is one OpenSpec change) and `research/` (primary-source surveys, Russian, consumed per phase).
- `public/assets/images/` - flat SVG icons, white default for the dark theme; `black/` holds light-context variants.
- `.omp/skills/`, `.omp/commands/` - OpenSpec workflow skills (`openspec-*`) and `opsx-*` commands.

## Development Commands

| Command                                   | Purpose                                                                  |
| ----------------------------------------- | ------------------------------------------------------------------------ |
| `npm run dev`                             | Vite dev server on :5173                                                 |
| `npm run build`                           | Production build (also generates the PWA service worker; run before e2e) |
| `npm run preview`                         | Serve `dist/` on :4173                                                   |
| `npm run lint`                            | oxlint                                                                   |
| `npm run format` / `npm run format:check` | oxfmt                                                                    |
| `npm run typecheck`                       | `tsc --noEmit`                                                           |
| `npm run test:e2e`                        | Playwright (auto-starts preview on :4173)                                |
| `npx playwright test e2e/radio.spec.ts`   | Single spec; add `-g "title"` to filter, `--headed`/`--debug` to inspect |
| `openspec validate --specs`               | Validate main specs after syncing deltas                                 |

There is no CI (`.github/` absent). Local runs are the only gate; before yielding a change run `npm run typecheck && npm run lint && npm run format:check && npm run test:e2e`.

## Code Conventions & Common Patterns

- TypeScript `strict` plus `noUnusedLocals`/`noUnusedParameters` (see `tsconfig.json`); oxlint enforces `no-console: "error"` - do not add console logging.
- DOM: 100% `createElement` + `className` + `append`; re-render lists with `parent.replaceChildren(...rows)`. Never `innerHTML`/`insertAdjacentHTML`. BEM-ish selectors: `.library__row`, `.player-controls__btn_play`.
- Naming: kebab-case files; default exports for classes (`AudioPlayer`, `RangeSlider`), named exports for functions/types; `initX` bootstrap functions; `XRecord` types for persisted data.
- Error handling: defensive degradation, not throwing UIs. Discriminated unions for retryable network results (`SubmitResult` in `src/scrobbling/api.ts`); resolve to `null` when absence is normal (`src/lyrics/api.ts`); rethrow with `new Error(msg, { cause })` (`src/recommendations/api.ts`); silent catches carry a comment explaining why.
- Async: async/await throughout; fire-and-forget with `void fn()`; `Promise.withResolvers` for deferred bridges; honor `Retry-After` on 429 (capped). Each `api.ts` is self-contained by design - no shared fetch helper; keep new network code inside its feature folder.
- CSS: dark theme custom properties on `:root` (`--bg-color: #262f35`, `--red: #ce3d60`, ...), native CSS nesting, global `[hidden] { display: none !important; }`. Styles live in `src/styles/main.css` plus per-feature files (`recommendations.css`, `scrobbling.css`), all imported from `src/main.ts`.
- Language: code, specs, and commits in English (`openspec/config.yaml`). Commits are short imperative single-line subjects without prefixes: "Skip seek when the track duration is not finite", "Plan app-modes change: mode state machine, typed playback events".

## Change Workflow (OpenSpec)

Any user-visible behavior or capability change goes through OpenSpec, not a direct edit:

1. `openspec new change "<kebab-name>"` scaffolds `openspec/changes/<name>/` (`.openspec.yaml`, `proposal.md`, `design.md`, `tasks.md`, delta `specs/`). Never hand-create the folder.
2. Artifacts: `proposal.md` (`## Why`, `## What Changes`), `design.md` (`## Decisions`), `tasks.md` (`- [ ] N.M` checkboxes, each ending with `Verify: ...`), and delta specs using `## ADDED|MODIFIED|REMOVED Requirements` headers.
3. Apply: work tasks in order, flipping each `- [ ]` to `- [x]` the moment it is done; pause on ambiguity - never silently narrow scope.
4. Sync: merge deltas into `openspec/specs/<capability>/spec.md` (format: `## Purpose`, then `### Requirement:` blocks with RFC-2119 SHALL/MUST and `#### Scenario:` WHEN/THEN bullets), then `openspec validate --specs`.
5. Archive: move the change to `changes/archive/YYYY-MM-DD-<name>/` (date once, never double-date).

Main specs are current-behavior truth: read the relevant spec before touching a feature. Planning (propose/update) never mixes with code edits in the same response; the skills in `.omp/skills/openspec-*/SKILL.md` define the boundaries.

## Important Files

- `index.html` - whole UI shell; markup edits happen here.
- `src/main.ts` - entry point and wiring; register new feature `initX` calls here.
- `src/audio-player.ts` - transport, playlist ownership, WebAudio graph.
- `src/utils/event-emitter.ts` - the player pub/sub contract (`track:*` events).
- `src/utils/idb.ts` - IndexedDB helpers; bump the DB version when adding stores.
- `src/types/butterchurn.d.ts` - ambient types for the untyped butterchurn package.
- `vite.config.ts` - inline PWA manifest, `registerType: "autoUpdate"`; no hand-written service worker exists.
- `playwright.config.ts` - preview server on :4173, chromium-only project.
- `tsconfig.json` - strict, ES2022, includes `src` and `e2e` (e2e code is typechecked).
- `.oxlintrc.json` / `.oxfmtrc.json` - lint categories (`correctness`/`suspicious` error, `pedantic` warn) and default formatting.

## Runtime/Tooling Preferences

- Node `>=20.19` (`engines`), npm only (`package-lock.json`; no pnpm/yarn lock).
- Runtime deps: `fuse.js` (library fuzzy search), `hls.js` (HLS radio streams), `music-metadata` (tag parsing). `butterchurn`/`butterchurn-presets` are devDependencies bundled at build time.
- No env vars or server secrets: the ListenBrainz token lives in localStorage; all external APIs are public and called client-side.
- Service worker and web manifest are generated by `vite-plugin-pwa` at build; never commit manual SW files.

## Testing & QA

- Playwright e2e only; there are no unit tests. `npm run test:e2e` serves the production build, so run `npm run build` first when testing fresh code.
- Determinism without binary fixtures: `e2e/helpers.ts` synthesizes sine WAVs in memory (`makeSineWav`), builds ID3-tagged WAVs (`makeTaggedWav`), and imports via synthetic DragEvent (`dropFile`). All external APIs are route-mocked with `page.route`: ListenBrainz, lrclib, Radio Browser catalog and streams (`e2e/radio.helpers.ts`). Feature stubs via `addInitScript`: MediaSession capture/deletion, `decodeAudioData` counting, no-WebGL2 canvas override.
- Selectors are BEM classes; state is asserted via `page.evaluate(() => window.player...)`; bootstrap is gated on `waitForAppReady`; IndexedDB is asserted by opening DB `audio-player` inside `page.evaluate`.
- One spec per feature (`player`, `library`, `playlists`, `scrobbling`, `recommendations`, `lyrics`, `radio`, `waveform`, `butterchurn`, `media-session`, `pwa`); volume and equalizer scenarios live inside `e2e/player.spec.ts`. Chromium-only.
- When working an OpenSpec change, the `Verify:` step of each task typically means a new e2e scenario plus a green full suite.
