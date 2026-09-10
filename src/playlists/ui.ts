import type AudioPlayer from "../audio-player";
import {
  deletePlaylist,
  hydratePlaylists,
  loadPlaylists,
  makePlaylist,
  resolvePlaylistRecords,
  savePlaylist,
  type PlaylistRecord,
} from "./store";
import { getCatalog, setCatalog, findInCatalog } from "./catalog";
import { getMode, onModeChange, registerModeSearch } from "../modes";
import type { LibraryRecord } from "../library/store";
import { recordAt } from "../library/source";
import { signal } from "@preact/signals";
import { hideRecommendations, showRecommendations } from "../recommendations/ui";

export interface PlaylistsUiDeps {
  search: HTMLInputElement;
  emptyHint: HTMLDivElement;
  newButton: HTMLButtonElement;
  backButton: HTMLButtonElement;
  modeButton: HTMLButtonElement;
  player: AudioPlayer;
  /** Current library records, to resolve playlist track references. */
  records(): readonly LibraryRecord[];
  /** Artwork object URL for a record, or null. */
  artworkUrl(record: LibraryRecord): string | null;
}

let deps: PlaylistsUiDeps;
let openId: string | null = null;

export interface PlaylistsIndexRow {
  id: string;
  name: string;
  trackCount: number;
}

export interface PlaylistsTrackRow {
  id: string;
  artist: string;
  title: string;
  position: number;
  length: number;
  duration: number;
  artwork: string | null;
  playing: boolean;
}

export type PlaylistsRowsView =
  | { kind: "index"; rows: PlaylistsIndexRow[] }
  | { kind: "tracks"; rows: PlaylistsTrackRow[] };

/** The playlists island renders the index/track rows from this snapshot. */
export const playlistsRowsView = signal<PlaylistsRowsView>({ kind: "index", rows: [] });

export async function initPlaylists(deps_: PlaylistsUiDeps): Promise<void> {
  deps = deps_;
  const stored = await loadPlaylists();
  const trackIds = new Set(deps.records().map((record) => record.id));
  setCatalog(hydratePlaylists(stored, trackIds));

  deps.newButton.addEventListener("click", () => {
    const playlist = makePlaylist();
    setCatalog([...getCatalog(), playlist]);
    void savePlaylist(playlist);
    render();
  });
  deps.backButton.addEventListener("click", () => {
    openId = null;
    deps.backButton.hidden = true;
    render();
  });
  registerModeSearch("playlists", () => {
    render();
  });
  onModeChange(({ mode: next, previous }) => {
    if (next === "playlists") {
      enterPlaylistsView();
    } else if (previous === "playlists") {
      exitPlaylistsView();
    }
  });
  // the playing highlight only exists in the open playlist's track view
  const onPlayState = () => {
    if (openId !== null) {
      render();
    }
  };
  deps.player.on("track:play", onPlayState);
  deps.player.on("track:pause", onPlayState);
}

function enterPlaylistsView(): void {
  deps.modeButton.classList.add("library__mode_active");
  deps.search.placeholder = "Search playlists";
  deps.newButton.hidden = false;
  deps.backButton.hidden = true;
  render();
  showRecommendations();
}

function exitPlaylistsView(): void {
  deps.modeButton.classList.remove("library__mode_active");
  openId = null;
  deps.newButton.hidden = true;
  deps.backButton.hidden = true;
  hideRecommendations();
}

function renderIndex(): void {
  showRecommendations();
  const query = deps.search.value.trim().toLowerCase();
  const catalog = getCatalog();
  const visible = query
    ? catalog.filter((playlist) => playlist.name.toLowerCase().includes(query))
    : catalog;
  const rows: PlaylistsIndexRow[] = visible.map((playlist) => ({
    id: playlist.id,
    name: playlist.name,
    trackCount: playlist.trackIds.length,
  }));
  deps.emptyHint.hidden = rows.length > 0;
  deps.emptyHint.textContent = query ? "Nothing found" : "No playlists yet - create one";
  playlistsRowsView.value = { kind: "index", rows };
}

function renderTracks(): void {
  const playlist = findInCatalog(openId ?? "");
  if (!playlist) {
    openId = null;
    renderIndex();
    return;
  }
  const query = deps.search.value.trim().toLowerCase();
  const playing = recordAt(deps.player.currentTrackIndex);
  const playingId = deps.player.isPlaying && playing !== null ? playing.id : null;
  const resolved = resolvePlaylistRecords(playlist, deps.records());
  const rows: PlaylistsTrackRow[] = resolved
    .map((record, position) => ({ record, position }))
    .filter(
      ({ record }) =>
        !query ||
        record.title.toLowerCase().includes(query) ||
        record.artist.toLowerCase().includes(query),
    )
    .map(({ record, position }) => ({
      id: record.id,
      artist: record.artist,
      title: record.title,
      position,
      length: resolved.length,
      duration: record.duration,
      artwork: deps.artworkUrl(record),
      playing: playingId === record.id,
    }));
  deps.emptyHint.hidden = rows.length > 0;
  deps.emptyHint.textContent = query
    ? "Nothing found"
    : "Playlist is empty - add tracks from the library";
  playlistsRowsView.value = { kind: "tracks", rows };
}

function render(): void {
  if (openId === null) {
    renderIndex();
  } else {
    renderTracks();
  }
}

/** Re-renders the playlists view after outside mutations (saved recommendations). */
export function refreshPlaylistsView(): void {
  if (getMode() === "playlists") {
    render();
  }
}

/** Actions the island calls back: open a playlist's tracks. */
export function openPlaylist(id: string): void {
  openId = id;
  deps.backButton.hidden = false;
  deps.search.value = "";
  render();
}

export function removeTrack(playlist: PlaylistRecord, position: number): void {
  playlist.trackIds.splice(position, 1);
  void savePlaylist(playlist);
  render();
}

export function deletePlaylistById(id: string): void {
  setCatalog(getCatalog().filter((entry) => entry.id !== id));
  void deletePlaylist(id);
  render();
}

/** Re-render entry point for the island's inline rename flow. */
export function rerenderPlaylists(): void {
  render();
}

export function getOpenPlaylist(): PlaylistRecord | undefined {
  return openId === null ? undefined : findInCatalog(openId);
}

export function findPlaylistById(id: string): PlaylistRecord | undefined {
  return findInCatalog(id);
}

export function moveTrackAt(playlist: PlaylistRecord, from: number, to: number): void {
  const [trackId] = playlist.trackIds.splice(from, 1);
  playlist.trackIds.splice(to, 0, trackId);
  void savePlaylist(playlist);
  render();
}
