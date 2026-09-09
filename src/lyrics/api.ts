import type { LibraryRecord } from "../library/store";

const API_URL = "https://lrclib.net/api/get";
// LRCLIB asks browser clients to identify via an alternative header
// (https://lrclib.net/docs): the browser forbids setting User-Agent itself.
const CLIENT_HEADER = "audio-player/2.0 (github.com/yurifa/audio-player)";
/** Cap for a 429 Retry-After wait; one retry, then give up quietly. */
const MAX_RETRY_WAIT_MS = 10_000;

export interface LyricsResult {
  plain: string | null;
  synced: string | null;
}

interface LrclibRecord {
  plainLyrics: string | null;
  syncedLyrics: string | null;
  instrumental: boolean;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Best-match lyrics lookup for a library track. Absence is a normal outcome:
 * 404, instrumental marks, network failures and malformed answers all resolve
 * to null - callers show no panel instead of an error.
 */
export async function fetchLyrics(
  record: Pick<LibraryRecord, "artist" | "title" | "album" | "duration">,
  signal?: AbortSignal,
): Promise<LyricsResult | null> {
  const params = new URLSearchParams({
    artist_name: record.artist,
    track_name: record.title,
    duration: String(Math.round(record.duration)),
  });
  if (record.album) {
    params.set("album_name", record.album);
  }

  const request = (url: string): Promise<Response> =>
    fetch(url, { headers: { "X-User-Agent": CLIENT_HEADER }, signal });

  let response: Response;
  try {
    response = await request(`${API_URL}?${params}`);
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("Retry-After"));
      await wait(
        Number.isFinite(retryAfter) ? Math.min(retryAfter * 1000, MAX_RETRY_WAIT_MS) : 1000,
      );
      response = await request(`${API_URL}?${params}`);
    }
  } catch {
    // network failure or abort: absence is a normal outcome (see docstring)
    return null;
  }
  if (!response.ok) {
    return null;
  }

  let data: LrclibRecord;
  try {
    data = (await response.json()) as LrclibRecord;
  } catch {
    return null;
  }
  const plain = data.plainLyrics?.trim() || null;
  const synced = data.syncedLyrics?.trim() || null;
  if (!plain && !synced) {
    // instrumental or empty record: nothing to display
    return null;
  }
  return { plain, synced };
}
