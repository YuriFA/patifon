import type AudioPlayer from "../audio-player";
import { formatDuration } from "../utils";
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
import { startInlineRename } from "./rename";
import { getMode, onModeChange, registerModeSearch } from "../modes";
import type { LibraryRecord } from "../library/store";
import { playRecords, recordAt } from "../library/source";
import { hideRecommendations, showRecommendations } from "../recommendations/ui";

export interface PlaylistsUiDeps {
  list: HTMLUListElement;
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
  deps.player.on("track:play", updatePlayingHighlight);
  deps.player.on("track:pause", updatePlayingHighlight);
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

function render(): void {
  if (openId === null) {
    renderIndex();
  } else {
    renderTracks();
  }
  updatePlayingHighlight();
}

/** Re-renders the playlists view after outside mutations (saved recommendations). */
export function refreshPlaylistsView(): void {
  if (getMode() === "playlists") {
    render();
  }
}

function renderIndex(): void {
  showRecommendations();
  const query = deps.search.value.trim().toLowerCase();
  const catalog = getCatalog();
  const visible = query
    ? catalog.filter((playlist) => playlist.name.toLowerCase().includes(query))
    : catalog;

  const rows = visible.map((playlist) => buildPlaylistRow(playlist));
  deps.list.replaceChildren(...rows);
  deps.emptyHint.hidden = rows.length > 0;
  deps.emptyHint.textContent = query ? "Nothing found" : "No playlists yet - create one";
}

function renderTracks(): void {
  const playlist = findInCatalog(openId ?? "");
  if (!playlist) {
    openId = null;
    renderIndex();
    return;
  }
  const resolved = resolvePlaylistRecords(playlist, deps.records());
  const query = deps.search.value.trim().toLowerCase();
  const visible = resolved
    .map((record, position) => ({ record, position }))
    .filter(
      ({ record }) =>
        !query ||
        record.title.toLowerCase().includes(query) ||
        record.artist.toLowerCase().includes(query),
    );

  const rows = visible.map((entry) => buildTrackRow(playlist, entry, resolved.length));
  deps.list.replaceChildren(...rows);
  deps.emptyHint.hidden = rows.length > 0;
  deps.emptyHint.textContent = query
    ? "Nothing found"
    : "Playlist is empty - add tracks from the library";
}

function buildThumb(artworkUrl: string | null): HTMLImageElement | HTMLSpanElement {
  if (artworkUrl) {
    const image = document.createElement("img");
    image.className = "library__thumb";
    image.src = artworkUrl;
    image.alt = "";
    return image;
  }
  const placeholder = document.createElement("span");
  placeholder.className = "library__thumb library__thumb_empty";
  placeholder.textContent = "\u266A";
  return placeholder;
}

function rowButton(
  className: string,
  title: string,
  glyph: string,
  onClick: () => void,
): HTMLButtonElement {
  const button = document.createElement("button");
  button.className = `library__row-action ${className}`;
  button.type = "button";
  button.title = title;
  button.textContent = glyph;
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    onClick();
  });
  return button;
}

function buildPlaylistRow(playlist: PlaylistRecord): HTMLLIElement {
  const row = document.createElement("li");
  row.className = "library__row playlists__row";
  row.dataset.pid = playlist.id;
  row.append(buildThumb(null));

  const meta = document.createElement("div");
  meta.className = "library__meta";
  meta.textContent = playlist.name;
  row.append(meta);

  const actions = document.createElement("div");
  actions.className = "playlists__track-actions";
  actions.append(
    rowButton("playlists__play", "Play playlist", "\u25B6", () => {
      const resolved = resolvePlaylistRecords(playlist, deps.records());
      if (resolved.length > 0) {
        playRecords(resolved, 0);
      }
    }),
    rowButton("playlists__rename", "Rename playlist", "\u270E", () => {
      startInlineRename(playlist, deps.list, render);
    }),
    rowButton("playlists__remove", "Delete playlist", "\u00D7", () => {
      setCatalog(getCatalog().filter((entry) => entry.id !== playlist.id));
      void deletePlaylist(playlist.id);
      render();
    }),
  );
  row.append(actions);

  const count = document.createElement("span");
  count.className = "library__duration";
  count.textContent = `${playlist.trackIds.length} tracks`;
  row.append(count);

  row.addEventListener("click", () => {
    openId = playlist.id;
    deps.backButton.hidden = false;
    deps.search.value = "";
    render();
  });
  return row;
}

function buildTrackRow(
  playlist: PlaylistRecord,
  entry: { record: LibraryRecord; position: number },
  length: number,
): HTMLLIElement {
  const { record, position } = entry;
  const row = document.createElement("li");
  row.className = "library__row playlists__track";
  row.dataset.id = record.id;
  row.dataset.pos = String(position);
  row.append(buildThumb(deps.artworkUrl(record)));

  const meta = document.createElement("div");
  meta.className = "library__meta";
  meta.textContent = record.artist ? `${record.artist} - ${record.title}` : record.title;
  row.append(meta);
  const actions = document.createElement("div");
  actions.className = "playlists__track-actions";
  const up = rowButton("playlists__move-up", "Move up", "\u2191", () => {
    moveTrack(playlist, position, position - 1);
  });
  const down = rowButton("playlists__move-down", "Move down", "\u2193", () => {
    moveTrack(playlist, position, position + 1);
  });
  up.classList.toggle("hidden-button", position === 0);
  down.classList.toggle("hidden-button", position === length - 1);
  actions.append(
    up,
    down,
    rowButton("playlists__remove-track", "Remove from playlist", "\u00D7", () => {
      playlist.trackIds.splice(position, 1);
      void savePlaylist(playlist);
      render();
    }),
  );
  row.append(actions);

  const duration = document.createElement("span");
  duration.className = "library__duration";
  duration.textContent = formatDuration(record.duration);
  row.append(duration);

  row.addEventListener("click", () => {
    playRecords(resolvePlaylistRecords(playlist, deps.records()), position);
  });
  return row;
}

function moveTrack(playlist: PlaylistRecord, from: number, to: number): void {
  const [trackId] = playlist.trackIds.splice(from, 1);
  playlist.trackIds.splice(to, 0, trackId);
  void savePlaylist(playlist);
  render();
}

function updatePlayingHighlight(): void {
  const playing = recordAt(deps.player.currentTrackIndex);
  deps.list.querySelectorAll<HTMLElement>(".library__row").forEach((row) => {
    row.classList.toggle(
      "library__row_playing",
      deps.player.isPlaying && playing !== null && row.dataset.id === playing.id,
    );
  });
}
