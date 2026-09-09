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
import { engageSource, onModeChange, registerModeSearch } from "../modes";

const FUSE_OPTIONS = {
  keys: ["title", "artist", "album"],
  threshold: 0.4,
  ignoreLocation: true,
};
let player: AudioPlayer;
let librarySearch: HTMLInputElement;
let libraryEmpty: HTMLDivElement;

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
}

type LibraryViewListener = () => void;
const viewListeners = new Set<LibraryViewListener>();

/** The view change fan-out; also owns the vanilla empty hint. */
function notifyView(): void {
  if (libraryEmpty) {
    libraryEmpty.hidden = records.length > 0;
  }
  for (const listener of viewListeners) {
    listener();
  }
}

/** Subscribes the rows island to library changes. */
export function subscribeLibraryView(listener: LibraryViewListener): () => void {
  viewListeners.add(listener);
  return () => viewListeners.delete(listener);
}

/** A consistent snapshot of the visible rows plus playback/queue state. */
export function libraryViewSnapshot(): LibraryViewSnapshot {
  if (!player || !librarySearch) {
    // The island mounts before initLibrary wires the element references.
    return { rows: [], playingId: null, playing: false, queuedIds: [] };
  }
  const query = librarySearch.value.trim();
  const visible = query ? fuse.search(query).map((result) => result.item) : [...records];
  const playing = recordAt(player.currentTrackIndex);
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
    playing: player.isPlaying,
    queuedIds: [...pendingQueueIds()],
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

/** Signals the rows island to re-render when radio hands the list back. */
export function rerenderLibraryList(): void {
  notifyView();
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

async function addFiles(files: Iterable<File>): Promise<void> {
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

function initImportControls(): void {
  const addFilesBtn = document.querySelector<HTMLButtonElement>(".library__add")!;
  const addDirBtn = document.querySelector<HTMLButtonElement>(".library__add-dir")!;
  const fileInput = document.querySelector<HTMLInputElement>(".library__file-input")!;

  addFilesBtn.addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", () => {
    if (fileInput.files) {
      void addFiles([...fileInput.files]);
    }
    fileInput.value = "";
  });

  if (window.showDirectoryPicker) {
    addDirBtn.hidden = false;
    addDirBtn.addEventListener("click", async () => {
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
      await addFiles(files);
    });
  }
}

function initLibraryModeControls(): void {
  const addButtons = document.querySelectorAll<HTMLButtonElement>(
    ".library__add, .library__add-dir",
  );
  registerModeSearch("library", () => {
    notifyView();
  });
  onModeChange(({ mode: next }) => {
    for (const button of addButtons) {
      button.hidden = next !== "library";
    }
    if (next === "library") {
      librarySearch.placeholder = "Search library";
    }
    // every mode flip hands the list region over: the rows island must
    // mount or unmount its rows in the same tick as the vanilla writers
    notifyView();
  });
}

/** Wires the library UI into the page and restores the persisted library; rows map to playlist indices. */
export async function initLibrary(audioPlayer: AudioPlayer): Promise<void> {
  player = audioPlayer;
  librarySearch = document.querySelector<HTMLInputElement>(".library__search")!;
  libraryEmpty = document.querySelector<HTMLDivElement>(".library__empty")!;
  initLibraryModeControls();

  initSource({
    player: audioPlayer,
    records,
    toSource,
    onOrderApplied: notifyView,
  });

  initDropzone((files) => void addFiles(files));
  initImportControls();

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

/**
 * Full record of the player's current index (the lyrics cache keys on
 * artist/title and matches LRCLIB by duration). Null outside the library.
 */
export function currentLibraryRecord(): LibraryRecord | null {
  return recordAt(player.currentTrackIndex);
}
