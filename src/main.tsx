import "./styles/ui.css";
import "./styles/main.css";
import "./styles/scrobbling.css";
import "./styles/recommendations.css";
import { render } from "preact";
import AudioPlayer from "./audio-player";
import { initMediaSession } from "./media-session";
import { initLibrary, libraryMetadata } from "./library/ui";
import { initRadio, stopPlayback } from "./radio/ui";
import { initVisualizer } from "./visualizer/controller";
import { initLyrics } from "./lyrics/ui";
import { initBridge, bridge } from "./ui/bridge";
import { initWaveformStrip } from "./waveform/strip";
import { initPlaylists } from "./playlists/ui";
import { initScrobbling } from "./scrobbling/ui";
import { initRecommendations } from "./recommendations/ui";
import { registerSourceStop } from "./modes";
import { SidebarHeader } from "./ui/sidebar-header";
import { RowsHost } from "./ui/rows-host";
import { TransportControls } from "./ui/transport-controls";
import { SeekBar } from "./ui/seek-bar";
import { VolumeControl } from "./ui/volume-control";
import { AreaTabs } from "./ui/area-tabs";
import { VinylDeck } from "./ui/vinyl-deck";
import { RadioDeck } from "./ui/radio-deck";
import { NowPlaying } from "./ui/now-playing";
import { ScrobblingPopup } from "./ui/scrobbling-popup";
import { EqualizerPopup } from "./ui/equalizer-popup";
import { RecommendationsRows } from "./ui/recommendations-rows";
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
// On mobile the stage container opens with display: contents (no box to
// measure), so the canvas measures its own CSS box instead.
visualizerCanvas.width = visualizerArea.clientWidth || visualizerCanvas.clientWidth;
visualizerCanvas.height = visualizerArea.clientHeight || visualizerCanvas.clientHeight;
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

// Islands mount before the feature inits: radio and playlists still query
// the search field the sidebar island renders when they boot.
render(<SidebarHeader />, document.querySelector<HTMLDivElement>(".library__header")!);
render(<RowsHost />, document.querySelector<HTMLDivElement>("#rows-host-root")!);
render(<SeekBar player={player} />, document.querySelector<HTMLDivElement>("#seek-root")!);
render(
  <TransportControls player={player} />,
  document.querySelector<HTMLDivElement>("#transport-root")!,
);
render(<VolumeControl player={player} />, document.querySelector<HTMLDivElement>("#volume-root")!);
render(<AreaTabs />, document.querySelector<HTMLDivElement>("#area-tabs-root")!);
render(<VinylDeck player={player} />, document.querySelector<HTMLDivElement>("#vinyl-root")!);
render(<RadioDeck player={player} />, document.querySelector<HTMLDivElement>("#radio-deck-root")!);
render(<NowPlaying player={player} />, document.querySelector<HTMLDivElement>("#nowplaying-root")!);
render(
  <RecommendationsRows />,
  document.querySelector<HTMLDivElement>("#recommendations-rows-root")!,
);
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
await initRadio(player);

// Playlists view: third mode alongside library and radio; the modes are
// exclusive, so entering one exits the other.
await initPlaylists(player);

// "Created for you": ListenBrainz recommendation playlists, matched to the library
initRecommendations(player);
// OS media surfaces (media keys, lock screen): metadata + transport controls
initMediaSession(player, libraryMetadata);
initLyrics(player);
initVisualizer({
  player,
  barsCanvas: visualizerCanvas,
  webglCanvas,
  controlsRoot: document.querySelector<HTMLElement>(".visualizer-controls")!,
  shouldDraw: () => getModeBridgeSafe(),
});
// ListenBrainz scrobbling: popup + token, listen tracking, retry queue
initScrobbling(player);
initWaveformStrip({
  player,
  strip: document.querySelector<HTMLElement>(".progress")!,
  lane: document.querySelector<HTMLElement>(".progress__bar")!,
  getBufferRatio: () => bridge.buffered.value,
});
// Mobile flow layout: a hidden canvas (a stored vinyl/lyrics tab) cannot be
// measured at boot - match the drawing buffer to the CSS box the first time
// the visualizer tab becomes visible.
areaMode.subscribe((mode) => {
  if (mode !== "visualizer" || visualizerCanvas.clientWidth === 0) {
    return;
  }
  visualizerCanvas.width = visualizerCanvas.clientWidth;
  visualizerCanvas.height = visualizerCanvas.clientHeight;
  webglCanvas.width = visualizerCanvas.width;
  webglCanvas.height = visualizerCanvas.height;
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
