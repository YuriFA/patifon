import "./styles/main.css";
import AudioPlayer from "./audio-player";
import type Analyser from "./analyser";
import { PRESETS } from "./equalizer";
import RangeSlider from "./utils/range-slider";
import { roundedRect } from "./utils";
import { initLibrary } from "./library/ui";

declare global {
  interface Window {
    player: AudioPlayer;
    showDirectoryPicker?: (options?: { mode?: "read" }) => Promise<FileSystemDirectoryHandle>;
  }

  // the async iterator over directory entries is not in lib.dom yet
  interface FileSystemDirectoryHandle {
    values(): AsyncIterableIterator<FileSystemHandle>;
  }
}

const playBtn = document.querySelector<HTMLDivElement>(".player-controls__btn_play")!;

const playNextBtn = document.querySelector<HTMLDivElement>(".player-controls__btn_next")!;
const playPrevBtn = document.querySelector<HTMLDivElement>(".player-controls__btn_prev")!;

const volumeBtn = document.querySelector<HTMLDivElement>(".volume__btn")!;
const volumeSliderNode = document.querySelector<HTMLDivElement>(".volume__slider")!;

const playerBar = document.querySelector<HTMLDivElement>(".bar")!;
const progressBar = document.querySelector<HTMLDivElement>(".progress__bar")!;

const equalizerBtn = document.querySelector<HTMLDivElement>(".player-controls__btn_equalizer")!;
const equalizerPopup = document.querySelector<HTMLDivElement>(".equalizer-popup")!;
const equalizerBands = document.querySelectorAll<HTMLDivElement>(".equalizer-band__slider");
const presetSelect = document.querySelector<HTMLSelectElement>(".equalizer-popup__presets")!;

const visualizerCanvas = document.querySelector<HTMLCanvasElement>("#visualizer")!;
visualizerCanvas.width = document.body.clientWidth;
visualizerCanvas.height = document.body.clientHeight - playerBar.clientHeight;

const player = new AudioPlayer([], { equalizer: true, analyser: true });
// debug/observability handle (also used by e2e to inspect playback state)
window.player = player;
player.volume = 0.1;

// Volume settings
const setVolume = (value: number) => {
  const icon = volumeBtn.children[0];
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
  player.volume = value;
};

const volumeSlider = new RangeSlider(volumeSliderNode, {
  value: player.volume,
  onchange: setVolume,
  onmove: setVolume,
});

volumeBtn.addEventListener("click", (event) => {
  event.preventDefault();
  const icon = volumeBtn.children[0];
  if (player.muted) {
    player.unmute();
    icon.classList.remove("volume__icon_mute");
  } else {
    player.mute();
    icon.classList.add("volume__icon_mute");
  }
});

// Mouse wheel controls the volume
const onwheelUpdateVolume = (event: WheelEvent) => {
  event.preventDefault();
  const direction = event.deltaY === 0 ? 0 : -Math.sign(event.deltaY);
  const newValue = player.volume + direction * 0.05;
  volumeSlider.setValue(newValue);
  setVolume(newValue);
};

volumeBtn.addEventListener("wheel", onwheelUpdateVolume);
volumeSliderNode.addEventListener("wheel", onwheelUpdateVolume);

// Progress settings
const progressSlider = new RangeSlider(progressBar, {
  handle: false,
  buffer: true,
  onchange: (value) => {
    player.rewind(value);
  },
});

const updateBuffer = (event: Event) => {
  const audio = event.target as HTMLAudioElement;
  const buffered = audio.buffered;
  const buffRatio = buffered.length > 0 ? buffered.end(buffered.length - 1) / audio.duration : 0;
  progressSlider.setBuffer(buffRatio);
};

player.on("track:progress", updateBuffer);
player.on("track:loadeddata", updateBuffer);
player.on("track:canplaythrough", updateBuffer);
player.on("track:timeupdate", (event) => {
  const audio = (event as Event).target as HTMLAudioElement;
  const ratio = audio.currentTime / audio.duration;
  progressSlider.setValue(ratio);
});

