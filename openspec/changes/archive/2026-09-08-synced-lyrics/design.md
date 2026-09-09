# Design: synced-lyrics

## Context

The library stores `title`, `artist` and `duration` for every track (from
`music-metadata` tags with a filename fallback, see `src/library/import.ts`),
and playback reports position updates (`track:timeupdate`). The shared
IndexedDB database `audio-player` is at version 2 with `tracks` and `stations`
stores (`src/utils/idb.ts`). The visualization area (`index.html`
`.audio_visualize`) currently hosts the canvas and the radio station card;
the radio capability owns the "waveform yields to the card / clears on
takeover" rules. LRCLIB (research: `docs/research/product-and-audio-landscape-directions.md`
section 1.2) is key-free, browser-friendly via the `X-User-Agent` header,
answers `GET /api/v1/lyrics/get` with `plainLyrics`/`syncedLyrics` (LRC lines
`[mm:ss.xx]`), treats 404 as a normal "no lyrics" answer, and rate-limits
with 429 + `Retry-After`.

## Goals / Non-Goals

**Goals:**

- Synced lyrics for library tracks with line highlight following playback and
  click-to-seek.
- Local caching in IndexedDB: offline repeat plays, no repeated API hits.
- Graceful absence: no lyrics is a normal, silent outcome.

**Non-Goals:**

- No lyrics for radio (streams do not expose track metadata consistently).
- No full-library batch scanning - fetch on playback only.
- No lyrics editing, translation, or scrolling animation polish beyond the
  active-line highlight.

## Decisions

1. **LRCLIB get endpoint with duration refinement.** `GET /api/v1/lyrics/get`
   with `artist_name`, `track_name`, `album_name` (when known) and
   `duration`; the ±2s duration match is what keeps wrong-version lyrics out.
   No `/api/search` fallback: a fuzzy match risks showing lyrics for a
   different recording.
2. **LRC parser in `src/lyrics/lrc.ts`.** Parse `[mm:ss.xx]` (and `[mm:ss]`)
   timestamps into sorted `{ time, text }` lines; multiple timestamps on one
   line expand to repeated entries. Plain text renders when `syncedLyrics` is
   absent.
3. **Cache in a new `lyrics` store, database version 3.** Key: lowercase
   `artist + "\n" + title`; value: `{ plain, synced?, fetchedAt }`. The IDB
   helper gains generic store creation; bumping the shared version keeps one
   upgrade path (v2 already did this for `stations`). No TTL - lyrics are
   content, not data.
4. **Panel instead of waveform.** While lyrics are shown the canvas is
   cleared (the visualizer gate extends: `lyricsVisible()` joins
   `!isRadioMode()`), mirroring the radio rule the user approved. The panel
   lives in `.audio_visualize` next to `.station-now`; scrolling keeps the
   active line centered via `scrollIntoView({ block: "center" })` guarded
   against user-scroll fights (only auto-scroll when the active line changes).
5. **Position subscription, not polling.** The existing `track:timeupdate`
   event drives the active-line lookup (binary search over sorted lines).
   Click-to-seek uses the same seek path as the progress bar.
6. **Request discipline.** One in-flight request per track activation
   (`AbortController` on track change), `X-User-Agent: audio-player/2
(github.com/yurifa/audio-player)`, 429 honored with a single `Retry-After`
   wait capped at 10s, 404 and any failure resolve to "no lyrics" - the panel
   just stays hidden.

## Risks / Trade-offs

- **Coverage**: many local tracks (especially non-English) have no LRCLIB
  entry; the empty outcome is silent by design, so the failure mode is
  "nothing happens".
- **Wrong lyrics match**: artist/title tags are user-controlled and messy;
  the duration check reduces but does not eliminate misattribution. Accepted.
- **Waveform loss while lyrics show**: users who like the bars lose them for
  tracks with lyrics. The alternative (split area) was rejected as cluttered;
  the panel only appears when lyrics actually exist.
- **Rate limits**: acceptable at one request per manual track activation;
  batch import never fetches.
