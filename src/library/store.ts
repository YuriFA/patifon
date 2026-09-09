import { idbGetAll, idbPut } from "../utils/idb";

const TRACKS_STORE = "tracks";

export interface LibraryRecord {
  id: string;
  fileName: string;
  title: string;
  artist: string;
  album: string | null;
  /** duration in seconds; 0 when unknown */
  duration: number;
  addedAt: number;
  file: Blob;
  artwork: Blob | null;
}

export async function loadTracks(): Promise<LibraryRecord[]> {
  const records = await idbGetAll<LibraryRecord>(TRACKS_STORE);
  // insertion order by import time
  return records.toSorted((a, b) => a.addedAt - b.addedAt);
}

export async function saveTrack(record: LibraryRecord): Promise<void> {
  await idbPut(TRACKS_STORE, record);
}
