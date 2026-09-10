import { signal } from "@preact/signals";
import { reportListen, type RadioStation } from "./api";
import { cancelScheduledSearch, scheduleSearch } from "./search";
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
import {
  engageSource,
  getMode,
  onModeChange,
  registerModeSearch,
  releaseSource,
  type Mode,
} from "../modes";

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
  search: HTMLInputElement;
  emptyHint: HTMLDivElement;
  modeButton: HTMLButtonElement;
  progress: HTMLElement;
  liveBadge: HTMLElement;
  /** Root of the now-playing station card inside the visualization area. */
  nowPlaying: HTMLElement;
  getVolume: () => number;
  isMuted: () => boolean;
}

let deps: RadioUiDeps;
let nowPlaying: NowPlayingElements;
let stations: RadioStation[] = [];
let savedStations: RadioStation[] = [];

export interface RadioRowItem {
  station: RadioStation;
  saved: boolean;
}

export interface RadioRowsView {
  rows: RadioRowItem[];
  playingUuid: string | null;
  errorUuids: string[];
  query: string;
}

/** The radio view island renders the station rows from this snapshot. */
export const stationRowsView = signal<RadioRowsView>({
  rows: [],
  playingUuid: null,
  errorUuids: [],
  query: "",
});

const errorUuidSet = new Set<string>();

/** Recomputes the row snapshot and notifies the island. Error marks survive
 * only the cycle that reports them (as with the previous DOM patching). */
function notifyRows(emptyText?: string, keepErrors = false): void {
  if (!keepErrors) {
    errorUuidSet.clear();
  }
  const query = deps.search.value.trim();
  const listed = query ? stations : savedStations;
  const rows: RadioRowItem[] = listed.map((station) => ({
    station,
    saved: isSaved(station.stationuuid),
  }));
  // the on-air station stays visible as a list item with its own star
  const playing = playingStation;
  if (playing && !listed.some((s) => s.stationuuid === playing.stationuuid)) {
    rows.unshift({ station: playing, saved: isSaved(playing.stationuuid) });
  }
  let hint = emptyText;
  if (rows.length === 0 && hint === undefined) {
    hint = query ? "No stations found" : "No saved stations yet - search and press the star";
  }
  deps.emptyHint.hidden = rows.length > 0;
  if (rows.length === 0 && hint !== undefined) {
    deps.emptyHint.textContent = hint;
  }
  stationRowsView.value = {
    rows,
    playingUuid: playing?.stationuuid ?? null,
    errorUuids: [...errorUuidSet],
    query,
  };
}

function isSaved(stationuuid: string): boolean {
  return savedStations.some((station) => station.stationuuid === stationuuid);
}

export function toggleSaveStation(station: RadioStation): void {
  if (isSaved(station.stationuuid)) {
    savedStations = savedStations.filter((s) => s.stationuuid !== station.stationuuid);
    void deleteStation(station.stationuuid);
  } else {
    savedStations = [...savedStations, station];
    void saveStation(station);
  }
  notifyRows();
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
  if (failed) {
    errorUuidSet.add(uuid);
    notifyRows(undefined, true);
  }
}

function handlePlaybackState(state: RadioPlaybackState, station: RadioStation | null): void {
  switch (state) {
    case "playing":
      setLiveIndicator(true);
      if (getMode() === "radio") {
        renderStations();
      }
      if (station && getMode() !== "radio") {
        showNowPlaying(nowPlaying, station);
      }
      refreshMediaSession();
      break;
    case "paused":
      setLiveIndicator(true);
      if (station && getMode() !== "radio") {
        showNowPlaying(nowPlaying, station);
      }
      refreshMediaSession();
      break;
    case "stopped":
      setLiveIndicator(false);
      hideNowPlaying(nowPlaying);
      if (getMode() === "radio") {
        renderStations();
      }
      break;
    case "error":
      setLiveIndicator(false);
      hideNowPlaying(nowPlaying);
      if (getMode() === "radio") {
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
  engageSource("radio");
  stations = stations.some((s) => s.stationuuid === station.stationuuid)
    ? stations
    : [...stations, station];
  playback.setRadioVolume(deps.getVolume());
  playback.setRadioMuted(deps.isMuted());
  setPlayingStation(station);
  notifyRows();
  await playback.playStation(station);
  reportListen(station.stationuuid);
}
export function stopPlayback(): void {
  playback.stopStation();
  setPlayingStation(null);
  releaseSource("radio");
  hideNowPlaying(nowPlaying);
  if (getMode() === "radio") {
    notifyRows();
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
  notifyRows();
}

function renderCatalogError(): void {
  // Keep the previous list visible; surface the failure as a hint line
  deps.emptyHint.hidden = stationRowsView.value.rows.length > 0;
  deps.emptyHint.textContent = "Radio catalog unavailable - check your connection";
}

function scheduleCatalogSearch(): void {
  scheduleSearch({
    search: deps.search,
    onResults: (results) => {
      stations = results;
      renderStations();
    },
    onError: renderCatalogError,
  });
}

function enterRadioView(): void {
  deps.modeButton.classList.add("library__mode_active");
  deps.search.placeholder = "Search radio stations";
  // in radio mode the pinned list item represents the station
  hideNowPlaying(nowPlaying);
  stations = [];
  // entering with query text renders the catalog for that text: the search
  // field serves whichever mode is active
  if (deps.search.value.trim()) {
    scheduleCatalogSearch();
  } else {
    renderStations();
  }
  deps.search.focus();
}

function exitRadioView(next: Mode): void {
  deps.modeButton.classList.remove("library__mode_active");
  cancelScheduledSearch();
  // back in the library view the card is the only radio indicator
  if (next === "library" && playingStation) {
    showNowPlaying(nowPlaying, playingStation);
  }
}

export async function initRadio(deps_: RadioUiDeps): Promise<void> {
  deps = deps_;
  nowPlaying = queryNowPlaying(deps.nowPlaying);
  playback.onRadioStateChange(handlePlaybackState);
  onModeChange(({ mode: next, previous }) => {
    if (next === "radio") {
      enterRadioView();
    } else if (previous === "radio") {
      exitRadioView(next);
    }
  });
  registerModeSearch("radio", scheduleCatalogSearch);
  // Hydration is part of boot: the UI must never render an unhydrated list
  savedStations = await loadSavedStations();
  window.radio = {
    isActive: () => playback.isRadioActive(),
    state: () => playback.radioState(),
    volume: () => (playback.isRadioActive() ? deps.getVolume() : -1),
  };
}