// Player controls
playBtn.addEventListener("click", () => {
  if (player.isPlaying) {
    playBtn.classList.remove("player-controls__btn_pause");
    player.pause();
  } else {
    playBtn.classList.add("player-controls__btn_pause");
    void player.play();
  }
});

playNextBtn.addEventListener("click", () => {
  playBtn.classList.add("player-controls__btn_pause");
  void player.playNext();
});

playPrevBtn.addEventListener("click", () => {
  playBtn.classList.add("player-controls__btn_pause");
  void player.playPrev();
});

// Equalizer settings
equalizerBtn.addEventListener("click", (event) => {
  event.preventDefault();
  equalizerPopup.classList.toggle("equalizer-popup__open");
});

const bandSliders: RangeSlider[] = [];
equalizerBands.forEach((band, i) => {
  const filterValue = player.getBandGain(i);
  const bandSlider = new RangeSlider(band, {
    vertical: true,
    min: -12,
    max: 12,
    value: filterValue,
    onchange: (value) => {
      player.changeBandGain(i, value);
    },
    onmove: (value) => {
      player.changeBandGain(i, value);
    },
  });
  bandSliders.push(bandSlider);
});

// Preset selector: applies gains to every band and moves the band sliders
for (const preset of PRESETS) {
  const option = document.createElement("option");
  option.value = preset.name;
  option.textContent = preset.name;
  presetSelect.append(option);
}

presetSelect.addEventListener("change", () => {
  const preset = PRESETS.find((p) => p.name === presetSelect.value);
  if (!preset) {
    return;
  }
  player.applyPreset(preset);
  preset.data.forEach((gain, i) => {
    bandSliders[i]?.setValue(gain);
  });
});

// Visualizer
const VISUALIZER_STYLE = {
  columnWidth: 5,
  marginWidth: 5,
  columnRadius: 2,
  sidePadding: 10,
  scale: 2,
  mirrorScale: 0.5,
  minValue: 3,
};

function drawColumns(analyser: Analyser): void {
  const { columnWidth, marginWidth, columnRadius, sidePadding, scale, mirrorScale, minValue } =
    VISUALIZER_STYLE;
  const sectionWidth = columnWidth + marginWidth;
  const { frequencyBinCount: length, minDecibels: minDb, maxDecibels: maxDb } = analyser.analyser;

  const ctx = visualizerCanvas.getContext("2d")!;
  ctx.strokeStyle = "#CE3D60";
  ctx.fillStyle = "#CE3D60";
  ctx.lineJoin = "round";

  const { width, height } = visualizerCanvas;
  const yAxisStart = height / 2;
  const columnCount = (width - sidePadding * 2) / sectionWidth;

  ctx.clearRect(0, 0, width, height);
  analyser.updateData();
  const frequencyData = analyser.fFrequencyData;
  const step = Math.round(length / columnCount);

  for (let i = 0; i < columnCount; i += 1) {
    const frequencyValue = Math.max(minValue, (frequencyData[i * step] - (minDb + maxDb)) * scale);
    roundedRect({
      ctx,
      x: i * sectionWidth + sidePadding,
      y: yAxisStart - frequencyValue,
      width: columnWidth,
      height: frequencyValue * (1 + mirrorScale),
      radius: columnRadius,
      fill: true,
      stroke: true,
    });
  }
}

function visualize(): void {
  const draw = () => {
    // read live: the analyser only exists once the audio graph is built lazily
    const analyser = player.analyser;
    if (player.isPlaying && analyser) {
      drawColumns(analyser);
    }
    requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
}

window.addEventListener("resize", () => {
  visualizerCanvas.width = document.body.clientWidth;
  visualizerCanvas.height = document.body.clientHeight - playerBar.clientHeight;
});

// Library: import, persistence, search - also drives the playlist
await initLibrary(player, playBtn);

visualize();
