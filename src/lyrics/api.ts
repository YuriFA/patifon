import type { LibraryRecord } from "../library/store";

const GET_URL = "https://lrclib.net/api/get";
const SEARCH_URL = "https://lrclib.net/api/search";
const OVH_URL = "https://api.lyrics.ovh/v1";
// LRCLIB asks browser clients to identify via an alternative header
// (https://lrclib.net/docs): the browser forbids setting User-Agent itself.
const CLIENT_HEADER = "audio-player/2.0 (github.com/yurifa/audio-player)";
/** Cap for a 429 Retry-After wait; one retry, then give up quietly. */
const MAX_RETRY_WAIT_MS = 10_000;
/** Candidate duration scoring: strict window, then the soft cut-off. */
const SOFT_DURATION_GAP_S = 10;

export interface LyricsResult {
  plain: string | null;
  synced: string | null;
}

interface LrclibRecord {
  plainLyrics: string | null;
  syncedLyrics: string | null;
  instrumental: boolean;
  albumName?: string;
  duration?: number;
}

/** Outcome of one LRCLIB leg: a record, a clean miss, or rate throttling. */
type LrclibLookup = { found: LrclibRecord } | { absent: true } | { throttled: true };

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizeForCompare(value: string): string {
  return value.toLowerCase().replaceAll(/\s+/gu, " ").trim();
}

function hasLyrics(record: LrclibRecord): boolean {
  return Boolean(record.plainLyrics?.trim() || record.syncedLyrics?.trim());
}

function toResult(record: LrclibRecord): LyricsResult | null {
  const plain = record.plainLyrics?.trim() || null;
  const synced = record.syncedLyrics?.trim() || null;
  if (!plain && !synced) {
    return null;
  }
  return { plain, synced };
}

function requestJson(url: string, signal?: AbortSignal): Promise<Response> {
  return fetch(url, { headers: { "X-User-Agent": CLIENT_HEADER }, signal });
}

/**
 * Exact-match lookup. Absence is a normal outcome: 404, network failures
 * and malformed answers all resolve to a miss - callers fall through the
 * chain instead of showing an error. Only a twice-seen 429 reports
 * throttling so the chain can stop hammering the server.
 */
async function lookupExact(
  record: Pick<LibraryRecord, "artist" | "title" | "album" | "duration">,
  signal?: AbortSignal,
): Promise<LrclibLookup> {
  const params = new URLSearchParams({
    artist_name: record.artist,
    track_name: record.title,
    duration: String(Math.round(record.duration)),
  });
  if (record.album) {
    params.set("album_name", record.album);
  }
  const url = `${GET_URL}?${params}`;
  try {
    let response = await requestJson(url, signal);
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("Retry-After"));
      await wait(
        Number.isFinite(retryAfter) ? Math.min(retryAfter * 1000, MAX_RETRY_WAIT_MS) : 1000,
      );
      response = await requestJson(url, signal);
      if (response.status === 429) {
        return { throttled: true };
      }
    }
    return response.ok ? parseLrclib(await response.json()) : { absent: true };
  } catch {
    // network failure or abort: absence is a normal outcome (see docstring)
    return { absent: true };
  }
}

function parseLrclib(data: unknown): LrclibLookup {
  const record = data as LrclibRecord;
  if (typeof record !== "object" || record === null) {
    return { absent: true };
  }
  return hasLyrics(record) ? { found: record } : { absent: true };
}

const hasSyncedLyrics = (candidate: LrclibRecord): number =>
  Number(Boolean(candidate.syncedLyrics?.trim()));

/**
 * Picks the best search candidate: server ordering is relevance-guessed and
 * puts bootlegs first, so the client ranks on what the tags actually know.
 * Album equality wins, then duration proximity (soft cut-off beyond which a
 * candidate is a different take), then the presence of synced lyrics.
 */
