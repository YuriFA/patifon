# Proposal: scrobbling

## Why

The player builds no listening history: every session starts from zero and
nothing leaves the machine. Scrobbling to ListenBrainz (the open MusicBrainz
project's free listening tracker) gives the user a persistent, public
listening history and stats, and is the only path to music recommendations
("discovery") that a purely client-side app can offer. A browser-level CORS
spike on 2026-09-08 confirmed ListenBrainz accepts requests from the app's
origin (POST `/1/submit-listens` answered 401 for a dummy token, GET
`/1/validate-token` answered 200 JSON), so the feature needs no backend.

## What Changes

- New `scrobbling` capability: user connects their ListenBrainz account by
  pasting a user token (validated via the API); scrobbling can be toggled
  off without disconnecting.
- A "playing now" listen is submitted when a library track starts playing.
- A completed listen is submitted when a library track has been played
  through at least half its length or 240 seconds (whichever comes first).
- Failed or offline submissions are queued in IndexedDB and retried
  automatically (on submit attempts and on the browser `online` event),
  never blocking playback.
- Radio playback is not scrobbled (v1 scope): station metadata is
  unreliable and cross-origin streams are not analyzable.

## Capabilities

### New Capabilities

- `scrobbling`: token setup and persistence, playing-now and completed-listen
  submissions with the completion rule, and the store-and-forward retry
  queue.

## Impact

- New module `src/scrobbling/` (API client, listen tracking, retry queue,
  popup UI).
- IndexedDB database version bump (5 -> 6) with a `listens` store for the
  retry queue.
- One small control-bar button plus popup (the equalizer-popup pattern) for
  token entry and status.
- Completion detection works on the player's existing event stream (no
  changes to AudioPlayer).
- No changes to radio, lyrics, playlists, or visualization behavior.
