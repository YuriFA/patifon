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
 * The volume island: mute toggle, slider and wheel adjustment. The slider is
 * a native range input layered invisibly over the styled track: keyboard,
 * pointer and assistive-tech semantics come from the platform. Volume applies
 * to the active source (library graph and radio) through the shared setters.
 */
export function VolumeControl({ player }: { player: AudioPlayer }) {
  const containerRef = useRef<HTMLDivElement>(null);
  useWheelVolume(containerRef, player);
  const muted = bridge.muted.value;
  const volume = bridge.volume.value;
  const percent = volume * 100;

  return (
    <div class="player-controls__volume-container" ref={containerRef}>
      <button
        class="volume__btn"
        type="button"
        title={muted ? "Unmute" : "Mute"}
        aria-label={muted ? "Unmute" : "Mute"}
        aria-pressed={muted}
        onClick={() => setOutputMuted(player, !player.muted)}
      >
        <VolumeGlyph level={volume} muted={muted} />
      </button>
      <div class="volume__control">
        <div class="volume__slider">
          <div class="slider-horiz__track" aria-hidden="true">
            <div class="slider-horiz__filled" style={{ width: `${percent}%` }} />
            <div class="slider-horiz__handle" style={{ left: `${percent}%` }} />
          </div>
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
    </div>
  );
}
