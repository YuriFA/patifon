import { reportListen, searchStations, type RadioStation } from "./api";
import { renderStationRow, stationTags } from "./rows";
import * as playback from "./playback";
import type { RadioPlaybackState } from "./playback";
import { refreshMediaSession, setActiveSource, type MediaSessionSource } from "../media-session";
import type { MediaSessionMetadata } from "../media-session";

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
  getVolume: () => number;
  isMuted: () => boolean;
  /** Re-renders the library list when the mode switches off. */
  onModeExit: () => void;
}

const SEARCH_DEBOUNCE_MS = 300;

let deps: RadioUiDeps;
let mode = false;
let stations: RadioStation[] = [];
let searchTimer: number | null = null;

function stationMetadata(station: RadioStation): MediaSessionMetadata {
  return {
    title: station.name,
    artist: stationTags(station),
    album: null,
    artworkUrl: station.favicon || null,
  };
}

function stationSource(): MediaSessionSource {
  return {
    play: () => {
      void playback.resumeStation();
    },
    pause: () => {
      playback.pauseStation();
    },
    state: () => (playback.radioState() === "playing" ? "playing" : "paused"),
    metadata: () => {
      const station = currentStation();
      return station ? stationMetadata(station) : null;
    },
  };
}

function currentStation(): RadioStation | null {
  // playback owns the identity; expose it through its state
  return playingStation;
}

let playingStation: RadioStation | null = null;

function setPlayingStation(station: RadioStation | null): void {
  playingStation = station;
  setActiveSource(station ? stationSource() : null);
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
      updatePlayingHighlight();
      refreshMediaSession();
      break;
    case "paused":
      setPlayButton(false);
      setLiveIndicator(true);
      refreshMediaSession();
      break;
    case "stopped":
      setPlayButton(false);
      setLiveIndicator(false);
      updatePlayingHighlight();
      break;
    case "error":
      setPlayButton(false);
      setLiveIndicator(false);
      if (station) {
        setRowError(station.stationuuid, true);
      }
      updatePlayingHighlight();
      break;
  }
}

function setLiveIndicator(active: boolean): void {
  deps.liveBadge.hidden = !active;
  deps.progress.classList.toggle("progress_live", active);
}

export async function playStation(station: RadioStation): Promise<void> {
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
  updatePlayingHighlight();
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

export function isRadioMode(): boolean {
  return mode;
}

export function isStationEngaged(): boolean {
  return playingStation !== null;
}

function renderStations(): void {
  deps.emptyHint.hidden = stations.length > 0 || Boolean(deps.search.value.trim());
  if (stations.length === 0 && deps.search.value.trim()) {
    deps.emptyHint.hidden = false;
    deps.emptyHint.textContent = "No stations found";
  } else if (stations.length === 0) {
    deps.emptyHint.hidden = false;
    deps.emptyHint.textContent = "Type to search community radio stations";
  }
  deps.list.replaceChildren(
    ...stations.map((station) => renderStationRow(station, (s) => void playStation(s))),
  );
}

function renderCatalogError(): void {
  // Keep the previous list visible; surface the failure as a hint line
  deps.emptyHint.textContent = "Radio catalog unavailable - check your connection";
}

function scheduleSearch(): void {
  if (searchTimer !== null) {
    window.clearTimeout(searchTimer);
  }
  searchTimer = window.setTimeout(() => {
    searchTimer = null;
    void runSearch();
  }, SEARCH_DEBOUNCE_MS);
}

async function runSearch(): Promise<void> {
  const query = deps.search.value.trim();
  if (!query) {
    stations = [];
    renderStations();
    return;
  }
  try {
    stations = await searchStations(query);
    renderStations();
  } catch {
    renderCatalogError();
  }
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
    stations = [];
    renderStations();
    deps.search.focus();
  } else {
    if (searchTimer !== null) {
      window.clearTimeout(searchTimer);
      searchTimer = null;
    }
    deps.search.value = "";
    deps.onModeExit();
  }
}

export function initRadio(deps_: RadioUiDeps): void {
  deps = deps_;
  playback.onRadioStateChange(handlePlaybackState);
  deps.search.addEventListener("input", () => {
    if (isRadioMode()) {
      scheduleSearch();
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
