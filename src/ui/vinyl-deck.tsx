import { effect } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";
import type { RefObject } from "preact";
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

const ARM_OUTER = 28;
const ARM_INNER = 31.5;

/**
 * Tonearm swing (deg), like a real turntable: the stylus starts on the
 * outer groove and drifts toward the label as the track progresses. Driven
 * by the player's real position, so seeks and track changes move it too.
 */
function armAngle(player: AudioPlayer): number {
  const { duration } = player;
  const progress = duration > 0 ? Math.min(1, Math.max(0, player.position / duration)) : 0;
  return ARM_OUTER + (ARM_INNER - ARM_OUTER) * progress;
}

/**
 * Binds the tonearm's inline swing angle to the player's real position.
 */
function useTonearm(player: AudioPlayer, armRef: RefObject<HTMLDivElement | null>): void {
  useEffect(() => {
    const arm = armRef.current;
    if (!arm) return;
    const syncArm = () => {
      arm.style.transform = `rotate(${armAngle(player)}deg)`;
    };
    syncArm();
    player.on("track:timeupdate", syncArm);
    return () => player.off("track:timeupdate", syncArm);
  }, [player, armRef]);
}

/**
 * Start/stop button styled as the draft's round deck button. Toggles
 * playback exactly like the transport play/pause control.
 */
function DeckControls({ player }: { player: AudioPlayer }) {
  const playing = bridge.playing.value;

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
        class="mech-button vinyl-deck__start"
        aria-label={playing ? "Stop" : "Start"}
        onClick={togglePlayback}
      >
        {playing ? (
          <span class="vinyl-deck__glyph vinyl-deck__glyph_stop" />
        ) : (
          <span class="vinyl-deck__glyph vinyl-deck__glyph_play" />
        )}
      </button>
      <span class="vinyl-deck__power" aria-hidden="true">
        <span class="vinyl-deck__power-led" />
      </span>
    </div>
  );
}

/**
 * The functional pitch fader (draft): a right-edge vertical fader with
 * +8/-8 limits. Writes the player rate; the readout mirrors the bridge so
 * external rate changes stay visible.
 */
function PitchFader({ player }: { player: AudioPlayer }) {
  const pitch = rateToPitch(bridge.playbackRate.value);
  return (
    <div class="vinyl-deck__pitch-group">
      <div class="vinyl-deck__pitch-rail">
        <div class="vinyl-deck__pitch-scale" aria-hidden="true">
          <span>+8</span>
          <span>0</span>
          <span>-8</span>
        </div>
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
      </div>
      <output class="vinyl-deck__pitch-value">{formatPitch(pitch)}</output>
    </div>
  );
}

/** The swing assembly plus its static bearing circle (draft geometry). */
function Tonearm({ armRef }: { armRef: RefObject<HTMLDivElement> }) {
  return (
    <>
      {/* The whole assembly swings around the pivot point (outer groove
          -> label); the bearing circle sits statically on top. */}
      <div ref={armRef} class="vinyl-deck__tonearm">
        <div class="vinyl-deck__arm-weight" />
        <div class="vinyl-deck__arm" />
        <div class="vinyl-deck__head">
          <span class="vinyl-deck__cartridge" />
        </div>
      </div>
      <div class="vinyl-deck__arm-pivot" />
    </>
  );
}

/**
 * The VINYL mode's turntable deck (draft): plinth, rotating platter, tonearm,
 * start/stop and a functional pitch fader. DOM/CSS only - no canvas, no
 * WebGL2 - and it owns the area whenever the VINYL tab is active, except
 * while radio owns the transport.
 */
export function VinylDeck({ player }: { player: AudioPlayer }) {
  const deckRef = useRef<HTMLDivElement>(null);
  const armRef = useRef<HTMLDivElement>(null);
  useTonearm(player, armRef);

  useEffect(() => {
    const sync = () => {
      const deck = deckRef.current;
      if (deck) {
        // Radio owns the area and clears the deck; an idle deck stays put
        // (platter still, arm at rest) so the VINYL tab never looks empty.
        deck.hidden = areaMode.value !== "vinyl" || bridge.source.value === "radio";
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
          <div class="vinyl-deck__rim" />
          <div class="vinyl-deck__platter">
            <div class="vinyl-deck__label">
              <span class="vinyl-deck__label-stereo">STEREO</span>
              <span class="vinyl-deck__label-rpm">33⅓ RPM</span>
              <span class="vinyl-deck__hole" />
            </div>
          </div>
        </div>
        <Tonearm armRef={armRef} />
        <DeckControls player={player} />
        <PitchFader player={player} />
      </div>
    </div>
  );
}