function pickBestCandidate(
  candidates: LrclibRecord[],
  record: Pick<LibraryRecord, "artist" | "title" | "album" | "duration">,
): LrclibRecord | null {
  const album = record.album ? normalizeForCompare(record.album) : null;
  const albumHit = (candidate: LrclibRecord): number =>
    album && candidate.albumName ? Number(normalizeForCompare(candidate.albumName) === album) : 0;
  const durationGap = (candidate: LrclibRecord): number =>
    record.duration > 0 && candidate.duration !== undefined
      ? Math.abs(candidate.duration - record.duration)
      : SOFT_DURATION_GAP_S + 1;

  const usable = candidates.filter(
    (candidate) =>
      !candidate.instrumental &&
      hasLyrics(candidate) &&
      durationGap(candidate) <= SOFT_DURATION_GAP_S,
  );
  if (usable.length === 0) {
    return null;
  }
  return usable.toSorted(
    (a, b) =>
      albumHit(b) - albumHit(a) ||
      durationGap(a) - durationGap(b) ||
      hasSyncedLyrics(b) - hasSyncedLyrics(a),
  )[0];
}

/** Fuzzy search over the same catalog: the cheapest recovery for an exact miss. */
async function lookupSearch(
  record: Pick<LibraryRecord, "artist" | "title" | "album" | "duration">,
  signal?: AbortSignal,
): Promise<LrclibLookup> {
  const params = new URLSearchParams({
    artist_name: record.artist,
    track_name: record.title,
  });
  if (record.album) {
    params.set("album_name", record.album);
  }
  try {
    const response = await requestJson(`${SEARCH_URL}?${params}`, signal);
    // the exact leg already honored one 429 retry: the server is throttling
    if (response.status === 429 || !response.ok) {
      return response.status === 429 ? { throttled: true } : { absent: true };
    }
    const data = (await response.json()) as LrclibRecord[];
    if (!Array.isArray(data)) {
      return { absent: true };
    }
    const best = pickBestCandidate(data, record);
    return best ? { found: best } : { absent: true };
  } catch {
    return { absent: true };
  }
}

/** Strips release qualifiers the external matcher would choke on. */
function stripQualifiers(value: string): string {
  let out = value.trim();
  for (;;) {
    const next = out.replace(/\s*[([][^)\]]*[)\]]\s*$/u, "").trim();
    if (next === out) {
      break;
    }
    out = next;
  }
  return out.replace(/\s+-\s+live\b.*$/iu, "").trim();
}

/** Last resort: plain-text-only lyrics keyed by bare artist and title. */
async function fetchExternal(
  record: Pick<LibraryRecord, "artist" | "title">,
  signal?: AbortSignal,
): Promise<LyricsResult | null> {
  const artist = stripQualifiers(record.artist);
  const title = stripQualifiers(record.title);
  if (!artist || !title) {
    return null;
  }
  const url = `${OVH_URL}/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
  try {
    const response = await fetch(url, { signal });
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as { lyrics?: string };
    const plain = data.lyrics?.trim() || null;
    return plain ? { plain, synced: null } : null;
  } catch {
    return null;
  }
}

/**
 * Best-match lyrics for a library track through the fallback chain:
 * LRCLIB exact match, then LRCLIB search with client-side ranking (keeps
 * the synced-lyrics chance), then the external plain-text catalog.
 * Absence is a normal outcome: every exhausted chain resolves to null -
 * callers show no panel instead of an error.
 */
export async function fetchLyrics(
  record: Pick<LibraryRecord, "artist" | "title" | "album" | "duration">,
  signal?: AbortSignal,
): Promise<LyricsResult | null> {
  const exact = await lookupExact(record, signal);
  if ("found" in exact) {
    return toResult(exact.found);
  }
  if (!("throttled" in exact)) {
    const found = await lookupSearch(record, signal);
    if ("found" in found) {
      return toResult(found.found);
    }
    if (!("throttled" in found)) {
      return fetchExternal(record, signal);
    }
  }
  return null;
}
