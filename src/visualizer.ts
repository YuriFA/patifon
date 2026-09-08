import type Analyser from "./analyser";
import type AudioPlayer from "./audio-player";
import { roundedRect } from "./utils";

const VISUALIZER_STYLE = {
  columnWidth: 5,
  marginWidth: 5,
  columnRadius: 2,
  sidePadding: 10,
  scale: 2,
  mirrorScale: 0.5,
  minValue: 3,
};

function drawColumns(analyser: Analyser, canvas: HTMLCanvasElement): void {
  const { columnWidth, marginWidth, columnRadius, sidePadding, scale, mirrorScale, minValue } =
    VISUALIZER_STYLE;
  const sectionWidth = columnWidth + marginWidth;
  const { frequencyBinCount: length, minDecibels: minDb, maxDecibels: maxDb } = analyser.analyser;

  const ctx = canvas.getContext("2d")!;
  ctx.strokeStyle = "#CE3D60";
  ctx.fillStyle = "#CE3D60";
  ctx.lineJoin = "round";

  const { width, height } = canvas;
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

/**
 * Mirrors the library playback on the canvas: columns while a track plays,
 * cleared while nothing plays. Radio bypasses the Web Audio graph (cross-origin
 * streams are silent through a MediaElementSource), so a radio takeover just
 * clears the last library frame.
 */
export function startVisualizer(player: AudioPlayer, canvas: HTMLCanvasElement): void {
  let wasDrawing = false;

  const draw = () => {
    // read live: the analyser only exists once the audio graph is built lazily
    const analyser = player.analyser;
    if (player.isPlaying && analyser) {
      drawColumns(analyser, canvas);
      wasDrawing = true;
    } else if (wasDrawing) {
      canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
      wasDrawing = false;
    }
    requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);

  window.addEventListener("resize", () => {
    canvas.width = document.body.clientWidth;
    canvas.height = document.body.clientHeight;
  });
}
