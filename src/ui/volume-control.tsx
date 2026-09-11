import { useEffect, useRef } from "preact/hooks";
import type AudioPlayer from "../audio-player";
import { setOutputMuted, setOutputVolume } from "../volume";
import { bridge } from "./bridge";
import { VolumeHalfIcon, VolumeIcon, VolumeXIcon } from "./icons";

/** Wheel adjustment: a non-passive listener, small steps, no unmute. */
function useWheelVolume(
  containerRef: { current: HTMLDivElement | null },
  player: AudioPlayer,
): void {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const direction = event.deltaY === 0 ? 0 : -Math.sign(event.deltaY);
      setOutputVolume(player, player.volume + direction * 0.05);
    };
    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, [player]);
}

/**
 * The volume fader (canon): the one fader language - a recessed rail with a
 * primary fill and a raised fader-cap - plus a round mute mech button. An
 * invisible native range input over the rail owns pointer and keyboard
 * interaction (arrows step 5%, Home/End jump to the edges, slider semantics
 * from the platform), so the volume capability's semantics (clamping, steps,
 * wheel, mute independence) are unchanged. Volume applies to the active
 * source through the shared setter.
 */
export function VolumeControl({ player }: { player: AudioPlayer }) {
  const containerRef = useRef<HTMLDivElement>(null);
  useWheelVolume(containerRef, player);
  const muted = bridge.muted.value;
  const volume = bridge.volume.value;
  const percent = Math.round(volume * 100);
  const glyph =
    muted || volume === 0 ? (
      <VolumeXIcon size={20} />
    ) : volume <= 0.5 ? (
      <VolumeHalfIcon size={20} />
    ) : (
      <VolumeIcon size={20} />
    );

  return (
    <div class="player-controls__volume-container" ref={containerRef}>
      <button
        class="mech-button volume__btn"
        type="button"
        aria-label="Mute"
        aria-pressed={muted}
        title={muted ? "Unmute" : "Mute"}
        onClick={() => setOutputMuted(player, !player.muted)}
      >
        {glyph}
      </button>
      <div class="volume__fader fader" data-percent={percent}>
        <div
          class="fader__fill"
          style={{ width: muted ? "0%" : `${percent}%` }}
          aria-hidden="true"
        />
        <div class="fader__cap" style={{ left: `${percent}%` }} aria-hidden="true" />
        <input
          class="slider-input"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          aria-label="Volume"
          onInput={(event) => setOutputVolume(player, Number(event.currentTarget.value))}
        />
      </div>
    </div>
  );
}
