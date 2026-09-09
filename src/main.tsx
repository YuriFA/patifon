import "./styles/main.css";
import "./styles/scrobbling.css";
import "./styles/recommendations.css";
import { render } from "preact";
import AudioPlayer from "./audio-player";
import { PRESETS } from "./equalizer";
import RangeSlider from "./utils/range-slider";
import { initMediaSession } from "./media-session";
import {
  initLibrary,
  currentLibraryRecord,
  libraryMetadata,
  libraryArtworkUrl,
  libraryRecords,
} from "./library/ui";
import { initRadio, isStationEngaged, stopPlayback } from "./radio/ui";
import { initVisualizer } from "./visualizer/controller";
import { initLyrics, isLyricsVisible } from "./lyrics/ui";
import { initWaveformStrip } from "./waveform/strip";
import { initPlaylists, refreshPlaylistsView } from "./playlists/ui";
import { initScrobbling } from "./scrobbling/ui";
import { initRecommendations } from "./recommendations/ui";
import { registerSourceStop } from "./modes";
import { initBridge, bridge } from "./ui/bridge";
import { SidebarHeader } from "./ui/sidebar-header";
import { LibraryRows } from "./ui/library-view";
import { TransportControls } from "./ui/transport-controls";
import { SeekBar } from "./ui/seek-bar";
import { VolumeControl } from "./ui/volume-control";

declare global {
  interface Window {
    appReady?: boolean;
    player: AudioPlayer;
    showDirectoryPicker?: (options?: { mode?: "read" }) => Promise<FileSystemDirectoryHandle>;
  }

  // the async iterator over directory entries is not in lib.dom yet
  interface FileSystemDirectoryHandle {
    values(): AsyncIterableIterator<FileSystemHandle>;
  }
}
const visualizerArea = document.querySelector<HTMLElement>(".audio_visualize")!;
const visualizerCanvas = document.querySelector<HTMLCanvasElement>("#visualizer")!;
visualizerCanvas.width = visualizerArea.clientWidth;
visualizerCanvas.height = visualizerArea.clientHeight;
const equalizerBtn = document.querySelector<HTMLDivElement>(".player-controls__btn_equalizer")!;
const equalizerPopup = document.querySelector<HTMLDivElement>(".equalizer-popup")!;
const equalizerBands = document.querySelectorAll<HTMLDivElement>(".equalizer-band__slider");
const presetSelect = document.querySelector<HTMLSelectElement>(".equalizer-popup__presets")!;

const webglCanvas = document.querySelector<HTMLCanvasElement>(".visualizer__webgl")!;
webglCanvas.width = visualizerCanvas.width;
webglCanvas.height = visualizerCanvas.height;

const player = new AudioPlayer([], { equalizer: true, analyser: true });
// debug/observability handle (also used by e2e to inspect playback state)
window.player = player;
player.volume = 0.1;

// Core events -> signals; the islands read them and call player/radio APIs.
initBridge(player);

// Islands mount before the feature inits: those still query the shared
// elements the sidebar island renders (search, buttons) at boot.
render(<SidebarHeader />, document.querySelector<HTMLDivElement>(".library__header")!);
render(
  <LibraryRows list={document.querySelector<HTMLUListElement>(".library__list")!} />,
  document.querySelector<HTMLDivElement>("#library-rows-root")!,
);
render(<SeekBar player={player} />, document.querySelector<HTMLDivElement>("#seek-root")!);
render(
  <TransportControls player={player} />,
  document.querySelector<HTMLDivElement>("#transport-root")!,
);
render(<VolumeControl player={player} />, document.querySelector<HTMLDivElement>("#volume-root")!);

// Equalizer settings
equalizerBtn.addEventListener("click", (event) => {
  event.preventDefault();
  equalizerPopup.classList.toggle("equalizer-popup__open");
});

const bandSliders: RangeSlider[] = [];
equalizerBands.forEach((band, i) => {
  const filterValue = player.getBandGain(i);
  const bandSlider = new RangeSlider(band, {
    vertical: true,
    min: -12,
    max: 12,
    value: filterValue,
    onchange: (value) => {
      player.changeBandGain(i, value);
    },
    onmove: (value) => {
      player.changeBandGain(i, value);
    },
  });
  bandSliders.push(bandSlider);
});

