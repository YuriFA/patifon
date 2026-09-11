# Shared UI Components (Preact islands)

Framework: Preact 10 + @preact/signals, TypeScript strict, Vite 8. No component library - all UI is hand-rolled islands in `src/ui/*.tsx`, mounted by `src/main.tsx` into fixed roots declared in `index.html`.

Architecture pattern ("islands + bridge"):

- Vanilla playback core (`src/audio-player.ts`) emits typed `track:*` events.
- `src/ui/bridge.ts` subscribes core events and writes Preact signals; components read signals and call player/radio methods. No playback logic lives in components.
- Feature modules (`src/<feature>/ui.ts`) still mutate some shared DOM directly; islands rendering into the same nodes coordinate through ownership checks (`bridge.mode.value`).

## SidebarHeader

- Source: `src/ui/sidebar-header.tsx`
- Renders exactly once at boot: mode toggle buttons (Playlists, Radio), search input, Add files buttons. Radio/playlists modules keep mutating these elements directly, so the island must never re-render over them.

```tsx
import { getMode, routeSearch, setMode } from "../modes";

export function SidebarHeader() {
  return (
    <>
      <button class="playlists__back" type="button" hidden>
        All playlists
      </button>
      <button
        class="library__mode-playlists"
        type="button"
        title="Toggle playlists view"
        onClick={() => setMode(getMode() === "playlists" ? "library" : "playlists")}
      >
        Playlists
      </button>
      <button
        class="library__mode"
        type="button"
        title="Toggle radio mode"
        onClick={() => setMode(getMode() === "radio" ? "library" : "radio")}
      >
        Radio
      </button>
      <input
        class="library__search"
        type="search"
        placeholder="Search library"
        autocomplete="off"
        onInput={(event) => routeSearch(event.currentTarget.value)}
      />
      <button class="library__add" type="button">
        Add files
      </button>
      <button class="library__add-dir" type="button" hidden>
        Add folder
      </button>
      <button class="playlists__new" type="button" hidden>
        New playlist
      </button>
      <input class="library__file-input" type="file" multiple accept="audio/*" hidden />
    </>
  );
}
```

## SeekBar (progress strip)

- Source: `src/ui/seek-bar.tsx`
- Native range input layered invisibly over a styled track. The waveform strip canvas (`src/waveform/strip.ts`, vanilla) paints visuals onto the same track. Disabled for live radio sources.

```tsx
import type AudioPlayer from "../audio-player";
import { bridge } from "./bridge";

export function SeekBar({ player }: { player: AudioPlayer }) {
  const duration = bridge.duration.value;
  const seekable = duration > 0;
  const ratio = seekable ? bridge.position.value / duration : 0;
  const percent = ratio * 100;

  return (
    <div class="progress__bar">
      <div class="slider-horiz__track" aria-hidden="true" />
      <div class="slider-horiz__buffer" style={{ width: `${bridge.buffered.value * 100}%` }} />
      <div class="slider-horiz__filled" style={{ width: `${percent}%` }} />
      <div class="slider-horiz__handle" style={{ left: `${percent}%` }} />
      <input
        class="slider-input"
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={ratio}
        disabled={!seekable}
        aria-label="Seek"
        onInput={(event) => player.rewind(Number(event.currentTarget.value))}
      />
    </div>
  );
}
```

## VolumeControl (rotary knob - pending redesign to slider)

- Source: `src/ui/volume-control.tsx`
- Currently a rotary knob (Warm Earth draft phase 3): pointer drag maps angle onto 0..1 over a 270-degree arc; keyboard steps; wheel adjusts over the whole container; mute button with volume glyph. Volume applies through the shared `setOutputVolume`/`setOutputMuted` setters.
- KNOWN UPCOMING CHANGE: the owner wants this replaced by a web-friendly horizontal slider.

```tsx
import { useEffect, useRef } from "preact/hooks";
import type AudioPlayer from "../audio-player";
import { setOutputMuted, setOutputVolume } from "../volume";
import { bridge } from "./bridge";

function VolumeGlyph({ level, muted }: { level: number; muted: boolean }) {
  const cls =
    muted || level === 0 ? " volume__icon_mute" : level <= 0.5 ? " volume__icon_half" : "";
  return (
    <svg class={`volume__icon${cls}`} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 9v6h4l5 4V5L7 9H3z" fill="currentColor" />
      {muted || level === 0 ? (
        <path d="M15.5 9.5l5 5m0-5l-5 5" stroke="currentColor" stroke-width="2" />
      ) : (
        <path
          d="M15.5 8.5a5 5 0 010 7m2.5-9.5a8 8 0 010 12"
          stroke="currentColor"
          stroke-width="2"
          fill="none"
        />
      )}
    </svg>
  );
}

function useWheelVolume(containerRef, player): void {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const direction = event.deltaY === 0 ? 0 : -Math.sign(event.deltaY);
      setOutputVolume(player, player.volume + direction * 0.05);
    };
    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, [player]);
}

const ARC_DEGREES = 270;
const KEY_STEP = 0.05;

export function VolumeControl({ player }: { player: AudioPlayer }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  useWheelVolume(containerRef, player);
  const muted = bridge.muted.value;
  const volume = bridge.volume.value;
  const percent = Math.round(volume * 100);
  const angle = volume * ARC_DEGREES - ARC_DEGREES / 2;

  return (
    <div class="player-controls__volume-container" ref={containerRef}>
      <button
        class="volume__btn"
        aria-pressed={muted}
        onClick={() => setOutputMuted(player, !player.muted)}
      >
        <VolumeGlyph level={volume} muted={muted} />
      </button>
      <div class="volume__control">
        <div
          ref={knobRef}
          class="volume__knob"
          role="slider"
          tabindex={0}
          aria-label="Volume"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div class="volume__knob-body" aria-hidden="true">
            <div class="volume__knob-indicator" style={{ transform: `rotate(${angle}deg)` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
```

