# Audio Player Roadmap

This roadmap is the master plan for modernizing and developing the audio player.
Each phase is implemented as an OpenSpec change (`openspec/changes/`), authored
one at a time, in this order. Phase specs distill what they need from
`docs/research/`; the corresponding research file is deleted once its facts are
captured in specs (per-phase consumption).

Decisions recorded on 2026-09-07 during the planning session:

- OpenSpec (`@fission-ai/openspec`) is the permanent spec-driven convention;
  if it turns into ceremony after the second feature, it gets dropped.
- Specs and commits in English; discussions in Russian.
- Migration phase preserves full behavior parity; nothing is dropped.
- Demo content: no binary audio files in the repo; e2e uses a generated
  sine-wave WAV fixture.

## Phases (OpenSpec changes, in order)

1. **migrate-toolchain** - Vite 8, TypeScript strict (all modules converted),
   plain modern CSS (native nesting, no SCSS/Tailwind), oxlint + oxfmt,
   `tsc --noEmit`, Playwright smoke test, audio fixes (autoplay `resume()`,
   `createMediaElementSource` leak, logging cleanup, `EventEmmiter` rename),
   clean cutover: the gulp/browserify/babel/eslint-3 stack is deleted.
   Sources: `docs/research/refresh-and-development-directions.md` (sections 1-2).

2. **local-library** - drag-and-drop + File System Access API (Chromium, with
   `<input>`/DnD fallback), tags via `music-metadata` (`parseBlob`), IndexedDB
   persistence for playlists/covers, Fuse.js fuzzy search.
   Sources: research round 1 section 3.2; `music-metadata`
   https://github.com/Borewit/music-metadata, Fuse.js https://www.fusejs.io/.

3. **media-session** - Media Session API: OS/lock-screen/headset transport
   controls, `MediaMetadata` (title/artist/album/artwork), `setActionHandler`,
   `playbackState`. Chrome 73+/Firefox 82+/Safari 15+ per MDN BCD.
   Sources: https://developer.mozilla.org/en-US/docs/Web/API/Media_Session_API,
   https://web.dev/articles/media-session.

4. **pwa** - `vite-plugin-pwa` (Workbox service worker, manifest injection),
   offline app shell, `navigator.storage.persist()` for the IndexedDB library.
   Sources: https://vite-pwa-org.netlify.app/, https://web.dev/learn/pwa/offline-data.

5. **radio-mode** - community radio catalog via radio-browser API
   (DNS-lookup server discovery, talking User-Agent, `/json/url` click
   ranking), HLS playback via hls.js feeding the existing media element.
   Sources: https://api.radio-browser.info/, https://github.com/video-dev/hls.js.

6. **synced-lyrics** - LRCLIB: `GET /api/get` best-match by title+artist
   (duration within +/-2s is crucial), `syncedLyrics` LRC timestamps drive
   karaoke highlighting by `audio.currentTime`; cache in IndexedDB; identify
   via `Lrclib-Client` header (browsers cannot set User-Agent); honor 429 +
   `Retry-After`. Sources: https://lrclib.net/docs.

7. **visualizer-v2** - wavesurfer.js (waveform, regions, BSD-3) + track peaks
   pre-rendered offline via `decodeAudioData`/`OfflineAudioContext` and cached,
   beat detection for rhythm-synced effects (web-audio-beat-detector or
   realtime-bpm-analyzer); optional spectrum engine (Butterchurn WebGL2 /
   audioMotion-analyzer, note AGPL on the latter).
   Sources: https://wavesurfer.xyz/, https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext,
   https://github.com/jberg/butterchurn, https://github.com/hvianna/audioMotion-analyzer.

## Backlog (deferred, revisit when stated)

- **ListenBrainz scrobbling + ML recommendations** - after `pwa`, once there is
  a real listening history. API: https://listenbrainz.readthedocs.io/
- **Subsonic/Navidrome client** - if a self-hosted server appears.
  API: http://www.subsonic.org/pages/api.jsp, https://www.navidrome.org/docs/developers/subsonic-api/
- **Desktop packaging (Tauri)** - when the web version is stable; verify Web
  Audio in WKWebView/WebKitGTK first. https://v2.tauri.app/start/
- **Local AI transcription (transformers.js, Whisper)** - unique feature,
  heavy on resources. https://huggingface.co/docs/transformers.js/index

## Tooling notes (settled 2026-09-07)

- Linter: `oxlint` (stable 1.x, 870 rules) - https://oxc.rs/docs/guide/usage/linter.html
- Formatter: `oxfmt` (beta 0.x, Prettier-conformant; swap to Prettier is cheap
  if 0.x churn hurts) - https://oxc.rs/blog/2026-02-24-oxfmt-beta
- Type checking: `tsc --noEmit` (NOT the experimental `oxlint --type-check`)
- Node >= 20.19 (matches oxlint engines and Vite 8 requirements)
