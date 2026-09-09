import type AudioPlayer from "./audio-player";
import { getActiveSource, onSourceChange } from "./modes";
import { onRadioStateChange, radioState } from "./radio/playback";

/**
 * Single owner of the transport glyph: play/pause is derived from the engaged
 * source's state (library element or station) instead of imperative class
 * flips scattered across wiring.
 */
export function initTransportButton(button: HTMLElement, player: AudioPlayer): void {
  const render = (): void => {
    const playing = getActiveSource() === "radio" ? radioState() === "playing" : player.isPlaying;
    button.classList.toggle("player-controls__btn_pause", playing);
  };
  player.on("track:play", render);
  player.on("track:pause", render);
  onRadioStateChange(render);
  onSourceChange(render);
  render();
}
