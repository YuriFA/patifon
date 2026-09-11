import type AudioPlayer from "../audio-player";
import type { LibraryRecord } from "../library/store";
import { enqueuePeakJob, onWaveformReady } from "./peaks";
import { loadWaveform } from "./store";
import { currentRecord } from "../library/source";
import { getActiveSource, getMode } from "../modes";

export interface WaveformStripDeps {
  player: AudioPlayer;
  /** The strip row (deck__strip): owns the progress_wave/live classes. */
  strip: HTMLElement;
  /** The wave lane (.progress__bar): hosts the strip canvas. */
  lane: HTMLElement;
  /** Buffer ratio (0..1) of the current source, kept up to date by the owner. */
  getBufferRatio(): number;
}

/** Canvas fills cannot read CSS vars: resolve the theme tokens once. */
function themeColor(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

let DIM_COLOR = "#c9c1b0";
let PLAYED_COLOR = "#0f766e";
const BUFFER_COLOR = "rgba(34, 29, 22, 0.12)";

/** Wave amplitude against the lane's half-height (the draft wave is a
 * modest silhouette inside the 40px strip row, not a full-bleed wave). */
const AMPLITUDE = 0.55;

/**
 * The interactive waveform strip: a canvas overlay inside the seek lane.
 * The underlying native range keeps owning pointer events - the strip only
 * mirrors the same ratio (played tint, playhead, buffer overlay), so seek
 * semantics cannot drift between the two. The wave is one continuous,
 * gapless mirrored silhouette (canon): every column touches its neighbor.
 */
let deps: WaveformStripDeps;
let canvas: HTMLCanvasElement;
let context2d: CanvasRenderingContext2D | null = null;
let peaks: number[] | null = null;
let drawnTrackId: string | null = null;
let frameScheduled = false;

export function initWaveformStrip(deps_: WaveformStripDeps): void {
  deps = deps_;
  PLAYED_COLOR = themeColor("--primary", PLAYED_COLOR);
  DIM_COLOR = themeColor("--wave-dim", DIM_COLOR);
  canvas = document.createElement("canvas");
  canvas.className = "progress__wave";
  deps.lane.append(canvas);
  context2d = canvas.getContext("2d");

  deps.player.on("track:play", scheduleUpdate);
  deps.player.on("track:pause", scheduleDraw);
  deps.player.on("track:loadeddata", scheduleUpdate);
  deps.player.on("track:timeupdate", scheduleDraw);
  window.addEventListener("resize", scheduleUpdate);
  onWaveformReady((trackId) => {
    // a lazy backfill finished for the track on air: swap the strip in
    if (trackId === drawnTrackId) {
      void showWaveformFor(currentRecord());
    }
  });
  scheduleUpdate();
}

function scheduleUpdate(): void {
  const record = currentRecord();
  if (getActiveSource() === "radio" || getMode() === "radio" || !record) {
    hide();
    return;
  }
  void showWaveformFor(record);
}

async function showWaveformFor(record: LibraryRecord | null): Promise<void> {
  if (!record) {
    hide();
    return;
  }
  const waveform = await loadWaveform(record.id);
  if (record.id !== (currentRecord()?.id ?? null)) {
    // the player moved on while the record was loading
    return;
  }
  if (!waveform) {
    // legacy track: compute in the background, keep the plain line meanwhile
    hide();
    enqueuePeakJob(record);
    return;
  }
  peaks = waveform.peaks;
  drawnTrackId = record.id;
  resizeCanvas();
  deps.strip.classList.add("progress_wave");
  scheduleDraw();
}

function hide(): void {
  peaks = null;
  drawnTrackId = null;
  deps.strip.classList.remove("progress_wave");
}

function scheduleDraw(): void {
  if (frameScheduled || !peaks) {
    return;
  }
  frameScheduled = true;
  requestAnimationFrame(() => {
    frameScheduled = false;
    draw();
  });
}

function resizeCanvas(): void {
  const { width, height } = deps.lane.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(width * dpr));
  canvas.height = Math.max(1, Math.floor(height * dpr));
  context2d?.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function draw(): void {
  const ctx = context2d;
  if (!ctx || !peaks) {
    return;
  }
  const width = canvas.width / (window.devicePixelRatio || 1);
  const height = canvas.height / (window.devicePixelRatio || 1);
  ctx.clearRect(0, 0, width, height);

  const ratio = playedRatio();
  const playedX = ratio * width;
  const mid = height / 2;
  const amplitude = mid * AMPLITUDE;
  const bucketCount = peaks.length / 2;
  const bufferRatio = deps.getBufferRatio();

  // one continuous mirrored silhouette: per-column top/bottom edges, every
  // column touching its neighbor - no gaps, no separated bars (canon)
  for (let x = 0; x < width; x++) {
    const bucket = Math.min(bucketCount - 1, Math.floor((x / width) * bucketCount));
    const min = peaks[bucket * 2];
    const max = peaks[bucket * 2 + 1];
    const top = mid - max * amplitude;
    const bottom = mid - min * amplitude;
    ctx.fillStyle = x <= playedX ? PLAYED_COLOR : DIM_COLOR;
    ctx.fillRect(x, top, 1, Math.max(1, bottom - top));
  }
  // 2px playhead at the exact ratio with the teal glow (canon)
  ctx.save();
  ctx.shadowColor = "rgba(15, 118, 110, 0.6)";
  ctx.shadowBlur = 6;
  ctx.fillStyle = PLAYED_COLOR;
  ctx.fillRect(Math.min(width - 2, playedX), 2, 2, height - 4);
  ctx.restore();
  if (bufferRatio > 0) {
    ctx.fillStyle = BUFFER_COLOR;
    ctx.fillRect(0, 0, bufferRatio * width, height);
  }
}

function playedRatio(): number {
  const duration = deps.player.duration;
  if (duration <= 0) {
    return 0;
  }
  return Math.min(1, Math.max(0, deps.player.position / duration));
}
