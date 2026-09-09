import { idbGet, idbPut } from "../utils/idb";
import type { LyricsResult } from "./api";

const LYRICS_STORE = "lyrics";

export interface CachedLyrics extends LyricsResult {
  fetchedAt: number;
}

/** Cache key: lyrics belong to a song, not to a file copy. */
export function lyricsKey(artist: string, title: string): string {
  return `${artist}\n${title}`.toLowerCase();
}

export async function loadCachedLyrics(key: string): Promise<CachedLyrics | null> {
  const cached = await idbGet<CachedLyrics>(LYRICS_STORE, key);
  if (!cached || (!cached.plain && !cached.synced)) {
    return null;
  }
  return cached;
}

export async function saveLyrics(key: string, lyrics: LyricsResult): Promise<void> {
  const cached: CachedLyrics = { ...lyrics, fetchedAt: Date.now() };
  await idbPut(LYRICS_STORE, cached, key);
}
