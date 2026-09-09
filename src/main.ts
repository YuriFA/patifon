import "./styles/main.css";
import "./styles/scrobbling.css";
import "./styles/recommendations.css";
import AudioPlayer from "./audio-player";
import { PRESETS } from "./equalizer";
import RangeSlider from "./utils/range-slider";
import { initVolumeControl } from "./volume";
import { initMediaSession } from "./media-session";
import {
  initLibrary,
  currentLibraryRecord,
  libraryMetadata,
  libraryArtworkUrl,
  libraryRecords,
} from "./library/ui";
import { initRadio, isStationEngaged, stopPlayback, toggleStationPlayback } from "./radio/ui";
import { initVisualizer } from "./visualizer/controller";
import { initLyrics, isLyricsVisible } from "./lyrics/ui";
import { initWaveformStrip } from "./waveform/strip";
import { initPlaylists, refreshPlaylistsView } from "./playlists/ui";
import { initScrobbling } from "./scrobbling/ui";
import { initRecommendations } from "./recommendations/ui";
import { getMode, registerSourceStop, routeSearch, setMode } from "./modes";
import { initTransportButton } from "./transport";

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

const playBtn = document.querySelector<HTMLDivElement>(".player-controls__btn_play")!;

const playNextBtn = document.querySelector<HTMLDivElement>(".player-controls__btn_next")!;
const playPrevBtn = document.querySelector<HTMLDivElement>(".player-controls__btn_prev")!;

const playerBar = document.querySelector<HTMLDivElement>(".bar")!;
const progressBar = document.querySelector<HTMLDivElement>(".progress__bar")!;

const equalizerBtn = document.querySelector<HTMLDivElement>(".player-controls__btn_equalizer")!;
const equalizerPopup = document.querySelector<HTMLDivElement>(".equalizer-popup")!;
const equalizerBands = document.querySelectorAll<HTMLDivElement>(".equalizer-band__slider");
const presetSelect = document.querySelector<HTMLSelectElement>(".equalizer-popup__presets")!;

const visualizerCanvas = document.querySelector<HTMLCanvasElement>("#visualizer")!;
visualizerCanvas.width = document.body.clientWidth;
visualizerCanvas.height = document.body.clientHeight - playerBar.clientHeight;
const webglCanvas = document.querySelector<HTMLCanvasElement>(".visualizer__webgl")!;
webglCanvas.width = visualizerCanvas.width;
webglCanvas.height = visualizerCanvas.height;

const player = new AudioPlayer([], { equalizer: true, analyser: true });
// debug/observability handle (also used by e2e to inspect playback state)
window.player = player;
player.volume = 0.1;
initVolumeControl(player);

// Progress settings
const progressSlider = new RangeSlider(progressBar, {
  handle: false,
  buffer: true,
  onchange: (value) => {
    player.rewind(value);
  },
});

let bufferRatio = 0;
const updateBuffer = () => {
  bufferRatio = player.bufferedRatio;
  progressSlider.setBuffer(bufferRatio);
};

player.on("track:progress", updateBuffer);
player.on("track:loadeddata", updateBuffer);
player.on("track:canplaythrough", updateBuffer);
player.on("track:timeupdate", () => {
  const { duration } = player;
  progressSlider.setValue(duration > 0 ? player.position / duration : 0);
});
// Player controls: transport routes to the active source (library or radio);
// the glyph itself is derived by the transport module from source state.
playBtn.addEventListener("click", () => {
  if (isStationEngaged()) {
    toggleStationPlayback();
    return;
  }
  if (player.isPlaying) {
    player.pause();
  } else {
    void player.play();
  }
});

playNextBtn.addEventListener("click", () => {
  if (isStationEngaged()) {
    return;
  }
  void player.playNext();
});

playPrevBtn.addEventListener("click", () => {
  if (isStationEngaged()) {
    return;
  }
  void player.playPrev();
});

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

// Mode buttons toggle between their view and the library; exclusivity is the
// mode module's job, not the handlers'.
document.querySelector<HTMLButtonElement>(".library__mode")!.addEventListener("click", () => {
  setMode(getMode() === "radio" ? "library" : "radio");
});
document
  .querySelector<HTMLButtonElement>(".library__mode-playlists")!
  .addEventListener("click", () => {
    setMode(getMode() === "playlists" ? "library" : "playlists");
  });

// One listener owns the shared search field; the active mode's handler runs.
const searchInput = document.querySelector<HTMLInputElement>(".library__search")!;
searchInput.addEventListener("input", () => {
  routeSearch(searchInput.value);
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
  shouldDraw: () => getMode() !== "radio" && !isLyricsVisible(),
});
// ListenBrainz scrobbling: popup + token, listen tracking, retry queue
initScrobbling(player, { currentRecord: currentLibraryRecord });
initWaveformStrip({
  player,
  progress: document.querySelector<HTMLDivElement>(".progress")!,
  getBufferRatio: () => bufferRatio,
  isRadioActive: () => isStationEngaged() || getMode() === "radio",
  currentRecord: currentLibraryRecord,
});
initTransportButton(playBtn, player);
// Boot complete: all listeners attached. Tests wait for this before interacting.
window.appReady = true;
