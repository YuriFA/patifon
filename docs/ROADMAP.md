# Audio Player Roadmap

This roadmap is the master plan for modernizing and developing the audio
player. Each phase is implemented as an OpenSpec change
(`openspec/changes/`), authored one at a time, in this order. Decisions are
recorded as ADRs (`docs/adr/`); domain language lives in `CONTEXT.md`.

Decisions recorded on 2026-09-07 during the planning session:

- OpenSpec (`@fission-ai/openspec`) is the permanent spec-driven convention;
  if it turns into ceremony after the second feature, it gets dropped.
- Specs and commits in English; discussions in Russian.
- Migration phase preserves full behavior parity; nothing is dropped.
- Demo content: no binary audio files in the repo; e2e uses a generated
  sine-wave WAV fixture.

Decision recorded on 2026-09-09 (ADR-0001, amended 2026-09-10): the UI
redesign adopts **Preact + @preact/signals** for the view layer; the
playback core stays vanilla TypeScript modules. Accessibility is
native-first, with Zag.js sanctioned for hard patterns (dialog focus trap,
combobox); react-aria was tried and dropped (does not work over
`preact/compat`, Adobe declined Preact support). Research:
`docs/research/preact-component-libraries.md`.

## Completed phases (OpenSpec changes, archived)

1. **migrate-toolchain** - Vite 8, TypeScript strict, plain modern CSS,
   oxlint + oxfmt, `tsc --noEmit`, Playwright; gulp/browserify/babel stack
   deleted.
2. **local-library** - drag-and-drop + File System Access API, tags via
   `music-metadata`, IndexedDB persistence, Fuse.js fuzzy search.
3. **media-session** - OS/lock-screen transport controls and metadata.
4. **pwa** - `vite-plugin-pwa` offline shell, `navigator.storage.persist()`.
5. **radio-mode** - radio-browser catalog, HLS via hls.js.
6. **synced-lyrics** - LRCLIB fetch + karaoke highlighting, IndexedDB cache.
7. **track-waveform + visualizer-v2** - offline-rendered waveform peaks,
   waveform seek strip, bars visualizer.
8. **playlists** - user playlists from library tracks, reorder, queue.
9. **scrobbling** - ListenBrainz submits, retry queue, throttled
   playing-now.
10. **recommendations** - ListenBrainz top releases matched to the library,
    save-as-playlist.
11. **butterchurn** - MilkDrop WebGL2 visualizer mode, lazy chunk.
12. **app-modes** - centralized mode state machine, typed playback event
    contract, derived UI, single-audible-source takeover.

## Current phase: UI redesign (HI-FI SYSTEM direction)

Stack per ADR-0001 (amended): Preact + signals; vanilla core; native-first
a11y, Zag.js for hard patterns. Waves, one OpenSpec change each:

1. **redesign-phase-1** (implemented 2026-09-10, commit `edcced6`) -
   foundation + library + transport on Preact: sidebar layout, track rows
   as a portal into the shared list, filter, signals bridge, native
   accessible transport/seek/volume controls with keyboard scenarios;
   behavioral e2e preserved via `window.*` handles, layout selectors
   rewritten; `idbPut` durability fix (transaction completion).
2. **redesign-phase-2** (implemented 2026-09-10, commit `2ade0e2`) -
   visualization area modes: LYRICS/VINYL/VISUALIZER tabs, Warm Earth theme
   tokens + dark transport, vinyl turntable with functional pitch fader and
   progress-tracking tonearm, now-playing panel; karaoke badge replaced by
   the lyrics tab.
3. **redesign-phase-3** - radio, playlists, recommendations, EQ popup,
   scrobbling popup; volume knob (custom a11y rotary).

The 2026-09-09 mockup is the direction reference, not a pixel contract.

## Backlog (deferred, revisit when stated)

- **Local AI transcription (transformers.js, Whisper)** - unique feature,
  heavy on resources. https://huggingface.co/docs/transformers.js/index
- **Subsonic/Navidrome client** - if a self-hosted server appears.
  API: http://www.subsonic.org/pages/api.jsp,
  https://www.navidrome.org/docs/developers/subsonic-api/
- **Desktop packaging (Tauri)** - when the web version is stable; verify
  Web Audio and Preact islands in WKWebView/WebKitGTK first.
  https://v2.tauri.app/start/

## Tooling notes (settled 2026-09-07)

- Linter: `oxlint` (stable 1.x, 870 rules) - https://oxc.rs/docs/guide/usage/linter.html
- Formatter: `oxfmt` (beta 0.x, Prettier-conformant; swap to Prettier is
  cheap if 0.x churn hurts) - https://oxc.rs/blog/2026-02-24-oxfmt-beta
- Type checking: `tsc --noEmit` (NOT the experimental `oxlint --type-check`)
- Node >= 20.19 (matches oxlint engines and Vite 8 requirements)
