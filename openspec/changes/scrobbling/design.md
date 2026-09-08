# Design: scrobbling

## Context

ListenBrainz offers a free open API: `POST /1/submit-listens` with
`Authorization: Token <user-token>` and JSON bodies (`listen_type:
"playing_now"` / `"single"`), `GET /1/validate-token` for token checks, a
documented rate limit of one request per second. The 2026-09-08 CORS spike
from the app's own origin (`localhost:4173`, the production origin behaves
the same way - CORS is origin-pattern based and api.listenbrainz.org sends
permissive headers) returned: submit-listens 401 (preflight passed, auth
rejected), validate-token 200 `{valid: false}`. Conclusion: pure client
integration is viable, no proxy.

Track metadata (artist, title, duration) already exists on every
`LibraryRecord`. The AudioPlayer forwards media events to listeners
(`track:play`, `track:pause`, `track:timeupdate`, ...), but not `ended` -
the completion rule needs it. Radio is excluded: its metadata is unreliable
and, like the visualizer, it does not flow through Web Audio.

## Goals / Non-Goals

**Goals:**

- Minimal connect flow (paste token -> validate -> connected), status at a
  glance, hard off-switch.
- Playing-now + completed listens with the half-duration/240s rule.
- Never lose a completed listen: store-and-forward queue, ordered, retrying.

**Non-Goals:**

- No radio scrobbling in v1 (unreliable station metadata).
- No Last.fm support (separate auth and rules; possible later sibling of the
  same queue).
- No editing of track metadata before submitting, no historical import.
- No feedback UI beyond connection status and a queue-count hint.

## Decisions

1. **Token in localStorage, queue in IndexedDB.** The token is a small
   secret-ish string with no query needs - localStorage key
   `listenbrainz-token`. The retry queue holds structured records (metadata
   + submitted-at) that must survive reloads and iterate in order - IDB
   store `listens`, database version 6 (auto-increment key to preserve
   insertion order).
2. **Completion rule on player events, not timers.** The module tracks the
   playing record and accumulates nothing: on `track:ended` and on
   `track:play` (of the NEXT track, i.e. a switch) it inspects the audio
   element's position through the player: `position >= duration / 2 ||
   position >= 240` -> queue a single listen. This avoids drift-prone
   time-accumulation and works for playlists and queue insertions alike.
   AudioPlayer gains `ended` in `MEDIA_EVENTS_FORWARDED` (additive, no
   behavior change).
3. **One submission pipeline.** Playing-now and queued completed listens go
   through the same serializer: at most one in-flight request, minimum
   1.1s spacing between request starts, `Retry-After`/429 honored by
   re-queueing. Playing-now failures are dropped (transient by nature);
   completed-listen failures stay queued.
4. **Retry triggers:** browser `online` event, every successful submit
   (drain one per spacing tick), and each app boot (after connectivity
   check). Draining never runs concurrently.
5. **UI: control-bar button + popup, equalizer-popup pattern.** A small
   button in `.player-controls` opens a popup: token input, Connect
   (validates via API), status line (connected / rejected / disabled),
   enable toggle. The button shows a subtle active state when scrobbling is
   enabled. No new page areas - the control bar is the established home of
   popups (equalizer).
6. **Radio isolation.** The tracker subscribes to library-source
   transitions only (`currentLibraryRecord()` based, same helper lyrics and
   media-session use); radio state changes reset the pending completion
   without queueing.

## Risks / Trade-offs

- **Token in localStorage** is readable by any script on the origin - the
  app has no third-party scripts, acceptable for a personal player; a
  token is revocable from the ListenBrainz profile at any time.
- **Server-side clock differences**: submitted_at uses the local clock;
  ListenBrainz accepts `listened_at` as given - minor skew is inherent to
  clients without server time sync.
- **API contract drift**: the client pins no version; endpoints used
  (`/1/submit-listens`, `/1/validate-token`) are stable for years.
- **50% rule vs very long tracks** (dj mixes): 240s floor kicks in first -
  intended, matches Last.fm conventions.
