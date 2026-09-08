import { reportListen, type RadioStation } from "./api";
import { cancelScheduledSearch, scheduleSearch } from "./search";
import { renderStationRow } from "./rows";
import { createStationSource } from "./session";
import {
  hideNowPlaying,
  queryNowPlaying,
  showNowPlaying,
  type NowPlayingElements,
} from "./now-playing";
import * as playback from "./playback";
import type { RadioPlaybackState } from "./playback";
import { deleteStation, loadSavedStations, saveStation } from "./store";
import { refreshMediaSession, setActiveSource } from "../media-session";

declare global {
  interface Window {
    radio: {
      isActive: () => boolean;
      state: () => RadioPlaybackState;
      volume: () => number;
    };
  }
}

export interface RadioUiDeps {
  list: HTMLUListElement;
  search: HTMLInputElement;
  emptyHint: HTMLDivElement;
  addButtons: HTMLButtonElement[];
  modeButton: HTMLButtonElement;
  playButton: HTMLElement;
  progress: HTMLElement;
  liveBadge: HTMLElement;
  /** Root of the now-playing station card inside the visualization area. */
  nowPlaying: HTMLElement;
  getVolume: () => number;
  isMuted: () => boolean;
  /** Re-renders the library list when the mode switches off. */
  onModeExit: () => void;
  /** Stops library playback before the station takes the transport. */
  onStationActivate: () => void;
}

let deps: RadioUiDeps;
let nowPlaying: NowPlayingElements;
let mode = false;
let stations: RadioStation[] = [];
let savedStations: RadioStation[] = [];

function isSaved(stationuuid: string): boolean {
  return savedStations.some((station) => station.stationuuid === stationuuid);
}

function toggleSaveStation(station: RadioStation): void {
  if (isSaved(station.stationuuid)) {
    savedStations = savedStations.filter((s) => s.stationuuid !== station.stationuuid);
    void deleteStation(station.stationuuid);
  } else {
    savedStations = [...savedStations, station];
    void saveStation(station);
  }
  renderStations();
}

let playingStation: RadioStation | null = null;

function setPlayingStation(station: RadioStation | null): void {
  playingStation = station;
  setActiveSource(
    station
      ? createStationSource(playback, () => {
          // playback owns the identity; expose it through its state
          return playingStation;
        })
      : null,
  );
}

function setRowError(uuid: string, failed: boolean): void {
  deps.list.querySelectorAll("li").forEach((row) => {
    if (row instanceof HTMLElement && row.dataset.uuid === uuid) {
      row.classList.toggle("radio__row_error", failed);
    }
  });
}

function updatePlayingHighlight(): void {
  const active = playingStation;
  deps.list.querySelectorAll("li").forEach((row) => {
    if (row instanceof HTMLElement) {
      row.classList.toggle(
        "library__row_playing",
        active !== null && row.dataset.uuid === active.stationuuid,
      );
    }
  });
}

function setPlayButton(playing: boolean): void {
  deps.playButton.classList.toggle("player-controls__btn_pause", playing);
}

function handlePlaybackState(state: RadioPlaybackState, station: RadioStation | null): void {
  switch (state) {
    case "playing":
      setPlayButton(true);
      setLiveIndicator(true);
      if (mode) {
        renderStations();
      }
      if (station && !mode) {
        showNowPlaying(nowPlaying, station);
      }
      refreshMediaSession();
      break;
    case "paused":
      setPlayButton(false);
      setLiveIndicator(true);
      if (station && !mode) {
        showNowPlaying(nowPlaying, station);
      }
      refreshMediaSession();
      break;
    case "stopped":
      setPlayButton(false);
      setLiveIndicator(false);
      hideNowPlaying(nowPlaying);
      if (mode) {
        renderStations();
      }
      break;
    case "error":
      setPlayButton(false);
      setLiveIndicator(false);
      hideNowPlaying(nowPlaying);
      if (mode) {
        renderStations();
      }
      if (station) {
        setRowError(station.stationuuid, true);
      }
      break;
  }
}

