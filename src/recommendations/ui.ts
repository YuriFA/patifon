import type AudioPlayer from "../audio-player";
import { fetchCreatedFor, fetchPlaylistDetails, type RecommendationPlaylist } from "./api";
import { matchRecommendedTrack } from "./match";
import { buildPlaylistRow, buildTrackRow, type ExpandedPlaylist, type RowHandlers } from "./rows";
import type { LibraryRecord } from "../library/store";
import { playRecords, recordAt } from "../library/source";
import { makePlaylist, savePlaylist } from "../playlists/store";
import { getCatalog, setCatalog } from "../playlists/catalog";
import { validateToken } from "../scrobbling/api";
import { getToken, getUsername, setUsername } from "../scrobbling/settings";
import { scrobblingOpenRequest } from "../ui/scrobbling-popup";
import { signal } from "@preact/signals";

export interface RecommendationsDeps {
  container: HTMLDivElement;
  list: HTMLUListElement;
  player: AudioPlayer;
  records(): readonly LibraryRecord[];
  /** Rerenders the playlists view after a recommendation is saved locally. */
  onSaved(): void;
}

let deps: RecommendationsDeps;
let playlists: RecommendationPlaylist[] = [];

export interface RecommendationsStateView {
  text: string;
  actionLabel: string | null;
}

/** The state line the RecommendationsState island renders. */
export const recommendationsState = signal<RecommendationsStateView>({
  text: "",
  actionLabel: null,
});
let stateAction: (() => void) | null = null;

/** Runs the current state line's action (the island button calls this). */
export function runStateAction(): void {
  stateAction?.();
}
const expanded = new Map<string, ExpandedPlaylist>();
/** MBID whose track list is currently being fetched. */
let loadingMbid: string | null = null;
/** Stale-response guard: only the latest refresh may render. */
let fetchSeq = 0;

export function initRecommendations(deps_: RecommendationsDeps): void {
  deps = deps_;
  deps.player.on("track:play", updatePlayingHighlight);
  deps.player.on("track:pause", updatePlayingHighlight);
}

export function showRecommendations(): void {
  deps.container.hidden = false;
  void refresh();
}

export function hideRecommendations(): void {
  deps.container.hidden = true;
}

/** Returns the stored username, backfilling it via validate-token once. */
async function ensureUsername(): Promise<string | null> {
  const stored = getUsername();
  if (stored) {
    return stored;
  }
  const token = getToken();
  if (!token) {
    return null;
  }
  const check = await validateToken(token);
  if (!check.valid || !check.username) {
    return null;
  }
  setUsername(check.username);
  return check.username;
}

async function refresh(): Promise<void> {
  const seq = ++fetchSeq;
  if (!getToken()) {
    renderMessage(
      "Connect ListenBrainz to see playlists made for you. ",
      "Open scrobbling settings",
      () => {
        scrobblingOpenRequest.value += 1;
      },
    );
    return;
  }
  renderMessage("Loading playlists from ListenBrainz...");
  try {
    const username = await ensureUsername();
    if (!username) {
      throw new Error("no ListenBrainz username available");
    }
    const fetched = await fetchCreatedFor(username);
    if (seq !== fetchSeq) {
      return;
    }
    playlists = fetched;
    expanded.clear();
    loadingMbid = null;
    renderList();
  } catch {
    if (seq !== fetchSeq) {
      return;
    }
    renderMessage("Could not load playlists. ", "Retry", () => {
      void refresh();
    });
  }
}

/**
 * Renders a state line with an optional action button, replacing any
 * previous content.
 */
function renderMessage(message: string, actionLabel?: string, action?: () => void): void {
  stateAction = actionLabel !== undefined && action !== undefined ? action : null;
  recommendationsState.value = { text: message, actionLabel: actionLabel ?? null };
}

function renderList(): void {
  if (playlists.length === 0) {
    renderMessage(
      "No created-for-you playlists yet. ListenBrainz builds them from your listening history and refreshes them weekly.",
    );
    return;
  }
  recommendationsState.value = { text: "", actionLabel: null };
  const handlers: RowHandlers = {
    toggle: toggleExpand,
    play: playMatched,
    save: saveLocally,
    isLoading: (playlist) => loadingMbid === playlist.mbid,
  };
  const rows: HTMLLIElement[] = [];
  for (const playlist of playlists) {
    rows.push(buildPlaylistRow(playlist, expanded.get(playlist.mbid), handlers));
    const state = expanded.get(playlist.mbid);
    if (state && !state.loadError) {
      for (const [position, match] of state.matches.entries()) {
        rows.push(buildTrackRow(state, match, position, handlers));
      }
    }
  }
  deps.list.replaceChildren(...rows);
  updatePlayingHighlight();
}

async function toggleExpand(playlist: RecommendationPlaylist): Promise<void> {
  const existing = expanded.get(playlist.mbid);
  // an expanded, healthy playlist collapses; a failed one retries the fetch
  if (existing && !existing.loadError) {
    expanded.delete(playlist.mbid);
    renderList();
    return;
  }
  loadingMbid = playlist.mbid;
  renderList();
  try {
    const details = await fetchPlaylistDetails(playlist.mbid);
    expanded.set(playlist.mbid, {
      details,
      matches: details.tracks.map((track) => ({
        track,
        record: matchRecommendedTrack(track, deps.records()),
      })),
      loadError: false,
    });
  } catch {
    expanded.set(playlist.mbid, {
      details: { ...playlist, tracks: [] },
      matches: [],
      loadError: true,
    });
  }
  loadingMbid = null;
  renderList();
}

/** Matched records in playlist order; the playback source for the playlist. */
function matchedRecords(state: ExpandedPlaylist): LibraryRecord[] {
  return state.matches.flatMap((match) => (match.record ? [match.record] : []));
}

function playMatched(state: ExpandedPlaylist, position: number): void {
  const records = matchedRecords(state);
  if (records.length === 0) {
    return;
  }
  // `position` indexes all tracks; the play order holds matched ones only.
  const matchedIndex = state.matches
    .slice(0, position)
    .filter((match) => match.record !== null).length;
  playRecords(records, matchedIndex);
}

function saveLocally(state: ExpandedPlaylist): void {
  const records = matchedRecords(state);
  if (records.length === 0) {
    return;
  }
  const playlist = makePlaylist(state.details.title);
  playlist.trackIds = records.map((record) => record.id);
  setCatalog([...getCatalog(), playlist]);
  void savePlaylist(playlist);
  deps.onSaved();
}

function updatePlayingHighlight(): void {
  const playing = recordAt(deps.player.currentTrackIndex);
  deps.list.querySelectorAll<HTMLElement>(".recommendations__track").forEach((row) => {
    row.classList.toggle(
      "library__row_playing",
      deps.player.isPlaying && playing !== null && row.dataset.id === playing.id,
    );
  });
}
