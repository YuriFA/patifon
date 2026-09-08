import type AudioPlayer from "./audio-player";
import { setRadioMuted, setRadioVolume } from "./radio/playback";
import RangeSlider from "./utils/range-slider";

/** Volume icon reflects the level: muted, half, or full. */
function updateVolumeIcon(button: HTMLDivElement, value: number): void {
  const icon = button.children[0];
  if (value === 0) {
    icon.classList.remove("volume__icon_half");
    icon.classList.add("volume__icon_mute");
  }
  if (value > 0 && value <= 0.5) {
    icon.classList.remove("volume__icon_mute");
    icon.classList.add("volume__icon_half");
  }
  if (value > 0.5) {
    icon.classList.remove("volume__icon_mute", "volume__icon_half");
  }
}

/**
 * Wires the volume slider, the mute button and mouse-wheel control.
 * Volume changes apply to the active source: the library graph and radio.
 */
export function initVolumeControl(player: AudioPlayer): RangeSlider {
  const button = document.querySelector<HTMLDivElement>(".volume__btn")!;
  const sliderNode = document.querySelector<HTMLDivElement>(".volume__slider")!;

  const setVolume = (value: number) => {
    updateVolumeIcon(button, value);
    player.volume = value;
    setRadioVolume(value);
  };

  const volumeSlider = new RangeSlider(sliderNode, {
    value: player.volume,
    onchange: setVolume,
    onmove: setVolume,
  });

  button.addEventListener("click", (event) => {
    event.preventDefault();
    const icon = button.children[0];
    if (player.muted) {
      player.unmute();
      icon.classList.remove("volume__icon_mute");
    } else {
      player.mute();
      icon.classList.add("volume__icon_mute");
    }
    setRadioMuted(player.muted);
  });

  const onwheelUpdateVolume = (event: WheelEvent) => {
    event.preventDefault();
    const direction = event.deltaY === 0 ? 0 : -Math.sign(event.deltaY);
    const newValue = player.volume + direction * 0.05;
    volumeSlider.setValue(newValue);
    setVolume(newValue);
  };
  button.addEventListener("wheel", onwheelUpdateVolume);
  sliderNode.addEventListener("wheel", onwheelUpdateVolume);

  return volumeSlider;
}
