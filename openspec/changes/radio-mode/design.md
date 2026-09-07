# Design: radio-mode

## Context

The player routes ALL audio through one media element feeding a
`MediaElementAudioSourceNode` (Web Audio graph: EQ, visualizer). That
routing is the central constraint for radio: a cross-origin stream played
through a graph-connected element without CORS headers outputs silence
(tainted source), and connecting an element to the graph is irreversible.
Research (docs/research/) flags CORS on streams as the main risk; many
Icecast servers send `Access-Control-Allow-Origin: *`, many do not.
radio-browser API: server discovery via DNS lookup of
`all.api.radio-browser.info`, mirrors with failover, uuid fields (not id),
click reporting via `/json/url/<stationuuid>`. Browsers cannot set custom
`User-Agent` or `Host` headers (forbidden headers), so the DNS-lookup +
Host-header recommendation is not applicable client-side.

## Goals / Non-Goals

**Goals:**

- Search + play community stations with the existing transport and OS media keys.
- Direct and HLS streams, automatic per station.
- Click reporting; station name/icon on OS surfaces.
- Honest failure states (dead streams, offline catalog).

**Non-Goals:**

- Equalizer/visualizer for radio (see decision 1; revisit via a CORS probe later).
- Station favorites/backup, genre browsing, language filters.
- Podcasts (separate future change).
- Recording streams.

## Decisions

1. **Dedicated radio element, NOT routed through the Web Audio graph.** The
   library element keeps its `MediaElementAudioSourceNode`; radio gets its
   own `HTMLAudioElement` playing streams directly (`audio.src = url`).
   Rationale: routing a stream through the graph requires CORS on the
   stream; when CORS is missing the graph emits silence with no recovery
   path - guaranteed-broken radio on a large share of stations. Plain
   element playback plays everything. Trade-off: no EQ/visualizer on radio;
   volume/mute are applied to both elements (same control). A future
   enhancement can probe CORS (fetch HEAD) and route CORS-clean streams
   through the graph; deliberately out of scope now.
2. **Mirror list with random pick and failover, cached per session.** A
   constant list of radio-browser mirrors (de1/de2/fi1 + all.api as final
   fallback); a request tries a random mirror and falls through to the next
   on failure; the winning mirror is reused for the session. This mirrors
   the API's own "random server + failover" guidance within browser
   constraints.
3. **Search request**: `GET /json/stations/search?name=<q>&limit=50&hidebroken=true&order=votes&reverse=true`
   - the default catalog ordering by community votes; uuid fields are used
     for identity (`stationuuid`).
4. **Click reporting**: fire-and-forget `GET /json/url/<stationuuid>` when a
   station starts playing. Failures are ignored - ranking must never break
   playback.
5. **Transport-source abstraction in `media-session.ts`.** OS actions and
   state publication route to the "active source". The library player
   registers as the default source; radio activates itself on play and
   deactivates on stop/error, at which point the library source resumes
   control. Exports: `setActiveSource(source | null)` plus publish helpers;
   the existing `initMediaSession` wiring and its spec'd behavior are
   unchanged.
6. **HLS via hls.js, lazy-loaded.** If `url_resolved` ends in `.m3u8` (or
   the station's content type is HLS), `Hls.isSupported()` gates dynamic
   `import("hls.js")`; the engine attaches to the radio element and is
   destroyed on switch/stop. Direct streams set `element.src` directly.
7. **UI**: a "Radio" toggle button in the library header switches the list
   between library and station results; the shared search box queries the
   catalog in radio mode (debounced). Station rows reuse the row styling
   (favicon/avatar placeholder, name, tags, bitrate). The progress area
   shows a "LIVE" badge while a station plays; the progress slider is
   inert. Prev/next transport buttons are no-ops in radio mode (single
   live stream).
8. **Stream failure surfacing**: element `error` events (and hls.js
   `ERROR` fatal events) mark the station row with an error state and reset
   the transport to stopped. No auto-retry loop - a dead station stays
   visibly dead.

## Risks / Trade-offs

- **CORS API access to radio-browser**: the API serves
  `Access-Control-Allow-Origin: *` (documented for browser clients); e2e
  mocks the endpoints, so real reachability is a manual item.
- **No EQ/visualizer on radio**: accepted trade-off (decision 1); the
  progress area communicates the mode switch, so the difference is
  discoverable rather than surprising.
- **hls.js bundle size (~200 KB)**: lazy dynamic import - paid only when an
  HLS station is actually played; direct streams never load it.
- **Ephemeral mirror outages**: failover list + error state keep the UI
  honest; no health-checking beyond the request itself.
- **Live streams in tests**: e2e fulfils stream requests with generated WAV
  bytes via route interception; real-world stream behavior (ICY metadata
  headers, codec quirks) is covered by the manual pass.
