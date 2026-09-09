import type { MediaSessionMetadata } from "../media-session";
import Fuse from "fuse.js";
import type AudioPlayer from "../audio-player";
import { importFiles } from "./import";
import { loadTracks, saveTrack, type LibraryRecord } from "./store";
import { createAddToPlaylistButton } from "../playlists/picker";
import { pendingQueueIds, prunePlayed } from "../playlists/queue";
import {
  initSource,
  recordAt,
  playbackOrder,
  isPlayingLibrary,
  switchToLibrarySource,
  markLibrarySource,
} from "./source";
import { createPlayNextButton } from "./row-actions";
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
let libraryList: HTMLUListElement;
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

function updateHighlight(): void {
  const playing = recordAt(player.currentTrackIndex);
  const queued = new Set(pendingQueueIds());
  libraryList.querySelectorAll<HTMLElement>(".library__row").forEach((row) => {
    row.classList.toggle(
      "library__row_playing",
      player.isPlaying && playing !== null && row.dataset.id === playing.id,
    );
    row.classList.toggle("library__row_queued", queued.has(row.dataset.id ?? ""));
  });
}

function playRecord(record: LibraryRecord): void {
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
  updateHighlight();
}

function buildRow(record: LibraryRecord): HTMLLIElement {
  const row = document.createElement("li");
  row.className = "library__row";
  row.dataset.id = record.id;

  if (record.artwork) {
    const thumb = document.createElement("img");
    thumb.className = "library__thumb";
    thumb.src = artworkUrlFor(record) ?? "";
    thumb.alt = "";
    row.append(thumb);
  } else {
    const placeholder = document.createElement("span");
    placeholder.className = "library__thumb library__thumb_empty";
    placeholder.textContent = "\u266A";
    row.append(placeholder);
  }

  const meta = document.createElement("div");
  meta.className = "library__meta";
  meta.textContent = record.artist ? `${record.artist} - ${record.title}` : record.title;
  meta.title = record.album ? `${record.album} - ${meta.textContent}` : meta.textContent;
  row.append(meta);

  const duration = document.createElement("span");
  duration.className = "library__duration";
  duration.textContent = formatDuration(record.duration);
  row.append(duration);

  row.append(createAddToPlaylistButton(record.id));
  row.append(createPlayNextButton(record));

  row.addEventListener("click", () => {
    playRecord(record);
  });

  return row;
}

function renderList(): void {
  const query = librarySearch.value.trim();
  const visible = query ? fuse.search(query).map((result) => result.item) : [...records];

  libraryList.replaceChildren(...visible.map((record) => buildRow(record)));
  libraryEmpty.hidden = records.length > 0;
  libraryEmpty.textContent = 'Drop audio files anywhere, or use "Add files"';
  updateHighlight();
}

/** Library records in library order, for views built on top of them. */
export function libraryRecords(): readonly LibraryRecord[] {
  return records;
}

/** Re-renders the library list when radio mode hands the list back. */
export function rerenderLibraryList(): void {
  renderList();
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
  renderList();
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

/** Library affordances per mode: import buttons exist only in the library view. */
function initLibraryModeControls(): void {
  const addButtons = document.querySelectorAll<HTMLButtonElement>(
    ".library__add, .library__add-dir",
  );
  registerModeSearch("library", () => {
    renderList();
  });
  onModeChange(({ mode: next }) => {
    for (const button of addButtons) {
      button.hidden = next !== "library";
    }
    if (next === "library") {
      librarySearch.placeholder = "Search library";
      renderList();
    }
  });
}

/** Wires the library UI into the page and restores the persisted library; rows map to playlist indices. */
export async function initLibrary(audioPlayer: AudioPlayer): Promise<void> {
  player = audioPlayer;
  librarySearch = document.querySelector<HTMLInputElement>(".library__search")!;
  libraryList = document.querySelector<HTMLUListElement>(".library__list")!;
  libraryEmpty = document.querySelector<HTMLDivElement>(".library__empty")!;
  initLibraryModeControls();

  initSource({
    player: audioPlayer,
    records,
    toSource,
    onOrderApplied: renderList,
  });

  initDropzone((files) => void addFiles(files));
  initImportControls();

  // Highlight follows actual playback, not just row clicks: media events fire
  // for every path that starts or stops audio (clicks, OS transport, track end).
  player.on("track:play", () => {
    // a queued track reached the current position: retire its badge
    if (prunePlayed(playbackOrder(), player.currentTrackIndex)) {
      renderList();
    }
    updateHighlight();
  });
  player.on("track:pause", () => {
    updateHighlight();
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
