import { signal } from "@preact/signals";
import { reportListen, type RadioStation } from "./api";
import { cancelScheduledSearch, scheduleSearch } from "./search";
import { createStationSource } from "./session";
import * as playback from "./playback";
import type { RadioPlaybackState } from "./playback";
import { deleteStation, loadSavedStations, saveStation } from "./store";
import { refreshMediaSession, setActiveSource } from "../media-session";
import { stationTags } from "./rows";
import { bridge, type BridgeStation } from "../ui/bridge";
import {
  engageSource,
  getMode,
  onModeChange,
  onSourceChange,
  registerModeSearch,
  releaseSource,
  searchQuery,
  type Mode,
} from "../modes";
import type AudioPlayer from "../audio-player";
import { getOutputVolume, isOutputMuted } from "../volume";

declare global {
  interface Window {
    radio: {
      isActive: () => boolean;
      state: () => RadioPlaybackState;
      volume: () => number;
    };
  }
}

let player: AudioPlayer;
let progress: HTMLElement;
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
  /** True when the list has no rows and the hint line shows. */
  empty: boolean;
  /** Hint line text (also carries catalog errors while rows stay). */
  emptyText: string;
}

/** The radio view island renders the station rows from this snapshot. */
export const stationRowsView = signal<RadioRowsView>({
  rows: [],
  playingUuid: null,
  errorUuids: [],
  query: "",
  empty: true,
  emptyText: "",
});

const errorUuidSet = new Set<string>();

/** Recomputes the row snapshot and notifies the island. Error marks survive
 * only the cycle that reports them (as with the previous DOM patching). */
function notifyRows(emptyText?: string, keepErrors = false): void {
  if (!keepErrors) {
    errorUuidSet.clear();
  }
  const query = searchQuery.value.trim();
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
  stationRowsView.value = {
    rows,
    playingUuid: playing?.stationuuid ?? null,
    errorUuids: [...errorUuidSet],
    query,
    empty: rows.length === 0,
    emptyText:
      emptyText ??
      (query ? "No stations found" : "No saved stations yet - search and press the star"),
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
      if (getMode() === "radio") {
        renderStations();
      }
      refreshMediaSession();
      break;
    case "paused":
      refreshMediaSession();
      break;
    case "stopped":
      if (getMode() === "radio") {
        renderStations();
      }
      break;
    case "error":
      // the deck stays engaged and shows NO SIGNAL; the badge hides itself
      // (the SeekBar derives it from the bridge's radio state)
      if (getMode() === "radio") {
        renderStations();
      }
      if (station) {
        setRowError(station.stationuuid, true);
      }
      break;
  }
}

/** The engaged station as the display islands see it. */
function toBridgeStation(station: RadioStation): BridgeStation {
  return {
    name: station.name,
    tags: stationTags(station),
    bitrate: station.bitrate,
    uuid: station.stationuuid,
  };
}

export async function playStation(station: RadioStation): Promise<void> {
  engageSource("radio");
  bridge.station.value = toBridgeStation(station);
  stations = stations.some((s) => s.stationuuid === station.stationuuid)
    ? stations
    : [...stations, station];
  playback.setRadioVolume(getOutputVolume(player));
  playback.setRadioMuted(isOutputMuted(player));
  setPlayingStation(station);
  notifyRows();
  await playback.playStation(station);
  reportListen(station.stationuuid);
}
export function stopPlayback(): void {
  playback.stopStation();
  bridge.station.value = null;
  setPlayingStation(null);
  releaseSource("radio");
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
  notifyRows("Radio catalog unavailable - check your connection", true);
}

function scheduleCatalogSearch(): void {
  scheduleSearch({
    search: () => searchQuery.value,
    onResults: (results) => {
      stations = results;
      renderStations();
    },
    onError: renderCatalogError,
  });
}

function enterRadioView(): void {
  stations = [];
  // entering with query text renders the catalog for that text: the search
  // field serves whichever mode is active
  if (searchQuery.value.trim()) {
    scheduleCatalogSearch();
  } else {
    renderStations();
  }
}

function exitRadioView(_next: Mode): void {
  cancelScheduledSearch();
  // the engaged station stays visible through the radio deck and the pinned
  // list row; the library view needs no extra indicator
}

export async function initRadio(audioPlayer: AudioPlayer): Promise<void> {
  player = audioPlayer;
  progress = document.querySelector<HTMLElement>(".progress")!;
  // The strip's lane stays dimmed exactly while a station is engaged (any
  // playback state, including the transient stop at start and errors); the
  // LIVE badge in the total-time slot follows the bridge's radio state.
  onSourceChange(({ source }) => {
    progress.classList.toggle("progress_live", source === "radio");
  });
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
    volume: () => (playback.isRadioActive() ? getOutputVolume(player) : -1),
  };
}
