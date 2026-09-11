import type AudioPlayer from "./audio-player";
import { setRadioMuted, setRadioVolume } from "./radio/playback";

/**
 * Output volume applies to the active source: the library graph and radio.
 * The reactive volume island and the wheel both route through these setters;
 * state changes reach the UI via the native volumechange event.
 */
export function setOutputVolume(player: AudioPlayer, value: number): void {
  const clamped = Math.min(1, Math.max(0, value));
  player.volume = clamped;
  setRadioVolume(clamped);
}

export function setOutputMuted(player: AudioPlayer, muted: boolean): void {
  if (muted) {
    player.mute();
  } else {
    player.unmute();
  }
  setRadioMuted(player.muted);
}
