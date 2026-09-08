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
  rerenderLibraryList,
} from "./library/ui";
import {
  initRadio,
  isRadioMode,
  isStationEngaged,
  stopPlayback,
  toggleMode,
  toggleStationPlayback,
} from "./radio/ui";
import { initVisualizer } from "./visualizer/controller";
import { initLyrics, isLyricsVisible, clearLyrics } from "./lyrics/ui";
import { initWaveformStrip } from "./waveform/strip";
import {
  initPlaylists,
  enterPlaylistsView,
  exitPlaylistsView,
  refreshPlaylistsView,
} from "./playlists/ui";
import { initScrobbling } from "./scrobbling/ui";
import { isPlaylistsMode } from "./playlists/mode";
import { initRecommendations } from "./recommendations/ui";

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
const updateBuffer = (event: Event) => {
  const audio = event.target as HTMLAudioElement;
  const buffered = audio.buffered;
  bufferRatio = buffered.length > 0 ? buffered.end(buffered.length - 1) / audio.duration : 0;
  progressSlider.setBuffer(bufferRatio);
};

player.on("track:progress", updateBuffer);
player.on("track:loadeddata", updateBuffer);
player.on("track:canplaythrough", updateBuffer);
player.on("track:timeupdate", (event) => {
  const audio = (event as Event).target as HTMLAudioElement;
  const ratio = audio.currentTime / audio.duration;
  progressSlider.setValue(ratio);
});
// Player controls: transport routes to the active source (library or radio)
playBtn.addEventListener("click", () => {
  if (isStationEngaged()) {
    toggleStationPlayback();
    return;
  }
  if (player.isPlaying) {
    playBtn.classList.remove("player-controls__btn_pause");
    player.pause();
  } else {
    playBtn.classList.add("player-controls__btn_pause");
    void player.play();
  }
});

playNextBtn.addEventListener("click", () => {
  if (isStationEngaged()) {
    return;
  }
  playBtn.classList.add("player-controls__btn_pause");
  void player.playNext();
});

playPrevBtn.addEventListener("click", () => {
  if (isStationEngaged()) {
    return;
  }
  playBtn.classList.add("player-controls__btn_pause");
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

// Library: import, persistence, search - also drives the playlist.
// Activating a library track stops a playing radio station first.
await initLibrary(player, () => {
  stopPlayback();
});

// Radio mode: catalog search and live streams on the shared transport
await initRadio({
  list: document.querySelector<HTMLUListElement>(".library__list")!,
  search: document.querySelector<HTMLInputElement>(".library__search")!,
  emptyHint: document.querySelector<HTMLDivElement>(".library__empty")!,
  addButtons: [
    document.querySelector<HTMLButtonElement>(".library__add")!,
    document.querySelector<HTMLButtonElement>(".library__add-dir")!,
  ],
  modeButton: document.querySelector<HTMLButtonElement>(".library__mode")!,
  playButton: playBtn,
  progress: document.querySelector<HTMLElement>(".progress")!,
  liveBadge: document.querySelector<HTMLElement>(".progress__live")!,
  nowPlaying: document.querySelector<HTMLElement>(".station-now")!,
  getVolume: () => player.volume,
  isMuted: () => player.muted,
  onModeExit: rerenderLibraryList,
  // a station taking the transport stops the library track
  onStationActivate: () => {
    playBtn.classList.remove("player-controls__btn_pause");
    player.stop();
    clearLyrics();
  },
});

// Playlists view: third mode alongside library and radio; the modes are
// exclusive, so entering one exits the other.
await initPlaylists({
  list: document.querySelector<HTMLUListElement>(".library__list")!,
  search: document.querySelector<HTMLInputElement>(".library__search")!,
  emptyHint: document.querySelector<HTMLDivElement>(".library__empty")!,
  addButtons: [
    document.querySelector<HTMLButtonElement>(".library__add")!,
    document.querySelector<HTMLButtonElement>(".library__add-dir")!,
  ],
  newButton: document.querySelector<HTMLButtonElement>(".playlists__new")!,
  backButton: document.querySelector<HTMLButtonElement>(".playlists__back")!,
  modeButton: document.querySelector<HTMLButtonElement>(".library__mode-playlists")!,
  player,
  records: libraryRecords,
  artworkUrl: libraryArtworkUrl,
  onExit: rerenderLibraryList,
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

document
  .querySelector<HTMLButtonElement>(".library__mode-playlists")!
  .addEventListener("click", () => {
    if (isPlaylistsMode()) {
      exitPlaylistsView();
      return;
    }
    // modes are exclusive: leave radio mode (audio keeps playing) first
    if (isRadioMode()) {
      toggleMode();
    }
    enterPlaylistsView();
  });

document.querySelector<HTMLButtonElement>(".library__mode")!.addEventListener("click", () => {
  // runs after radio's own handler: radio just took the view, yield playlists
  if (isRadioMode() && isPlaylistsMode()) {
    exitPlaylistsView();
  }
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
  shouldDraw: () => !isRadioMode() && !isLyricsVisible(),
});
// ListenBrainz scrobbling: popup + token, listen tracking, retry queue
initScrobbling(player, { currentRecord: currentLibraryRecord });
initWaveformStrip({
  player,
  progress: document.querySelector<HTMLDivElement>(".progress")!,
  getBufferRatio: () => bufferRatio,
  isRadioActive: () => isStationEngaged() || isRadioMode(),
  currentRecord: currentLibraryRecord,
});
// Boot complete: all listeners attached. Tests wait for this before interacting.
window.appReady = true;
