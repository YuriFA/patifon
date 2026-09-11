# App Shell & Layout

Single-page app, no router. The whole UI shell is declarative in `index.html`; Preact islands are rendered into fixed roots by `src/main.tsx`. Layout is one CSS grid.

## index.html (the entire shell)

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Audio Player</title>
    <link rel="icon" type="image/svg+xml" href="/assets/images/icon.svg" />
    <meta name="theme-color" content="#ece7db" />
  </head>
  <body>
    <div class="audio_player">
      <div class="playlist">
        <div class="library__header" id="sidebar-root"></div>
        <div class="library__empty">Drop audio files anywhere, or use "Add files"</div>
        <ul class="library__list"></ul>
        <div class="recommendations" hidden>
          <div class="recommendations__head">
            Created for you <span class="recommendations__brand">ListenBrainz</span>
          </div>
          <div class="recommendations__state"></div>
          <ul class="recommendations__list"></ul>
        </div>
        <div id="library-rows-root" hidden></div>
        <div id="radio-rows-root" hidden></div>
        <div id="playlists-rows-root" hidden></div>
      </div>
      <div class="audio_visualize">
        <canvas id="visualizer" height="500"></canvas>
        <canvas class="visualizer__webgl" hidden></canvas>
        <div class="station-now" hidden>
          <img class="station-now__icon" alt="" hidden />
          <span class="station-now__icon-empty">&#9834;</span>
          <div class="station-now__name"></div>
          <div class="station-now__tags"></div>
        </div>
        <div class="lyrics" hidden>
          <div class="lyrics__text"></div>
          <div class="lyrics__empty" hidden>No lyrics for this track</div>
        </div>
        <div id="vinyl-root"></div>
        <div id="area-tabs-root"></div>
        <div class="visualizer-controls">
          <button
            class="visualizer-controls__mode"
            type="button"
            title="Toggle MilkDrop visualizer"
          >
            MilkDrop
          </button>
          <button class="visualizer-controls__skip" type="button" title="Next preset" hidden>
            Next
          </button>
        </div>
      </div>
      <div class="progress">
        <div id="seek-root"></div>
        <span class="progress__live" hidden>LIVE</span>
      </div>
      <div class="bar">
        <div class="player-controls">
          <div id="transport-root"></div>
          <div id="nowplaying-root"></div>
          <div id="volume-root"></div>
          <div id="scrobbling-root"></div>
          <div id="equalizer-root"></div>
        </div>
      </div>
    </div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

## Grid layout (from `src/styles/main.css`)

```css
.audio_player {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  display: grid;
  grid-template-columns: 340px 1fr;
  grid-template-rows: 1fr auto auto;
  grid-template-areas:
    "sidebar main"
    "progress progress"
    "transport transport";
}

.playlist {
  grid-area: sidebar;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  background: var(--surface-sunken);
  border-right: 1px solid var(--line);
  min-height: 0;
}

.audio_visualize {
  grid-area: main;
  position: relative;
  min-height: 0;
  overflow: hidden;
  background: var(--surface);
}

.progress {
  grid-area: progress;
  position: relative;
  height: 26px;
  user-select: none;
}

.bar {
  grid-area: transport;
  height: 64px;
  user-select: none;
  /* the one dark region: rescope the generic tokens so every control inside
     picks up light-on-dark without per-component overrides */
  background-color: var(--transport-bg);
  --surface-raised: #2e2b25;
  --surface-hover: #38342c;
  --text: var(--transport-text);
  --text-dim: #a39d8d;
  --line: var(--transport-line);
}

.player-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  padding-left: 15px;
  padding-right: 15px;
  position: relative; /* anchor for popups */
}
```

Region notes:

- Sidebar header `.library__header`: flex-wrap row, search input takes full row (`order: -1; flex: 1 1 100%`), mode buttons on the second row.
- Visualization area hosts one owner at a time: bars canvas / WebGL canvas (VISUALIZER), station card (radio), lyrics overlay, or the vinyl deck. Area tabs top-right, visualizer controls (MilkDrop/Next preset) bottom-right.
- Progress strip: 26px tall, hosts the seek bar island and the waveform canvas (`src/waveform/strip.ts` paints onto `.progress__bar`); "LIVE" badge top-right for radio.
- Transport bar: 64px tall dark strip. Left: transport buttons + time; center: now-playing panel; right: volume, scrobbling trigger + popup, equalizer trigger + popup.

## src/main.tsx (bootstrap and wiring, full)

```tsx
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
window.player = player;
player.volume = 0.1;

initBridge(player);

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

void navigator.storage.persist();

registerSourceStop("library", () => player.stop());
registerSourceStop("radio", stopPlayback);

await initLibrary(player);

render(
  <RadioRows list={document.querySelector<HTMLUListElement>(".library__list")!} />,
  document.querySelector<HTMLDivElement>("#radio-rows-root")!,
);
await initRadio({
  /* element deps: search, emptyHint, modeButton, progress, liveBadge, nowPlaying, getVolume, isMuted */
});

render(
  <PlaylistsRows
    list={document.querySelector<HTMLUListElement>(".library__list")!}
    records={libraryRecords}
  />,
  document.querySelector<HTMLDivElement>("#playlists-rows-root")!,
);
await initPlaylists({/* element deps + player + records */});

initRecommendations({/* container, list, player, records, onSaved */});
initMediaSession(player, libraryMetadata);
initLyrics(player, { currentRecord });
initVisualizer({ player, barsCanvas, webglCanvas, controlsRoot, shouldDraw });
initScrobbling(player, { currentRecord });
initWaveformStrip({ player, progress, getBufferRatio, isRadioActive, currentRecord });

window.appReady = true;
```

## Waveform strip (canvas over the seek bar)

- Source: `src/waveform/strip.ts` + `src/waveform/peaks.ts` + `src/waveform/store.ts`
- Vanilla module (not Preact): computes audio peaks per pixel column from the decoded track, caches them in IndexedDB, and paints the waveform canvas covering the whole `.progress__bar` track. Played portion accent-colored, rest dim; repaints on `track:timeupdate`. Clicks stay owned by the seek slider layered above.
