import { effect } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";
import type AudioPlayer from "../audio-player";
import { bridge } from "./bridge";
import { areaMode } from "../visualizer/area-mode";

/** Linear pitch mapping: display -8..+8 to rate 0.5..2 (0 = normal). */
function pitchToRate(pitch: number): number {
  return 1 + pitch * 0.0625;
}

function rateToPitch(rate: number): number {
  return Math.round((rate - 1) / 0.0625);
}

function formatPitch(pitch: number): string {
  return pitch > 0 ? `+${pitch}` : String(pitch);
}

/**
 * Start/stop plus the functional pitch fader (draft): the deck's control
 * surface. The fader writes the player rate; the value readout mirrors the
 * bridge so external rate changes stay visible.
 */
function DeckControls({ player }: { player: AudioPlayer }) {
  const playing = bridge.playing.value;
  const pitch = rateToPitch(bridge.playbackRate.value);

  const togglePlayback = () => {
    if (player.isPlaying) {
      player.pause();
    } else {
      void player.play();
    }
  };

  return (
    <div class="vinyl-deck__controls">
      <button
        type="button"
        class="vinyl-deck__start"
        aria-label={playing ? "Stop" : "Start"}
        onClick={togglePlayback}
      >
        {playing ? "■" : "▶"}
      </button>
      <input
        type="range"
        class="vinyl-deck__pitch"
        min={-8}
        max={8}
        step={1}
        defaultValue={pitch}
        aria-label="Pitch"
        onInput={(event) => {
          player.playbackRate = pitchToRate(Number(event.currentTarget.value));
        }}
      />
      <output class="vinyl-deck__pitch-value">{formatPitch(pitch)}</output>
    </div>
  );
}

/**
 * The VINYL mode's turntable deck (draft): plinth, rotating platter, tonearm,
 * start/stop and a functional pitch fader. DOM/CSS only - no canvas, no
 * WebGL2 - and it owns the area exactly while the VINYL tab is active with a
 * library source engaged; radio and idle states clear it per spec.
 */
export function VinylDeck({ player }: { player: AudioPlayer }) {
  const deckRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sync = () => {
      const deck = deckRef.current;
      if (deck) {
        deck.hidden = areaMode.value !== "vinyl" || bridge.source.value !== "library";
        deck.classList.toggle("vinyl-deck_playing", bridge.playing.value);
      }
    };
    sync();
    return effect(sync);
  }, []);

  return (
    <div ref={deckRef} class="vinyl-deck">
      <div class="vinyl-deck__plinth" aria-label="Turntable">
        <span class="vinyl-deck__screw vinyl-deck__screw_tl" />
        <span class="vinyl-deck__screw vinyl-deck__screw_tr" />
        <span class="vinyl-deck__screw vinyl-deck__screw_bl" />
        <span class="vinyl-deck__screw vinyl-deck__screw_br" />
        <div class="vinyl-deck__platter-wrap">
          <div class="vinyl-deck__platter">
            <div class="vinyl-deck__label">
              <div class="vinyl-deck__label-text" />
            </div>
          </div>
        </div>
        <div class="vinyl-deck__tonearm">
          <div class="vinyl-deck__arm-base" />
          <div class="vinyl-deck__arm" />
          <div class="vinyl-deck__head" />
        </div>
        <DeckControls player={player} />
      </div>
    </div>
  );
}