// Preset selector: applies gains to every band and moves the band sliders
for (const preset of PRESETS) {
  const option = document.createElement("option");
  option.value = preset.name;
  option.textContent = preset.name;
  presetSelect.append(option);
}

presetSelect.addEventListener("change", () => {
  const preset = PRESETS.find((p) => p.name === presetSelect.value);
  if (!preset) {
    return;
  }
  player.applyPreset(preset);
  preset.data.forEach((gain, i) => {
    bandSliders[i]?.setValue(gain);
  });
});

// Protect the IndexedDB library (audio blobs, metadata, artwork) from eviction.
// The call is fire-and-forget: the browser's grant decision is its own.
void navigator.storage.persist();

// Source takeover: each audible source registers its stop; engagements route
// through the mode module so exactly one source plays at a time.
registerSourceStop("library", () => player.stop());
registerSourceStop("radio", stopPlayback);

// Library: import, persistence, search - also drives the playlist.
await initLibrary(player);

// Radio mode: catalog search and live streams on the shared transport
await initRadio({
  list: document.querySelector<HTMLUListElement>(".library__list")!,
  search: document.querySelector<HTMLInputElement>(".library__search")!,
  emptyHint: document.querySelector<HTMLDivElement>(".library__empty")!,
  modeButton: document.querySelector<HTMLButtonElement>(".library__mode")!,
  progress: document.querySelector<HTMLElement>(".progress")!,
  liveBadge: document.querySelector<HTMLElement>(".progress__live")!,
  nowPlaying: document.querySelector<HTMLElement>(".station-now")!,
  getVolume: () => player.volume,
  isMuted: () => player.muted,
});

// Playlists view: third mode alongside library and radio; the modes are
// exclusive, so entering one exits the other.
await initPlaylists({
  list: document.querySelector<HTMLUListElement>(".library__list")!,
  search: document.querySelector<HTMLInputElement>(".library__search")!,
  emptyHint: document.querySelector<HTMLDivElement>(".library__empty")!,
  newButton: document.querySelector<HTMLButtonElement>(".playlists__new")!,
  backButton: document.querySelector<HTMLButtonElement>(".playlists__back")!,
  modeButton: document.querySelector<HTMLButtonElement>(".library__mode-playlists")!,
  player,
  records: libraryRecords,
  artworkUrl: libraryArtworkUrl,
});

// "Created for you": ListenBrainz recommendation playlists, matched to the library
initRecommendations({
  container: document.querySelector<HTMLDivElement>(".recommendations")!,
  list: document.querySelector<HTMLUListElement>(".recommendations__list")!,
  state: document.querySelector<HTMLDivElement>(".recommendations__state")!,
  player,
  records: libraryRecords,
  onSaved: refreshPlaylistsView,
});

// OS media surfaces (media keys, lock screen): metadata + transport controls
initMediaSession(player, libraryMetadata);
initLyrics(player, {
  currentRecord: currentLibraryRecord,
  lyricsToggle: document.querySelector<HTMLButtonElement>(".visualizer-controls__lyrics")!,
});
initVisualizer({
  player,
  barsCanvas: visualizerCanvas,
  webglCanvas,
  controlsRoot: document.querySelector<HTMLElement>(".visualizer-controls")!,
  shouldDraw: () => getModeBridgeSafe(),
});
// ListenBrainz scrobbling: popup + token, listen tracking, retry queue
initScrobbling(player, { currentRecord: currentLibraryRecord });
initWaveformStrip({
  player,
  progress: document.querySelector<HTMLDivElement>(".progress")!,
  getBufferRatio: () => bridge.buffered.value,
  isRadioActive: () => isStationEngaged() || bridge.mode.value === "radio",
  currentRecord: currentLibraryRecord,
});
// Boot complete: all listeners attached. Tests wait for this before interacting.
window.appReady = true;

/** Visualization draws only for the library source: radio and lyrics replace it. */
function getModeBridgeSafe(): boolean {
  // imported lazily to keep the import list honest: modes are bridged as signals
  return !isLyricsVisible() && bridge.mode.value !== "radio" && bridge.source.value !== "radio";
}
