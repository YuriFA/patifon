import { isRadioMode } from "../radio/ui";
import type { MediaSessionMetadata } from "../media-session";
import Fuse from "fuse.js";
import type AudioPlayer from "../audio-player";
import { importFiles } from "./import";
import { loadTracks, saveTrack, type LibraryRecord } from "./store";

const FUSE_OPTIONS = {
  keys: ["title", "artist", "album"],
  threshold: 0.4,
  ignoreLocation: true,
};
let player: AudioPlayer;
let librarySearch: HTMLInputElement;
let libraryList: HTMLUListElement;
let libraryEmpty: HTMLDivElement;
/** Called before a library track starts: main.ts stops radio playback there. */
let onTrackActivate: () => void = () => {};
let fuse = new Fuse<LibraryRecord>([], FUSE_OPTIONS);

const records: LibraryRecord[] = [];
const objectUrls = new Map<string, string>();
const artworkUrls = new Map<string, string>();

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

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "-:--";
  }
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function updateHighlight(): void {
  const index = player.currentTrackIndex;
  libraryList.querySelectorAll(".library__row").forEach((row, i) => {
    row.classList.toggle("library__row_playing", i === index && player.isPlaying);
  });
}

function playRecord(record: LibraryRecord): void {
  const index = records.findIndex((r) => r.id === record.id);
  if (index === -1) {
    return;
  }
  onTrackActivate();
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

function initDropzone(): void {
  let dragDepth = 0;
  window.addEventListener("dragenter", (event) => {
    event.preventDefault();
    dragDepth += 1;
    document.body.classList.add("drop-hover");
  });
  window.addEventListener("dragleave", () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) {
      document.body.classList.remove("drop-hover");
    }
  });
  window.addEventListener("dragover", (event) => {
    event.preventDefault();
  });
  window.addEventListener("drop", (event) => {
    event.preventDefault();
    dragDepth = 0;
    document.body.classList.remove("drop-hover");
    if (event.dataTransfer) {
      void addFiles([...event.dataTransfer.files]);
    }
  });
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

/**
 * Wires the library UI (import, list, search) into the page and restores the
 * persisted library. The library doubles as the player's playlist: rows map
 * to playlist indices.
 */
export async function initLibrary(
  audioPlayer: AudioPlayer,
  trackActivate: () => void,
): Promise<void> {
  player = audioPlayer;
  onTrackActivate = trackActivate;
  librarySearch = document.querySelector<HTMLInputElement>(".library__search")!;
  libraryList = document.querySelector<HTMLUListElement>(".library__list")!;
  libraryEmpty = document.querySelector<HTMLDivElement>(".library__empty")!;

  const search = document.querySelector<HTMLInputElement>(".library__search");
  search?.addEventListener("input", () => {
    // In radio mode the radio module owns the search box and the list
    if (!isRadioMode()) {
      renderList();
    }
  });

  initImportControls();
  initDropzone();

  // Highlight follows actual playback, not just row clicks: media events fire
  // for every path that starts or stops audio (clicks, OS transport, track end).
  player.on("track:play", () => {
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
  const record = records[player.currentTrackIndex];
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

/**
 * Full record of the player's current index (the lyrics cache keys on
 * artist/title and matches LRCLIB by duration). Null outside the library.
 */
export function currentLibraryRecord(): LibraryRecord | null {
  return records[player.currentTrackIndex] ?? null;
}