(Pointer/keyboard knob actions `knobValueFromPoint` / `useKnobActions` live in the same file; they disappear with the knob.)

## TransportControls

- Source: `src/ui/transport-controls.tsx`
- Prev / play-pause / next buttons + "m:ss / m:ss" time readout. Glyphs are inline SVG (currentColor). Radio engaged: prev/next disabled; play routes to station toggle.

```tsx
export function TransportControls({ player }: { player: AudioPlayer }) {
  const playing = bridge.playing.value;
  const radioEngaged = bridge.source.value === "radio";

  const togglePlay = () => {
    if (isStationEngaged()) {
      toggleStationPlayback();
      return;
    }
    if (player.isPlaying) {
      player.pause();
    } else {
      void player.play();
    }
  };
  const step = (method: "playPrev" | "playNext") => () => {
    if (!radioEngaged) void player[method]();
  };

  return (
    <>
      <TransportButton
        className="player-controls__btn_prev"
        title="Previous track"
        onClick={step("playPrev")}
        disabled={radioEngaged}
      >
        <PrevGlyph />
      </TransportButton>
      <TransportButton
        className={`player-controls__btn_play${playing ? " player-controls__btn_pause" : ""}`}
        title={playing ? "Pause" : "Play"}
        onClick={togglePlay}
      >
        {playing ? <PauseGlyph /> : <PlayGlyph />}
      </TransportButton>
      <TransportButton
        className="player-controls__btn_next"
        title="Next track"
        onClick={step("playNext")}
        disabled={radioEngaged}
      >
        <NextGlyph />
      </TransportButton>
      <TimeReadout />
    </>
  );
}
```

(`TransportButton` renders `button.player-controls__btn.<className>` with `aria-disabled`; `TimeReadout` renders `span.player-controls__time` with `{position} / {duration}`, hidden when duration is 0.)

## NowPlaying

- Source: `src/ui/now-playing.tsx`
- Transport panel: "NOW PLAYING" eyebrow label, "Title - Artist" line, and a tiny live VU meter canvas fed by the shared analyser (16 bars, 44x22 px). Renders nothing when no library track is loaded (radio keeps its station card).

```tsx
export function NowPlaying({ player }: { player: AudioPlayer }) {
  const title = bridge.trackTitle.value;
  if (!title) return null;
  const artist = bridge.trackArtist.value;

  return (
    <div class="now-playing">
      <div class="now-playing__meta">
        <span class="now-playing__label">Now playing</span>
        <span class="now-playing__track">{artist ? `${title} - ${artist}` : title}</span>
      </div>
      <NowPlayingMeter player={player} />
    </div>
  );
}
```

## AreaTabs

- Source: `src/ui/area-tabs.tsx`
- Visualization area mode switcher, top-right: LYRICS / VINYL / VISUALIZER buttons with `aria-pressed`.

```tsx
import { AreaMode, areaMode, setAreaMode } from "../visualizer/area-mode";

const TABS: Array<{ mode: AreaMode; label: string }> = [
  { mode: "lyrics", label: "Lyrics" },
  { mode: "vinyl", label: "Vinyl" },
  { mode: "visualizer", label: "Visualizer" },
];

export function AreaTabs() {
  return (
    <div class="area-tabs" role="group" aria-label="Visualization mode">
      {TABS.map(({ mode, label }) => (
        <button
          key={mode}
          type="button"
          class="area-tabs__tab"
          aria-pressed={areaMode.value === mode}
          onClick={() => setAreaMode(mode)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
```

## VinylDeck

- Source: `src/ui/vinyl-deck.tsx` (full file, 164 lines)
- VINYL mode centerpiece: turntable deck card. Plinth with 4 corner screws, rotating platter (CSS animation gated by `.vinyl-deck_playing`), mint center label ("STEREO / 33 1/3 RPM / hole"), tonearm whose swing angle tracks real playback position (18deg outer groove -> 30deg at label), round start/stop deck button, vertical pitch fader (+8..-8 writes `player.playbackRate`, mono readout). DOM/CSS only, no canvas. Hidden unless `areaMode === "vinyl"` and radio does not own the transport.

