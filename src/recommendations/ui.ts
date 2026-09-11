import type AudioPlayer from "../audio-player";
import { signal } from "@preact/signals";
import { fetchCreatedFor, fetchPlaylistDetails, type RecommendationPlaylist } from "./api";
import { matchRecommendedTrack } from "./match";
import { playlistMeta, type ExpandedPlaylist } from "./rows";
import { formatDuration } from "../utils";
import type { LibraryRecord } from "../library/store";
import { playRecords, recordAt } from "../library/source";
import { libraryRecords } from "../library/ui";
import { makePlaylist, savePlaylist } from "../playlists/store";
import { getCatalog, setCatalog } from "../playlists/catalog";
import { refreshPlaylistsRows } from "../playlists/ui";
import { onModeChange } from "../modes";
import { validateToken } from "../scrobbling/api";
import { getToken, getUsername, setUsername } from "../scrobbling/settings";
import { scrobblingOpenRequest } from "../ui/scrobbling-popup";

let player: AudioPlayer;
let container: HTMLDivElement;
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

export interface RecommendationsTrackView {
  /** Matched library record id, or null when the track is not in the library. */
  id: string | null;
  label: string;
  duration: string;
  position: number;
  playing: boolean;
}

export interface RecommendationsPlaylistView {
  playlist: RecommendationPlaylist;
  state: ExpandedPlaylist | undefined;
  /** Right-aligned status: loading prompt, failure, or the expansion meta. */
  info: string;
  /** Whether the save-as-local-playlist action is offered. */
  saving: boolean;
  tracks: RecommendationsTrackView[];
}

/** The rows island renders the recommendation rows from this snapshot. */
export const recommendationsRowsView = signal<RecommendationsPlaylistView[]>([]);

const expanded = new Map<string, ExpandedPlaylist>();
/** MBID whose track list is currently being fetched. */
let loadingMbid: string | null = null;
/** Stale-response guard: only the latest refresh may render. */
let fetchSeq = 0;

export function initRecommendations(audioPlayer: AudioPlayer): void {
  player = audioPlayer;
  container = document.querySelector<HTMLDivElement>(".recommendations")!;
  player.on("track:play", syncRowsView);
  player.on("track:pause", syncRowsView);
  // the section belongs to the playlists view alone
  onModeChange(({ mode }) => {
    if (mode === "playlists") {
      container.hidden = false;
      void refresh();
    } else {
      container.hidden = true;
    }
  });
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
    syncRowsView();
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

function syncRowsView(): void {
  if (playlists.length === 0) {
    renderMessage(
      "No created-for-you playlists yet. ListenBrainz builds them from your listening history and refreshes them weekly.",
    );
    recommendationsRowsView.value = [];
    return;
  }
  recommendationsState.value = { text: "", actionLabel: null };
  const playing = recordAt(player.currentTrackIndex);
  recommendationsRowsView.value = playlists.map((playlist) => {
    const state = expanded.get(playlist.mbid);
    const info =
      state === undefined
        ? loadingMbid === playlist.mbid
          ? "Loading..."
          : "Tap to expand"
        : state.loadError
          ? "Could not load"
          : playlistMeta(state);
    return {
      playlist,
      state,
      info,
      saving: state !== undefined && !state.loadError,
      tracks:
        state && !state.loadError
          ? state.matches.map((match, position) => ({
              id: match.record?.id ?? null,
              label: match.track.artist
                ? `${match.track.artist} - ${match.track.title}`
                : match.track.title,
              duration:
                match.track.durationMs > 0 ? formatDuration(match.track.durationMs / 1000) : "",
              position,
              playing: player.isPlaying && match.record !== null && match.record.id === playing?.id,
            }))
          : [],
    };
  });
}

/** The rows island calls back: expand or collapse a playlist. */
export async function toggleExpand(playlist: RecommendationPlaylist): Promise<void> {
  const existing = expanded.get(playlist.mbid);
  // an expanded, healthy playlist collapses; a failed one retries the fetch
  if (existing && !existing.loadError) {
    expanded.delete(playlist.mbid);
    syncRowsView();
    return;
  }
  loadingMbid = playlist.mbid;
  syncRowsView();
  try {
    const details = await fetchPlaylistDetails(playlist.mbid);
    expanded.set(playlist.mbid, {
      details,
      matches: details.tracks.map((track) => ({
        track,
        record: matchRecommendedTrack(track, libraryRecords()),
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
  syncRowsView();
}

/** Matched records in playlist order; the playback source for the playlist. */
function matchedRecords(state: ExpandedPlaylist): LibraryRecord[] {
  return state.matches.flatMap((match) => (match.record ? [match.record] : []));
}

/** The rows island calls back: play a matched track at its position. */
export function playMatched(state: ExpandedPlaylist, position: number): void {
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

/** The rows island calls back: save the matched tracks as a local playlist. */
export function saveLocally(state: ExpandedPlaylist): void {
  const records = matchedRecords(state);
  if (records.length === 0) {
    return;
  }
  const playlist = makePlaylist(state.details.title);
  playlist.trackIds = records.map((record) => record.id);
  setCatalog([...getCatalog(), playlist]);
  void savePlaylist(playlist);
  refreshPlaylistsRows();
}
