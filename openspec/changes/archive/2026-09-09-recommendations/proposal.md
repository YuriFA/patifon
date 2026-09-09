# Proposal: recommendations

## Why

Scrobbling gave the player an external memory (ListenBrainz), but its payoff -
the "created for you" playlists (Weekly Jams, Weekly Exploration, year-in-music
compilations) - is only reachable by leaving the app. The playlists API is
public and CORS-open (verified 2026-09-09: `GET /1/user/YuriFA/playlists/createdfor`
returned valid JSON from the app's origin; list and detail endpoints probed
live), so the player can surface these playlists without a backend.

LB playlists carry metadata only (title, artist, album, duration, MBIDs) - no
audio. The player's library is the only audio source, so the feature is
fundamentally a _local matching_ problem: each recommended track either maps to
a library record (playable) or not (shown, marked, not playable).

## What Changes

- New `recommendations` capability: a "Created for you" section in the
  playlists view listing the user's ListenBrainz created-for-you playlists
  (title, date, track count).
- Expanding a playlist fetches its tracks and matches each one against the
  local library (normalized artist + title, duration sanity check). Matched
  rows are playable in playlist order through the existing playlists playback
  path; unmatched rows render disabled with a "not in library" hint.
- A "save as local playlist" action copies the matched records into a regular
  local playlist, making recommendations available offline.
- Empty and degraded states are first-class: not connected to ListenBrainz;
  connected but zero created-for-you playlists (the fresh-account reality -
  LB generates these weekly once enough listening history exists); fetch
  failure with retry.
- The ListenBrainz username is persisted at connect time and backfilled
  lazily via `GET /1/validate-token` for accounts connected before this
  change.

## Capabilities

### New Capabilities

- `recommendations`: fetching ListenBrainz created-for-you playlists, matching
  their tracks to the local library, playing matched tracks in playlist order,
  and saving a matched set as a local playlist.

## Impact

- New module `src/recommendations/` (API client, matcher, view section).
- `src/scrobbling/settings.ts` gains username persistence (localStorage
  `listenbrainz-username`); the connect flow stores `user_name` from the
  validate-token response.
- The playlists view (`src/playlists/ui.ts`) renders one additional section;
  its playback/save actions reuse `playRecords` and the playlist store
  helpers - no changes to AudioPlayer, radio, lyrics, or visualizer.
- New stylesheet `src/styles/recommendations.css` (scrobbling.css pattern),
  keeping the diff to `main.css` empty.
- No IDB schema change: LB playlists stay unpersisted (they regenerate
  weekly); only the username string is stored.
