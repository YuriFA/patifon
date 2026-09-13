import type { LibraryRecord } from "./store";

const SEARCH_URL = "https://itunes.apple.com/search";

interface ItunesResult {
  artistName?: string;
  artworkUrl100?: string;
}

/**
 * Session-scoped enrichment state: one promise per searched
 * (artist, album-or-title) pair. The shared promise deduplicates concurrent
 * triggers, and a resolved null doubles as the session's negative cache -
 * a failed lookup is never retried for the same pair this session.
 */
const pairRequests = new Map<string, Promise<Blob | null>>();

/** Cache key: a cover belongs to the searched pair, not to a single track. */
function pairKey(record: Pick<LibraryRecord, "artist" | "album" | "title">): string {
  return `${record.artist}\n${record.album ?? record.title}`.toLowerCase();
}

function normalize(value: string): string {
  return value.toLowerCase().replaceAll(/\s+/gu, " ").trim();
}

/** Catalog sanity check: the result's artist must contain the track's. */
function artistMatches(result: ItunesResult, artist: string): boolean {
  return normalize(result.artistName ?? "").includes(normalize(artist));
}

async function fetchCatalogArtworkUrl(record: LibraryRecord): Promise<string | null> {
  // An album-scoped term is the precise query; without an album tag the
  // track title carries the release context and the song entity answers.
  const term = record.album
    ? `${record.artist} ${record.album}`
    : `${record.artist} ${record.title}`;
  const params = new URLSearchParams({
    term,
    entity: record.album ? "album" : "song",
    limit: "3",
  });
  try {
    const response = await fetch(`${SEARCH_URL}?${params}`);
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as { results?: ItunesResult[] };
    for (const result of data.results ?? []) {
      if (result.artworkUrl100 && artistMatches(result, record.artist)) {
        return result.artworkUrl100;
      }
    }
    return null;
  } catch {
    // network failure: absence is a normal outcome for enrichment
    return null;
  }
}

async function fetchArtworkBlob(artworkUrl100: string): Promise<Blob | null> {
  // The catalog serves real derivatives per size: upsampling the URL
  // returns the full 600x600 raster, not a stretched thumbnail.
  const url = artworkUrl100.replace("100x100", "600x600");
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    return await response.blob();
  } catch {
    return null;
  }
}

/** Queries the iTunes Search catalog for the record's cover. */
export async function fetchExternalArtwork(record: LibraryRecord): Promise<Blob | null> {
  const artworkUrl = await fetchCatalogArtworkUrl(record);
  return artworkUrl ? fetchArtworkBlob(artworkUrl) : null;
}

/**
 * Enrichment entry point: resolves to the album cover, or null when the
 * catalog has no match. One request per searched pair per session; callers
 * treat null as "keep the placeholder, stay quiet".
 */
export function enrichArtwork(record: LibraryRecord): Promise<Blob | null> {
  const key = pairKey(record);
  let request = pairRequests.get(key);
  if (!request) {
    request = fetchExternalArtwork(record);
    pairRequests.set(key, request);
  }
  return request;
}
