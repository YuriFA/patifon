import { signal } from "@preact/signals";
import type { MediaSessionMetadata } from "../media-session";
import Fuse from "fuse.js";
import type AudioPlayer from "../audio-player";
import { importFiles } from "./import";
import { loadTracks, saveTrack, type LibraryRecord } from "./store";
import { pendingQueueIds, prunePlayed } from "../playlists/queue";
import {
  initSource,
  recordAt,
  playbackOrder,
  isPlayingLibrary,
  switchToLibrarySource,
  markLibrarySource,
} from "./source";
import { initDropzone } from "./dropzone";
import { formatDuration } from "../utils";
import { engageSource, registerModeSearch, searchQuery } from "../modes";

const FUSE_OPTIONS = {
  keys: ["title", "artist", "album"],
  threshold: 0.4,
  ignoreLocation: true,
};
let player: AudioPlayer;

let fuse = new Fuse<LibraryRecord>([], FUSE_OPTIONS);

const records: LibraryRecord[] = [];
const objectUrls = new Map<string, string>();
const artworkUrls = new Map<string, string>();

function toSource(record: LibraryRecord): { src: string; name: string } {
  return { src: urlFor(record), name: record.title };
}

function urlFor(record: LibraryRecord): string {
  let url = objectUrls.get(record.id);
  if (!url) {
    url = URL.createObjectURL(record.file);
    objectUrls.set(record.id, url);
  }
  return url;
}

function artworkUrlFor(record: LibraryRecord): string | null {
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

export interface LibraryRowView {
  record: LibraryRecord;
  label: string;
  title: string;
  duration: string;
  artworkUrl: string | null;
}

export interface LibraryViewSnapshot {
  rows: LibraryRowView[];
  playingId: string | null;
  playing: boolean;
  queuedIds: string[];
  /** True when the list has no rows and the hint line shows. */
  empty: boolean;
  /** Hint line text (shown only while empty). */
  emptyText: string;
}

/** The library view island renders the rows from this snapshot. */
export const libraryRowsView = signal<LibraryViewSnapshot>(libraryViewSnapshot());

/** The view change fan-out: recompute the snapshot into the signal. */
function notifyView(): void {
  libraryRowsView.value = libraryViewSnapshot();
}

/** A consistent snapshot of the visible rows plus playback/queue state. */
export function libraryViewSnapshot(): LibraryViewSnapshot {
  // The rows island mounts before initLibrary resolves: with no element
  // refs there is no query and no playback, and records is still empty -
  // the snapshot is empty by construction until notifyView re-renders.
  const query = searchQuery.value.trim();
  const visible = player && query ? fuse.search(query).map((result) => result.item) : [...records];
  const playing = player ? recordAt(player.currentTrackIndex) : null;
  const rows = visible.map((record) => {
    const label = record.artist ? `${record.artist} - ${record.title}` : record.title;
    return {
      record,
      label,
      title: record.album ? `${record.album} - ${label}` : label,
      duration: formatDuration(record.duration),
      artworkUrl: record.artwork ? artworkUrlFor(record) : null,
    };
  });
  return {
    rows,
    playingId: playing?.id ?? null,
    playing: player?.isPlaying ?? false,
    queuedIds: [...pendingQueueIds()],
    empty: rows.length === 0,
    emptyText: 'Drop audio files anywhere, or use "Add files"',
  };
}

/** Row activation from the island: identical to the old row click. */
export function activateLibraryRecord(record: LibraryRecord): void {
  const index = records.findIndex((r) => r.id === record.id);
  if (index === -1) {
    return;
  }
  engageSource("library");
  // A playlist owns the player order until a library row takes it back.
  if (!isPlayingLibrary()) {
    switchToLibrarySource();
  }
  if (player.isPlaying) {
    player.stop();
  }
  void player.play(index);
}

/** Library records in library order, for views built on top of them. */
export function libraryRecords(): readonly LibraryRecord[] {
  return records;
}

function rebuildPlaylist(): void {
  // revoke object URLs of records that are no longer in the library
  const liveIds = new Set(records.map((r) => r.id));
  for (const [id, url] of objectUrls) {
    if (!liveIds.has(id)) {
      URL.revokeObjectURL(url);
      objectUrls.delete(id);
    }
  }
  // a library rebuild replaces whatever source owned the player order
  markLibrarySource();
  player.replaceTracks(records.map((record) => ({ src: urlFor(record), name: record.title })));
  fuse = new Fuse(records, FUSE_OPTIONS);
  notifyView();
}

export async function importAudioFiles(files: Iterable<File>): Promise<void> {
  const imported = await importFiles(files);
  if (imported.length === 0) {
    return;
  }
  for (const record of imported) {
    await saveTrack(record);
    records.push(record);
  }
  rebuildPlaylist();
}

/** Reads a picked directory into the library (the sidebar's Add folder). */
export async function importDirectory(): Promise<void> {
  const directory = await window.showDirectoryPicker?.({ mode: "read" });
  if (!directory) {
    return;
  }
  const files: File[] = [];
  for await (const entry of directory.values()) {
    if (entry.kind === "file") {
      // lib.dom does not narrow FileSystemHandle by kind
      const fileHandle = entry as FileSystemFileHandle;
      files.push(await fileHandle.getFile());
    }
  }
  await importAudioFiles(files);
}

function initLibraryModeControls(): void {
  registerModeSearch("library", () => {
    notifyView();
  });
}

/** Wires the library UI into the page and restores the persisted library; rows map to playlist indices. */
export async function initLibrary(audioPlayer: AudioPlayer): Promise<void> {
  player = audioPlayer;
  initLibraryModeControls();

  initSource({
    player: audioPlayer,
    records,
    toSource,
    onOrderApplied: notifyView,
  });

  initDropzone((files) => void importAudioFiles(files));

  // Highlight follows actual playback, not just row clicks: media events fire
  // for every path that starts or stops audio (clicks, OS transport, track end).
  player.on("track:play", () => {
    // a queued track reached the current position: retire its badge
    if (prunePlayed(playbackOrder(), player.currentTrackIndex)) {
      notifyView();
    }
    notifyView();
  });
  player.on("track:pause", () => {
    notifyView();
  });

  // Bootstrap: restore the persisted library
  records.push(...(await loadTracks()));
  rebuildPlaylist();
}

/**
 * Metadata of the currently playing library track for OS media surfaces.
 * Returns null when the playing index has no library record (the session
 * then keeps its previous metadata).
 */
export function libraryMetadata(): MediaSessionMetadata | null {
  const record = recordAt(player.currentTrackIndex);
  if (!record) {
    return null;
  }
  return {
    title: record.title,
    artist: record.artist,
    album: record.album,
    artworkUrl: artworkUrlFor(record),
  };
}

export function libraryArtworkUrl(record: LibraryRecord): string | null {
  return artworkUrlFor(record);
}
