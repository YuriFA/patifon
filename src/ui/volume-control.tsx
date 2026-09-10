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

const ARC_DEGREES = 270;

/**
 * Maps a pointer position onto the knob's value (0..1): the angle from the
 * knob's center is clamped to the 270-degree arc, 0 pointing up. Pure for
 * testability.
 */
export function knobValueFromPoint(
  point: { x: number; y: number },
  center: { x: number; y: number },
): number {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  const angle = Math.atan2(dx, -dy) * (180 / Math.PI);
  const clamped = Math.max(-ARC_DEGREES / 2, Math.min(ARC_DEGREES / 2, angle));
  return (clamped + ARC_DEGREES / 2) / ARC_DEGREES;
}

const KEY_STEP = 0.05;

/**
 * Pointer and keyboard actions for the knob: drag maps the pointer angle
 * onto the 0..1 range; keys step by KEY_STEP, Home/End jump to the edges.
 */
function useKnobActions(player: AudioPlayer, knobRef: { current: HTMLDivElement | null }) {
  const dragTo = (event: PointerEvent) => {
    const knob = knobRef.current;
    if (!knob) {
      return;
    }
    const box = knob.getBoundingClientRect();
    const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    setOutputVolume(player, knobValueFromPoint(event, center));
  };

  const onPointerDown = (event: PointerEvent) => {
    event.preventDefault();
    dragTo(event);
    const onMove = (move: PointerEvent) => dragTo(move);
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const deltas: Record<string, number> = {
      ArrowUp: KEY_STEP,
      ArrowRight: KEY_STEP,
      ArrowDown: -KEY_STEP,
      ArrowLeft: -KEY_STEP,
    };
    if (event.key in deltas) {
      event.preventDefault();
      setOutputVolume(player, player.volume + deltas[event.key]);
    } else if (event.key === "Home") {
      event.preventDefault();
      setOutputVolume(player, 0);
    } else if (event.key === "End") {
      event.preventDefault();
      setOutputVolume(player, 1);
    }
  };

  return { onPointerDown, onKeyDown };
}

/**
 * The rotary volume knob (Warm Earth draft): a slider-role widget replacing
 * the linear slider. Pointer drag maps the angle onto the 0..1 range; the
 * keyboard, wheel, mute and clamping semantics of the volume capability are
 * unchanged. Volume applies to the active source through the shared setter.
 */
export function VolumeControl({ player }: { player: AudioPlayer }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  useWheelVolume(containerRef, player);
  const { onPointerDown, onKeyDown } = useKnobActions(player, knobRef);
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
          onPointerDown={onPointerDown}
          onKeyDown={onKeyDown}
        >
          <div class="volume__knob-body" aria-hidden="true">
            <div class="volume__knob-indicator" style={{ transform: `rotate(${angle}deg)` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
