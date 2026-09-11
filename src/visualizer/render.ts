import type { SpectrumFrame, SpectrumStyle } from "./spectrum";

/**
 * The two spectrum renderers (LCD matrix, LED ladder) and the transport's
 * mini meter, drawn from the shared pipeline's frames. Colors are the Warm
 * Earth tokens the approved prototypes used: --primary, --accent-tint,
 * --vinyl and --fg; canvas fills cannot read CSS vars, so they live here as
 * literals mirroring main.css.
 */

const COLORS = {
  primary: "#0f766e",
  accentTint: "#d9efec",
  vinyl: "#1a1a1a",
  charcoal: "#221d16",
  ghostDark: "#333333",
} as const;

const STAGE = { pad: 40, colGap: 4, minColumnWidth: 12 };
const LED = { cellHeight: 5, cellGap: 2 };
const LCD = { cellHeight: 6, cellGap: 2, scanline: "rgba(15, 118, 110, 0.04)" };
const MINI = { pad: 3, colWidth: 3, colGap: 1, cellHeight: 3, cellGap: 1, windowRadius: 4 };

interface StageGrid {
  pad: number;
  cols: number;
  colWidth: number;
  rows: number;
  cellHeight: number;
  cellGap: number;
  colGap: number;
}

/** Per-style cell painting: unlit ghost, lit cell (top of the stack glows), peak marker. */
interface CellPalette {
  ghost(ctx: CanvasRenderingContext2D): void;
  lit(ctx: CanvasRenderingContext2D, top: boolean): void;
  peak(ctx: CanvasRenderingContext2D): void;
}

const LED_PALETTE: CellPalette = {
  ghost(ctx) {
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = COLORS.ghostDark;
  },
  lit(ctx, top) {
    ctx.globalAlpha = top ? 1 : 0.85;
    ctx.fillStyle = COLORS.primary;
    if (top) {
      ctx.shadowColor = COLORS.primary;
      ctx.shadowBlur = 6;
    }
  },
  peak(ctx) {
    ctx.globalAlpha = 1;
    ctx.fillStyle = COLORS.accentTint;
    ctx.shadowColor = "rgba(217, 239, 236, 0.6)";
    ctx.shadowBlur = 4;
  },
};

const LCD_PALETTE: CellPalette = {
  ghost(ctx) {
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = COLORS.charcoal;
  },
  lit(ctx, top) {
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = COLORS.primary;
    if (top) {
      ctx.shadowColor = "rgba(15, 118, 110, 0.4)";
      ctx.shadowBlur = 4;
    }
  },
  peak(ctx) {
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = COLORS.charcoal;
  },
};

/** Odd column count for the given width: one true center column, edge to edge. */
export function columnsForWidth(width: number): number {
  const usable = Math.max(STAGE.minColumnWidth, width - STAGE.pad * 2);
  const sections = Math.floor((usable + STAGE.colGap) / (STAGE.minColumnWidth + STAGE.colGap));
  const cols = Math.max(9, sections);
  return cols % 2 === 0 ? cols - 1 : cols;
}

/** Draws one spectrum frame onto the visualization area's 2D canvas. */
export function renderSpectrum(
  canvas: HTMLCanvasElement,
  frame: SpectrumFrame,
  style: SpectrumStyle,
): void {
  const ctx = canvas.getContext("2d")!;
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  drawWindow(ctx, width, height, style);
  const grid = stageGrid(width, height, style);
  const cols = Math.min(grid.cols, frame.levels.length);
  for (let i = 0; i < cols; i++) {
    drawColumn(ctx, grid, height, i, frame.levels[i], frame.peaks[i], style);
  }
  if (style === "lcd") {
    // the LCD screen's scanline material (token --texture-scanlines)
    ctx.globalAlpha = 1;
    ctx.fillStyle = LCD.scanline;
    for (let y = 0; y < height; y += 2) {
      ctx.fillRect(0, y, width, 1);
    }
  }
}

