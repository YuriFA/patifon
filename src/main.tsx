import "./styles/ui.css";
import "./styles/main.css";
import "./styles/scrobbling.css";
import "./styles/recommendations.css";
import { render } from "preact";
import AudioPlayer from "./audio-player";
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
import { initLyrics } from "./lyrics/ui";
import { initBridge, bridge } from "./ui/bridge";
import { initWaveformStrip } from "./waveform/strip";
import { initPlaylists, refreshPlaylistsView } from "./playlists/ui";
import { initScrobbling } from "./scrobbling/ui";
import { initRecommendations } from "./recommendations/ui";
import { registerSourceStop, onSourceChange } from "./modes";
import { SidebarHeader } from "./ui/sidebar-header";
import { LibraryRows } from "./ui/library-view";
import { TransportControls } from "./ui/transport-controls";
import { SeekBar } from "./ui/seek-bar";
import { VolumeControl } from "./ui/volume-control";
import { AreaTabs } from "./ui/area-tabs";
import { VinylDeck } from "./ui/vinyl-deck";
import { NowPlaying } from "./ui/now-playing";
import { ScrobblingPopup } from "./ui/scrobbling-popup";
import { EqualizerPopup } from "./ui/equalizer-popup";
import { RadioRows } from "./ui/radio-view";
import { PlaylistsRows } from "./ui/playlists-view";
import { RecommendationsState } from "./ui/recommendations-state";
import { areaMode } from "./visualizer/area-mode";

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
const scrobblingRoot = document.querySelector<HTMLDivElement>("#scrobbling-root")!;
const equalizerRoot = document.querySelector<HTMLDivElement>("#equalizer-root")!;

const webglCanvas = document.querySelector<HTMLCanvasElement>(".visualizer__webgl")!;
webglCanvas.width = visualizerCanvas.width;
webglCanvas.height = visualizerCanvas.height;

const player = new AudioPlayer([], { equalizer: true, analyser: true });
// debug/observability handle (also used by e2e to inspect playback state)
window.player = player;
player.volume = 0.1;

// Core events -> signals; the islands read them and call player/radio APIs.

initBridge(player);

// Transport panel: library metadata only - radio keeps its station card and
// the panel clears (spec). Pause keeps the last track visible; stop/radio
// clear it through the source change.
const syncNowPlaying = () => {
  const record = bridge.source.value === "library" ? currentLibraryRecord() : null;
  bridge.trackTitle.value = record?.title ?? null;
  bridge.trackArtist.value = record?.artist ?? null;
};
player.on("track:play", syncNowPlaying);
player.on("track:loadedmetadata", syncNowPlaying);
onSourceChange(() => syncNowPlaying());

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
render(<AreaTabs />, document.querySelector<HTMLDivElement>("#area-tabs-root")!);
render(<VinylDeck player={player} />, document.querySelector<HTMLDivElement>("#vinyl-root")!);
render(<NowPlaying player={player} />, document.querySelector<HTMLDivElement>("#nowplaying-root")!);
render(
  <RecommendationsState />,
  document.querySelector<HTMLDivElement>(".recommendations__state")!,
);
render(<ScrobblingPopup />, scrobblingRoot);
render(<EqualizerPopup player={player} />, equalizerRoot);

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
render(
  <RadioRows list={document.querySelector<HTMLUListElement>(".library__list")!} />,
  document.querySelector<HTMLDivElement>("#radio-rows-root")!,
);
await initRadio({
  search: document.querySelector<HTMLInputElement>(".library__search")!,
  emptyHint: document.querySelector<HTMLDivElement>(".library__empty")!,
  progress: document.querySelector<HTMLElement>(".progress")!,
  liveBadge: document.querySelector<HTMLElement>(".progress__live")!,
  nowPlaying: document.querySelector<HTMLElement>(".station-now")!,
  getVolume: () => player.volume,
  isMuted: () => player.muted,
});

// Playlists view: third mode alongside library and radio; the modes are
// exclusive, so entering one exits the other.
render(
  <PlaylistsRows
    list={document.querySelector<HTMLUListElement>(".library__list")!}
    records={libraryRecords}
  />,
  document.querySelector<HTMLDivElement>("#playlists-rows-root")!,
);
await initPlaylists({
  search: document.querySelector<HTMLInputElement>(".library__search")!,
  emptyHint: document.querySelector<HTMLDivElement>(".library__empty")!,
  newButton: document.querySelector<HTMLButtonElement>(".playlists__new")!,
  backButton: document.querySelector<HTMLButtonElement>(".playlists__back")!,
  player,
  records: libraryRecords,
  artworkUrl: libraryArtworkUrl,
});

// "Created for you": ListenBrainz recommendation playlists, matched to the library
initRecommendations({
  container: document.querySelector<HTMLDivElement>(".recommendations")!,
  list: document.querySelector<HTMLUListElement>(".recommendations__list")!,
  player,
  records: libraryRecords,
  onSaved: refreshPlaylistsView,
});
// OS media surfaces (media keys, lock screen): metadata + transport controls
initMediaSession(player, libraryMetadata);
initLyrics(player, {
  currentRecord: currentLibraryRecord,
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
  strip: document.querySelector<HTMLElement>(".progress")!,
  lane: document.querySelector<HTMLElement>(".progress__bar")!,
  getBufferRatio: () => bridge.buffered.value,
  isRadioActive: () => isStationEngaged() || bridge.mode.value === "radio",
  currentRecord: currentLibraryRecord,
});
// Boot complete: all listeners attached. Tests wait for this before interacting.
window.appReady = true;

/** Visualization draws only while the VISUALIZER tab owns the area (no radio). */
function getModeBridgeSafe(): boolean {
  // imported lazily to keep the import list honest: modes are bridged as signals
  return (
    areaMode.value === "visualizer" &&
    bridge.mode.value !== "radio" &&
    bridge.source.value !== "radio"
  );
}