Key structure:

```tsx
return (
  <div ref={deckRef} class="vinyl-deck">
    <div class="vinyl-deck__plinth" aria-label="Turntable">
      <span class="vinyl-deck__screw vinyl-deck__screw_tl" />
      <span class="vinyl-deck__screw vinyl-deck__screw_bl" />
      <span class="vinyl-deck__screw vinyl-deck__screw_br" />
      <div class="vinyl-deck__platter-wrap">
        <div class="vinyl-deck__rim" />
        <div class="vinyl-deck__platter">
          <div class="vinyl-deck__label">
            <span class="vinyl-deck__label-stereo">STEREO</span>
            <span class="vinyl-deck__label-rpm">33&#8531; RPM</span>
            <span class="vinyl-deck__hole" />
          </div>
        </div>
      </div>
      <div ref={armRef} class="vinyl-deck__tonearm">
        <div class="vinyl-deck__arm-post" />
        <div class="vinyl-deck__arm-pivot" />
        <div class="vinyl-deck__arm" />
        <div class="vinyl-deck__head" />
      </div>
      <DeckControls player={player} />
      <PitchFader player={player} />
    </div>
  </div>
);
```

## usePopup (popup behavior hook)

- Source: `src/ui/popup.ts`
- Toggle behavior shared by the transport popups: button toggles, `aria-expanded` reports state, Escape and outside pointer-down close, opening one popup closes the others.

```ts
export function usePopup() {
  // containerRef must wrap both the trigger button and the popup panel
  // returns { containerRef, open, toggle, openPopup, close }
}
```

## ScrobblingPopup

- Source: `src/ui/scrobbling-popup.tsx` (full file, 228 lines)
- ListenBrainz connect panel above the SCROBBLING trigger: token password input + Connect button, Enabled checkbox, Disconnect, status line ("Connected to ListenBrainz" / "Scrobbling paused" / token hint), retry-queue hint ("N listen(s) waiting to submit"). Trigger button shows active state via `.scrobbling-on`.

## EqualizerPopup

- Source: `src/ui/equalizer-popup.tsx` (full file, 131 lines)
- Ten vertical band sliders (60 Hz .. 16 kHz, -12..+12 dB) + preset `<select>` ("Flat" + named presets). Each band: styled vertical slider (`slider-vert` classes) over an invisible native range input, dB label below, dB legend column at the left. Panel opens above the EQ trigger.

## RecommendationsState

- Source: `src/ui/recommendations-state.tsx`
- State line inside the sidebar recommendations section: loading / connect prompt / error + retry button (`recommendations__connect`).

## LibraryRows (sidebar rows, library mode)

- Source: `src/ui/library-view.tsx` (full file, 122 lines)
- Portal into the shared persistent `.library__list` element; owns it exactly while `bridge.mode === "library"`. Row: 32px artwork thumb (or music-note placeholder), title/artist line, duration, hover-revealed actions (add-to-playlist, play-next via imperative vanilla buttons mounted into the row).

Row markup:

```tsx
<li class={cls} data-id={row.record.id} tabIndex={0} onClick={activate}>
  <img class="library__thumb" src={row.artworkUrl} alt="" /> /* or
  span.library__thumb.library__thumb_empty with "♪" */
  <div class="library__meta" title={row.title}>
    {row.label}
  </div>
  <span class="library__duration">{row.duration}</span>
  <RowActions record={row.record} />
</li>
```

States: `.library__row_playing` (raised bg + accent left border), `.library__row_queued` (adds a "queued" tag via CSS `::after`).

## RadioRows (sidebar rows, radio mode)

- Source: `src/ui/radio-view.tsx` (full file, 118 lines)
- Same shared list, owned while radio mode is active. Station row: favicon thumb (or "♪"), station name, save star button (`radio__star`, `radio__star_saved`), bitrate ("128 kbps"). Error state: `.radio__row_error` dims the row and shows "unavailable".

## PlaylistsRows (sidebar rows, playlists mode)

- Source: `src/ui/playlists-view.tsx` (full file, 230 lines)
- Index view: one row per playlist (thumb, name, play/rename/delete glyph buttons, "N tracks"). Open playlist: track rows with move-up/move-down/remove buttons and inline rename (`startInlineRename` swaps the meta line for an input).

## Bridge (signals the components read)

- Source: `src/ui/bridge.ts`
- `position`, `duration`, `buffered`, `playing`, `source` ("library" | "radio" | null), `radioState`, `volume`, `muted`, `mode` ("library" | "playlists" | "radio"), `playbackRate`, `trackTitle`, `trackArtist`.
