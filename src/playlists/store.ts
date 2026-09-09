import { idbDelete, idbGetAll, idbPut } from "../utils/idb";
import type { LibraryRecord } from "../library/store";

const PLAYLISTS_STORE = "playlists";

export interface PlaylistRecord {
  id: string;
  name: string;
  /** Ordered references to LibraryRecord ids; duplicates are allowed. */
  trackIds: string[];
  createdAt: number;
}

export function makePlaylist(name = "New playlist"): PlaylistRecord {
  return {
    id: crypto.randomUUID(),
    name,
    trackIds: [],
    createdAt: Date.now(),
  };
}

export async function loadPlaylists(): Promise<PlaylistRecord[]> {
  const records = await idbGetAll<PlaylistRecord>(PLAYLISTS_STORE);
  return records.toSorted((a, b) => a.createdAt - b.createdAt);
}

export async function savePlaylist(record: PlaylistRecord): Promise<void> {
  await idbPut(PLAYLISTS_STORE, record);
}

export async function deletePlaylist(id: string): Promise<void> {
  await idbDelete(PLAYLISTS_STORE, id);
}

/**
 * Drops track references that no longer exist in the library: entries pointing
 * to removed tracks disappear on every load (the cleanup path for library
 * deletions). Playlists with dangling references stay playable.
 */
export function hydratePlaylists(
  playlists: PlaylistRecord[],
  libraryTrackIds: ReadonlySet<string>,
): PlaylistRecord[] {
  return playlists.map((playlist) => ({
    ...playlist,
    trackIds: playlist.trackIds.filter((id) => libraryTrackIds.has(id)),
  }));
}

/** Appends a track to a playlist's tail and persists the change. */
export function addTrackToPlaylist(playlist: PlaylistRecord, trackId: string): PlaylistRecord {
  playlist.trackIds.push(trackId);
  void savePlaylist(playlist);
  return playlist;
}

/** Resolves a playlist's track ids to library records in playlist order. */
export function resolvePlaylistRecords(
  playlist: PlaylistRecord,
  records: readonly LibraryRecord[],
): LibraryRecord[] {
  const byId = new Map(records.map((record) => [record.id, record]));
  return playlist.trackIds.flatMap((id) => {
    const record = byId.get(id);
    return record ? [record] : [];
  });
}
