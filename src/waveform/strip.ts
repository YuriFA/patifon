import type AudioPlayer from "../audio-player";
import type { LibraryRecord } from "../library/store";
import { enqueuePeakJob, onWaveformReady } from "./peaks";
import { loadWaveform } from "./store";

export interface WaveformStripDeps {
  player: AudioPlayer;
  /** The .progress container: hosts the strip canvas. */
  progress: HTMLElement;
  /** Buffer ratio (0..1) of the current source, kept up to date by the owner. */
  getBufferRatio(): number;
  /** True while a radio station owns the transport (live streams have no wave). */
  isRadioActive(): boolean;
  /** The library record at the player's current index, or null. */
  currentRecord(): LibraryRecord | null;
}

const DIM_COLOR = "#6b7280";
const PLAYED_COLOR = "#e33d3d";
const BUFFER_COLOR = "rgba(255, 255, 255, 0.18)";

/**
 * The interactive waveform strip: a canvas overlay on the existing seek bar.
 * The underlying RangeSlider keeps owning pointer events - the strip only
 * mirrors the same ratio (played tint, buffer overlay), so seek semantics
 * cannot drift between the two.
 */
let deps: WaveformStripDeps;
let canvas: HTMLCanvasElement;
let context2d: CanvasRenderingContext2D | null = null;
let peaks: number[] | null = null;
let drawnTrackId: string | null = null;
let frameScheduled = false;

export function initWaveformStrip(deps_: WaveformStripDeps): void {
  deps = deps_;
  canvas = document.createElement("canvas");
  canvas.className = "progress__wave";
  deps.progress.append(canvas);
  context2d = canvas.getContext("2d");

  deps.player.on("track:play", scheduleUpdate);
  deps.player.on("track:pause", scheduleDraw);
  deps.player.on("track:loadeddata", scheduleUpdate);
  deps.player.on("track:timeupdate", scheduleDraw);
  window.addEventListener("resize", scheduleUpdate);
  onWaveformReady((trackId) => {
    // a lazy backfill finished for the track on air: swap the strip in
    if (trackId === drawnTrackId) {
      void showWaveformFor(deps.currentRecord());
    }
  });
  scheduleUpdate();
}

function scheduleUpdate(): void {
  const record = deps.currentRecord();
  if (deps.isRadioActive() || !record) {
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
  if (record.id !== (deps.currentRecord()?.id ?? null)) {
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
  deps.progress.classList.add("progress_wave");
  scheduleDraw();
}

function hide(): void {
  peaks = null;
  drawnTrackId = null;
  deps.progress.classList.remove("progress_wave");
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
  const { width, height } = deps.progress.getBoundingClientRect();
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
  const amplitude = mid * 0.9;
  const bucketCount = peaks.length / 2;
  const bufferRatio = deps.getBufferRatio();

  for (let x = 0; x < width; x++) {
    const bucket = Math.min(bucketCount - 1, Math.floor((x / width) * bucketCount));
    const min = peaks[bucket * 2];
    const max = peaks[bucket * 2 + 1];
    const top = mid - max * amplitude;
    const bottom = mid - min * amplitude;
    ctx.fillStyle = x <= playedX ? PLAYED_COLOR : DIM_COLOR;
    ctx.fillRect(x, top, 1, Math.max(1, bottom - top));
  }
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
