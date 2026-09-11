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
import { recordAt } from "../library/source";
import { signal } from "@preact/signals";
import { hideRecommendations, showRecommendations } from "../recommendations/ui";
import { libraryRecords, libraryArtworkUrl } from "../library/ui";

let player: AudioPlayer;
let search: HTMLInputElement;
let emptyHint: HTMLDivElement;
let newButton: HTMLButtonElement;
let backButton: HTMLButtonElement;
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

export async function initPlaylists(audioPlayer: AudioPlayer): Promise<void> {
  player = audioPlayer;
  search = document.querySelector<HTMLInputElement>(".library__search")!;
  emptyHint = document.querySelector<HTMLDivElement>(".library__empty")!;
  newButton = document.querySelector<HTMLButtonElement>(".playlists__new")!;
  backButton = document.querySelector<HTMLButtonElement>(".playlists__back")!;
  const stored = await loadPlaylists();
  const trackIds = new Set(libraryRecords().map((record) => record.id));
  setCatalog(hydratePlaylists(stored, trackIds));

  newButton.addEventListener("click", () => {
    const playlist = makePlaylist();
    setCatalog([...getCatalog(), playlist]);
    void savePlaylist(playlist);
    render();
  });
  backButton.addEventListener("click", () => {
    openId = null;
    backButton.hidden = true;
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
  player.on("track:play", onPlayState);
  player.on("track:pause", onPlayState);
}

function enterPlaylistsView(): void {
  search.placeholder = "Search playlists";
  newButton.hidden = false;
  backButton.hidden = true;
  render();
  showRecommendations();
}

function exitPlaylistsView(): void {
  openId = null;
  newButton.hidden = true;
  backButton.hidden = true;
  hideRecommendations();
}

function renderIndex(): void {
  showRecommendations();
  const query = search.value.trim().toLowerCase();
  const catalog = getCatalog();
  const visible = query
    ? catalog.filter((playlist) => playlist.name.toLowerCase().includes(query))
    : catalog;
  const rows: PlaylistsIndexRow[] = visible.map((playlist) => ({
    id: playlist.id,
    name: playlist.name,
    trackCount: playlist.trackIds.length,
  }));
  emptyHint.hidden = rows.length > 0;
  emptyHint.textContent = query ? "Nothing found" : "No playlists yet - create one";
  playlistsRowsView.value = { kind: "index", rows };
}

function renderTracks(): void {
  const playlist = findInCatalog(openId ?? "");
  if (!playlist) {
    openId = null;
    renderIndex();
    return;
  }
  const query = search.value.trim().toLowerCase();
  const playing = recordAt(player.currentTrackIndex);
  const playingId = player.isPlaying && playing !== null ? playing.id : null;
  const resolved = resolvePlaylistRecords(playlist, libraryRecords());
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
      artwork: libraryArtworkUrl(record),
      playing: playingId === record.id,
    }));
  emptyHint.hidden = rows.length > 0;
  emptyHint.textContent = query
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
  backButton.hidden = false;
  search.value = "";
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
