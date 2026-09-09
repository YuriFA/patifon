import { formatDuration } from "../utils";
import type {
  RecommendationPlaylist,
  RecommendationPlaylistDetails,
  RecommendationTrack,
} from "./api";
import type { LibraryRecord } from "../library/store";

export interface ExpandedPlaylist {
  details: RecommendationPlaylistDetails;
  /** Per-track resolution against the library; null = not in library. */
  matches: Array<{ track: RecommendationTrack; record: LibraryRecord | null }>;
  loadError: boolean;
}

export interface RowHandlers {
  toggle(playlist: RecommendationPlaylist): void;
  play(state: ExpandedPlaylist, position: number): void;
  save(state: ExpandedPlaylist): void;
  /** True while the playlist's details are being fetched. */
  isLoading(playlist: RecommendationPlaylist): boolean;
}

/** "2026-09-07 - 3/12 in library" summary for an expanded playlist row. */
export function playlistMeta(state: ExpandedPlaylist): string {
  const date = state.details.date ? state.details.date.slice(0, 10) : null;
  const matched = state.matches.filter((match) => match.record !== null).length;
  const counts = `${matched}/${state.matches.length} in library`;
  return date ? `${date} - ${counts}` : counts;
}

export function buildPlaylistRow(
  playlist: RecommendationPlaylist,
  state: ExpandedPlaylist | undefined,
  handlers: RowHandlers,
): HTMLLIElement {
  const row = document.createElement("li");
  row.className = "library__row playlists__row recommendations__row";

  const meta = document.createElement("div");
  meta.className = "library__meta";
  meta.textContent = playlist.title;
  row.append(meta);

  const actions = document.createElement("div");
  actions.className = "playlists__track-actions";
  if (state && !state.loadError) {
    actions.append(saveButton(state, handlers));
  }
  row.append(actions);

  const info = document.createElement("span");
  info.className = "library__duration";
  info.textContent =
    state === undefined
      ? handlers.isLoading(playlist)
        ? "Loading..."
        : "Tap to expand"
      : state.loadError
        ? "Could not load"
        : playlistMeta(state);
  row.append(info);

  row.addEventListener("click", () => {
    handlers.toggle(playlist);
  });
  return row;
}

function saveButton(state: ExpandedPlaylist, handlers: RowHandlers): HTMLButtonElement {
  const button = document.createElement("button");
  button.className = "library__row-action recommendations__save";
  button.type = "button";
  button.title = "Save as local playlist";
  button.textContent = "\u2913";
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    handlers.save(state);
  });
  return button;
}

export function buildTrackRow(
  state: ExpandedPlaylist,
  match: { track: RecommendationTrack; record: LibraryRecord | null },
  position: number,
  handlers: RowHandlers,
): HTMLLIElement {
  const row = document.createElement("li");
  const matched = match.record !== null;
  row.className = "library__row playlists__track recommendations__track";
  row.classList.toggle("recommendations__track_missing", !matched);
  if (matched) {
    row.dataset.id = match.record!.id;
  }
  row.title = matched ? "" : "Not in library";

  const meta = document.createElement("div");
  meta.className = "library__meta";
  meta.textContent = match.track.artist
    ? `${match.track.artist} - ${match.track.title}`
    : match.track.title;
  row.append(meta);

  const duration = document.createElement("span");
  duration.className = "library__duration";
  duration.textContent =
    match.track.durationMs > 0 ? formatDuration(match.track.durationMs / 1000) : "";
  row.append(duration);

  if (matched) {
    row.addEventListener("click", () => {
      handlers.play(state, position);
    });
  }
  return row;
}