/** Clears the last frame: blocked states must not leave a frozen one. */
export function clearSpectrum(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d")!;
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

/** The transport's mini meter: the selected style in a 44x28 window. */
export function renderMiniMeter(
  canvas: HTMLCanvasElement,
  frame: SpectrumFrame,
  style: SpectrumStyle,
): void {
  const ctx = canvas.getContext("2d")!;
  const { width, height } = canvas;
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.clearRect(0, 0, width, height);

  ctx.beginPath();
  ctx.roundRect(0.5, 0.5, width - 1, height - 1, MINI.windowRadius);
  ctx.fillStyle = style === "led" ? COLORS.vinyl : COLORS.accentTint;
  ctx.fill();

  const cols = Math.min(9, frame.levels.length);
  const span = cols * MINI.colWidth + (cols - 1) * MINI.colGap;
  const x0 = Math.round((width - span) / 2);
  for (let i = 0; i < cols; i++) {
    const x = x0 + i * (MINI.colWidth + MINI.colGap);
    if (style === "led") {
      drawMiniBar(ctx, height, x, frame.levels[i]);
    } else {
      drawMiniCells(ctx, height, x, frame.levels[i], frame.peaks[i]);
    }
  }
  ctx.globalAlpha = 1;
}

function stageGrid(width: number, height: number, style: SpectrumStyle): StageGrid {
  const cell = style === "led" ? LED : LCD;
  const cols = columnsForWidth(width);
  const colWidth = Math.floor((width - STAGE.pad * 2 - (cols - 1) * STAGE.colGap) / cols);
  const rows = Math.max(
    4,
    Math.floor((height - STAGE.pad * 2 + cell.cellGap) / (cell.cellHeight + cell.cellGap)),
  );
  return { ...STAGE, cols, colWidth, rows, ...cell };
}

/** The style's screen material: LED is a vinyl-dark recessed window, LCD light glass. */
function drawWindow(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  style: SpectrumStyle,
): void {
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.fillStyle = style === "led" ? COLORS.vinyl : COLORS.accentTint;
  ctx.fillRect(0, 0, width, height);
  if (style !== "led") {
    return;
  }
  const reach = Math.max(width, height) * 0.75;
  const vignette = ctx.createRadialGradient(
    width / 2,
    height / 2,
    reach * 0.45,
    width / 2,
    height / 2,
    reach,
  );
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.45)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}

function drawColumn(
  ctx: CanvasRenderingContext2D,
  grid: StageGrid,
  height: number,
  index: number,
  level: number,
  peak: number,
  style: SpectrumStyle,
): void {
  const { pad, colWidth, rows, cellHeight, cellGap, colGap } = grid;
  const palette = style === "led" ? LED_PALETTE : LCD_PALETTE;
  const x = pad + index * (colWidth + colGap);
  const lit = Math.round(level * rows);
  const peakRow = Math.min(rows - 1, Math.round(peak * rows));
  for (let row = 0; row < rows; row++) {
    const y = height - pad - (row + 1) * cellHeight - row * cellGap;
    if (row === peakRow && row >= lit) {
      palette.peak(ctx);
    } else if (row < lit) {
      palette.lit(ctx, row === lit - 1);
    } else {
      palette.ghost(ctx);
    }
    ctx.fillRect(x, y, colWidth, cellHeight);
    ctx.shadowBlur = 0;
  }
}

/** The mini LED: solid teal bars, no segments at this size. */
function drawMiniBar(
  ctx: CanvasRenderingContext2D,
  height: number,
  x: number,
  level: number,
): void {
  const innerHeight = height - MINI.pad * 2;
  const barHeight = Math.round(level * innerHeight);
  if (barHeight <= 0) {
    return;
  }
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = COLORS.primary;
  ctx.fillRect(x, MINI.pad + innerHeight - barHeight, MINI.colWidth, barHeight);
}

/** The mini LCD: the same cell language scaled down to 3px cells. */
function drawMiniCells(
  ctx: CanvasRenderingContext2D,
  height: number,
  x: number,
  level: number,
  peak: number,
): void {
  const innerHeight = height - MINI.pad * 2;
  const rows = Math.floor((innerHeight + MINI.cellGap) / (MINI.cellHeight + MINI.cellGap));
  const lit = Math.round(level * rows);
  const peakRow = Math.min(rows - 1, Math.round(peak * rows));
  for (let row = 0; row < rows; row++) {
    const y = height - MINI.pad - (row + 1) * MINI.cellHeight - row * MINI.cellGap;
    if (row === peakRow && row >= lit) {
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = COLORS.charcoal;
    } else if (row < lit) {
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = COLORS.primary;
    } else {
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = COLORS.charcoal;
    }
    ctx.fillRect(x, y, MINI.colWidth, MINI.cellHeight);
  }
}
