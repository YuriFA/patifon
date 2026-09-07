# Proposal: radio-mode

## Why

The player handles only local files. A radio mode turns it into an everyday
listening app: thousands of live community stations are available through the
open radio-browser catalog with no server, no API key and no licensing
concerns, and the existing transport (play/pause, volume, media keys) can
drive them.

## What Changes

- Add a radio mode in the library area: search the radio-browser station
  catalog by name and list matching stations with tags and bitrate.
- Play a station on row activation through the existing transport controls;
  highlight the playing station and show a live-state progress area.
- Report station playback to the catalog (`/json/url/<stationuuid>`) so the
  community ranking counts this player's listens.
- Publish station metadata (name, tags, favicon) to the Media Session while
  a station plays; play/pause actions from OS surfaces act on the station.
- Support HLS streams (`.m3u8`) via hls.js alongside direct ICY/HTTP streams.
- Show a visible error state when a station stream or the catalog is
  unavailable (radio is inherently online-only).

## Capabilities

### New Capabilities

- `radio`: station catalog search, live-stream playback with the existing
  transport, click reporting, station metadata on OS surfaces, and failure
  states.

### Modified Capabilities

(none - the media session integration gains a transport-source switch, but
its published requirements hold unchanged)

## Impact

- New module `src/radio.ts` (catalog client, stream playback, live element).
- `src/media-session.ts`: transport actions route to the active source
  (library player or radio); public setters for metadata/state publication.
- `src/main.ts`: mode toggle wiring; transport handlers delegate to the
  active source.
- `index.html` + `src/styles/main.css`: radio toggle button, station rows.
- New dependency: hls.js (~200 KB, lazy-loaded only when an HLS stream is
  played).
- e2e: mocked catalog API and stream responses (no real network in tests);
  real-stream verification is a manual item.