function setLiveIndicator(active: boolean): void {
  deps.liveBadge.hidden = !active;
  deps.progress.classList.toggle("progress_live", active);
}

export async function playStation(station: RadioStation): Promise<void> {
  deps.onStationActivate();
  stations = stations.some((s) => s.stationuuid === station.stationuuid)
    ? stations
    : [...stations, station];
  playback.setRadioVolume(deps.getVolume());
  playback.setRadioMuted(deps.isMuted());
  setPlayingStation(station);
  updatePlayingHighlight();
  await playback.playStation(station);
  reportListen(station.stationuuid);
}

export function stopPlayback(): void {
  playback.stopStation();
  setPlayingStation(null);
  hideNowPlaying(nowPlaying);
  if (mode) {
    renderStations();
  }
}

export function isStationEngaged(): boolean {
  return playingStation !== null;
}

export function toggleStationPlayback(): void {
  if (!playingStation) {
    return;
  }
  if (playback.radioState() === "playing") {
    playback.pauseStation();
  } else if (playback.radioState() === "paused") {
    void playback.resumeStation();
  }
}

function renderStations(): void {
  const query = deps.search.value.trim();
  const listed = query ? stations : savedStations;
  const rows = listed.map((station) =>
    renderStationRow(
      station,
      isSaved(station.stationuuid),
      (s) => void playStation(s),
      toggleSaveStation,
    ),
  );
  // the on-air station stays visible as a list item with its own star
  const playing = playingStation;
  if (playing && !listed.some((s) => s.stationuuid === playing.stationuuid)) {
    rows.unshift(
      renderStationRow(
        playing,
        isSaved(playing.stationuuid),
        (s) => void playStation(s),
        toggleSaveStation,
      ),
    );
  }
  deps.emptyHint.hidden = rows.length > 0;
  if (rows.length === 0) {
    deps.emptyHint.textContent = query
      ? "No stations found"
      : "No saved stations yet - search and press the star";
  }
  deps.list.replaceChildren(...rows);
  updatePlayingHighlight();
}

function renderCatalogError(): void {
  // Keep the previous list visible; surface the failure as a hint line
  deps.emptyHint.textContent = "Radio catalog unavailable - check your connection";
}

function setLibraryControlsVisible(visible: boolean): void {
  for (const button of deps.addButtons) {
    button.hidden = !visible;
  }
}

export function toggleMode(): void {
  mode = !mode;
  deps.modeButton.classList.toggle("library__mode_active", mode);
  deps.search.placeholder = mode ? "Search radio stations" : "Search library";
  setLibraryControlsVisible(!mode);
  if (mode) {
    // in radio mode the pinned list item represents the station
    hideNowPlaying(nowPlaying);
    stations = [];
    renderStations();
    deps.search.focus();
  } else {
    cancelScheduledSearch();
    deps.search.value = "";
    deps.onModeExit();
    // back in the library view the card is the only radio indicator
    if (playingStation) {
      showNowPlaying(nowPlaying, playingStation);
    }
  }
}

export function isRadioMode(): boolean {
  return mode;
}

export async function initRadio(deps_: RadioUiDeps): Promise<void> {
  deps = deps_;
  nowPlaying = queryNowPlaying(deps.nowPlaying);
  playback.onRadioStateChange(handlePlaybackState);
  // Hydration is part of boot: the UI must never render an unhydrated list
  savedStations = await loadSavedStations();
  deps.search.addEventListener("input", () => {
    if (isRadioMode()) {
      scheduleSearch({
        search: deps.search,
        onResults: (results) => {
          stations = results;
          renderStations();
        },
        onError: renderCatalogError,
      });
    }
  });
  deps.modeButton.addEventListener("click", () => {
    toggleMode();
  });
  window.radio = {
    isActive: () => playback.isRadioActive(),
    state: () => playback.radioState(),
    volume: () => (playback.isRadioActive() ? deps.getVolume() : -1),
  };
}
