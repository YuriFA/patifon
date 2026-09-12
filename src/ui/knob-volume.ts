import { useEffect } from "preact/hooks";
import type { RefObject } from "preact";
import type AudioPlayer from "../audio-player";
import { setOutputVolume } from "../volume";

/** Arrow-key steps; Home/End jump to the edges. */
const KEY_DELTAS: Record<string, number> = {
  ArrowUp: 0.05,
  ArrowRight: 0.05,
  ArrowDown: -0.05,
  ArrowLeft: -0.05,
};

/** Applies a key-driven volume change; false when the key is not a step. */
function applyKeyVolume(player: AudioPlayer, key: string): boolean {
  if (key === "Home") {
    setOutputVolume(player, 0);
  } else if (key === "End") {
    setOutputVolume(player, 1);
  } else {
    const delta = KEY_DELTAS[key];
    if (delta === undefined) {
      return false;
    }
    setOutputVolume(player, player.volume + delta);
  }
  return true;
}

/**
 * Binds a knob element's pointer drag, wheel and keys to the output volume
 * through the shared setter, so every surface (deck slider, MediaSession,
 * the radio element) follows. The drag reads a vertical delta off a captured
 * pointer; a full muted-to-loud sweep spans about one screen height.
 */
function bindKnobVolume(player: AudioPlayer, knob: HTMLElement): () => void {
  let dragging = false;
  let startY = 0;
  let startVolume = 0;
  const apply = (value: number) => setOutputVolume(player, value);
  const onPointerDown = (event: PointerEvent) => {
    dragging = true;
    startY = event.clientY;
    startVolume = player.volume;
    knob.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent) => {
    if (dragging) {
      apply(startVolume + (startY - event.clientY) / 150);
    }
  };
  const onPointerUp = (event: PointerEvent) => {
    dragging = false;
    if (knob.hasPointerCapture(event.pointerId)) {
      knob.releasePointerCapture(event.pointerId);
    }
  };
  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    const direction = event.deltaY === 0 ? 0 : -Math.sign(event.deltaY);
    apply(player.volume + direction * 0.05);
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (applyKeyVolume(player, event.key)) {
      event.preventDefault();
    }
  };
  knob.addEventListener("pointerdown", onPointerDown);
  knob.addEventListener("pointermove", onPointerMove);
  knob.addEventListener("pointerup", onPointerUp);
  knob.addEventListener("wheel", onWheel, { passive: false });
  knob.addEventListener("keydown", onKeyDown);
  return () => {
    knob.removeEventListener("pointerdown", onPointerDown);
    knob.removeEventListener("pointermove", onPointerMove);
    knob.removeEventListener("pointerup", onPointerUp);
    knob.removeEventListener("wheel", onWheel);
    knob.removeEventListener("keydown", onKeyDown);
  };
}

/** The effect form for components: binds while mounted. */
export function useKnobVolume(player: AudioPlayer, knobRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const knob = knobRef.current;
    return knob ? bindKnobVolume(player, knob) : undefined;
  }, [player, knobRef]);
}
