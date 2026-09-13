import type { LibraryRecord } from "./store";

/**
 * Session cache of artwork object URLs: one blob URL per record, shared by
 * every surface that renders covers (rows, playlists, now-playing data,
 * the vinyl label).
 */
const artworkUrls = new Map<string, string>();

/** The record's cover as an object URL, or null when it has no artwork. */
export function artworkUrlFor(record: LibraryRecord): string | null {
  if (!record.artwork) {
    return null;
  }
  let url = artworkUrls.get(record.id);
  if (!url) {
    url = URL.createObjectURL(record.artwork);
    artworkUrls.set(record.id, url);
  }
  return url;
}
