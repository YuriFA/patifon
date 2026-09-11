import type Analyser from "../analyser";
import { roundedRect } from "../utils";

const VISUALIZER_STYLE = {
  columnWidth: 5,
  marginWidth: 5,
  columnRadius: 2,
  sidePadding: 10,
  scale: 2,
  mirrorScale: 0.5,
  minValue: 3,
};

/** Draws one frame of the classic frequency columns onto the 2D canvas. */
export function renderColumns(analyser: Analyser, canvas: HTMLCanvasElement): void {
  const { columnWidth, marginWidth, columnRadius, sidePadding, scale, mirrorScale, minValue } =
    VISUALIZER_STYLE;
  const sectionWidth = columnWidth + marginWidth;
  const { frequencyBinCount: length, minDecibels: minDb, maxDecibels: maxDb } = analyser.analyser;

  const ctx = canvas.getContext("2d")!;
  // canvas fills cannot read CSS vars: resolve the accent token once
  const accent =
    getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() || "#0f766e";
  ctx.strokeStyle = accent;
  ctx.fillStyle = accent;
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

/** Clears the last columns frame: blocked states must not leave a frozen one. */
export function clearColumns(canvas: HTMLCanvasElement): void {
  canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
}
