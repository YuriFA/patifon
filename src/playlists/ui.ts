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
import { onModeChange, registerModeSearch, searchQuery } from "../modes";
import { recordAt } from "../library/source";
import { signal } from "@preact/signals";
import { libraryRecords } from "../library/ui";
import { artworkUrlFor } from "../library/artwork-url";

let player: AudioPlayer;
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
  | { kind: "index"; rows: PlaylistsIndexRow[]; empty: boolean; emptyText: string }
  | { kind: "tracks"; rows: PlaylistsTrackRow[]; empty: boolean; emptyText: string };

/** The playlists island renders the index/track rows from this snapshot. */
export const playlistsRowsView = signal<PlaylistsRowsView>({
  kind: "index",
  rows: [],
  empty: true,
  emptyText: "",
});

export async function initPlaylists(audioPlayer: AudioPlayer): Promise<void> {
  player = audioPlayer;
  const stored = await loadPlaylists();
  const trackIds = new Set(libraryRecords().map((record) => record.id));
  setCatalog(hydratePlaylists(stored, trackIds));

  registerModeSearch("playlists", () => {
    syncRowsView();
  });
  onModeChange(({ mode: next, previous }) => {
    if (next === "playlists") {
      syncRowsView();
    } else if (previous === "playlists") {
      // the next entry opens at the index, not inside a playlist
      openId = null;
    }
  });
  // the playing highlight only exists in the open playlist's track view
  const onPlayState = () => {
    if (openId !== null) {
      syncRowsView();
    }
  };
  player.on("track:play", onPlayState);
  player.on("track:pause", onPlayState);
}

function renderIndex(): void {
  const query = searchQuery.value.trim().toLowerCase();
  const catalog = getCatalog();
  const visible = query
    ? catalog.filter((playlist) => playlist.name.toLowerCase().includes(query))
    : catalog;
  const rows: PlaylistsIndexRow[] = visible.map((playlist) => ({
    id: playlist.id,
    name: playlist.name,
    trackCount: playlist.trackIds.length,
  }));
  playlistsRowsView.value = {
    kind: "index",
    rows,
    empty: rows.length === 0,
    emptyText: query ? "Nothing found" : "No playlists yet - create one",
  };
}

function renderTracks(): void {
  const playlist = findInCatalog(openId ?? "");
  if (!playlist) {
    openId = null;
    renderIndex();
    return;
  }
  const query = searchQuery.value.trim().toLowerCase();
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
      artwork: artworkUrlFor(record),
      playing: playingId === record.id,
    }));
  playlistsRowsView.value = {
    kind: "tracks",
    rows,
    empty: rows.length === 0,
    emptyText: query ? "Nothing found" : "Playlist is empty - add tracks from the library",
  };
}

function syncRowsView(): void {
  if (openId === null) {
    renderIndex();
  } else {
    renderTracks();
  }
}

/** Recomputes the rows after outside mutations (saved recommendation, rename). */
export function refreshPlaylistsRows(): void {
  syncRowsView();
}

/** Actions the island calls back: open a playlist's tracks. */
export function openPlaylist(id: string): void {
  openId = id;
  syncRowsView();
}

/** The sidebar's New playlist button. */
export function createPlaylist(): void {
  const playlist = makePlaylist();
  setCatalog([...getCatalog(), playlist]);
  void savePlaylist(playlist);
  syncRowsView();
}

/** The sidebar's All playlists button: back to the index. */
export function closePlaylist(): void {
  openId = null;
  syncRowsView();
}

export function removeTrack(playlist: PlaylistRecord, position: number): void {
  playlist.trackIds.splice(position, 1);
  void savePlaylist(playlist);
  syncRowsView();
}

export function deletePlaylistById(id: string): void {
  setCatalog(getCatalog().filter((entry) => entry.id !== id));
  void deletePlaylist(id);
  syncRowsView();
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
  syncRowsView();
}
