import type { PlaylistRecord } from "./store";

/**
 * Session-wide playlist catalog: the single source both the playlists view
 * and the library row actions mutate, so every mutation is immediately
 * visible to the other (persistence goes through the store helpers).
 */
let catalog: PlaylistRecord[] = [];

export function setCatalog(playlists: PlaylistRecord[]): void {
  catalog = playlists;
}

export function getCatalog(): PlaylistRecord[] {
  return catalog;
}

export function findInCatalog(id: string): PlaylistRecord | undefined {
  return catalog.find((playlist) => playlist.id === id);
}
