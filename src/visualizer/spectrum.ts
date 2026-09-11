/**
 * The shared spectrum pipeline: one mapping from FFT bins to the column
 * levels every spectrum surface draws (the full-area LCD/LED renderers and
 * the transport's mini meter). Bands are logarithmic from 40 Hz to 16 kHz
 * (peak of the bins per band), mirrored bass-in-center, AGC-normalized,
 * with instant attack, smooth release and slow peak-hold - the dynamics
 * validated in the approved LED/LCD prototypes.
 */

export type SpectrumStyle = "lcd" | "led";

export interface SpectrumFrame {
  /** Normalized 0..1 column heights, mirrored (bass at the center). */
  readonly levels: Float32Array;
  /** Normalized 0..1 peak-hold markers per column. */
  readonly peaks: Float32Array;
}

const TUNING = {
  freqMin: 40,
  freqMax: 16000,
  dbFloor: -78,
  dbCeil: -18,
  /** Column fall per second (dropping levels and the pause falloff). */
  release: 3.5,
  /** Peak-marker fall per second while playing. */
  peakFall: 0.07,
  /** Tracked-peak decay per second (AGC). */
  agcDecay: 0.25,
  /** Never amplify below this tracked peak (silence must not pump). */
  agcFloor: 0.55,
  /** Normalized ceiling. */
  headroom: 0.97,
} as const;

/** Below one cell of any renderer: counts as empty. */
const EMPTY_LEVEL = 0.002;

export class Spectrum {
  private columns = 0;
  private center = 0;
  private levels = new Float32Array(0);
  private peaks = new Float32Array(0);
  private targets = new Float32Array(0);
  private outLevels = new Float32Array(0);
  private outPeaks = new Float32Array(0);
  private binLo = new Int32Array(0);
  private binHi = new Int32Array(0);
  private binKey = "";
  private agc: number = TUNING.agcFloor;
  private lastStep = 0;

  /** Resizes the column arrays; an odd count keeps one true center column. */
  setColumns(columns: number): void {
    if (columns % 2 === 0) {
      columns -= 1;
    }
    if (columns < 3 || columns === this.columns) {
      return;
    }
    this.columns = columns;
    this.center = (columns - 1) / 2;
    this.levels = new Float32Array(columns);
    this.peaks = new Float32Array(columns);
    this.targets = new Float32Array(columns);
    this.outLevels = new Float32Array(columns);
    this.outPeaks = new Float32Array(columns);
    this.agc = TUNING.agcFloor;
  }

  /**
   * Maps one FFT snapshot to column levels. Always returns a frame (a
   * silent track shows an empty-but-lit screen); bin ranges are cached per
   * bin count and sample rate.
   */
  update(frequencyData: Float32Array<ArrayBuffer>, sampleRate: number): SpectrumFrame {
    const dt = this.step();
    const { center } = this;
    const unique = center + 1;
    this.mapBins(unique, frequencyData.length, sampleRate);
    const span = TUNING.dbCeil - TUNING.dbFloor;
    for (let u = 0; u < unique; u++) {
      const lo = this.binLo[u];
      const hi = this.binHi[u];
      let db = -Infinity;
      for (let bin = lo; bin < hi; bin++) {
        const value = frequencyData[bin];
        if (value > db) {
          db = value;
        }
      }
      const target = Math.min(1, Math.max(0, (db - TUNING.dbFloor) / span));
      this.targets[center - u] = target;
      this.targets[center + u] = target;
    }
    this.advance(dt, false);
    return { levels: this.outLevels, peaks: this.outPeaks };
  }

  /**
   * No input (paused/stopped): columns sink through the release path.
   * Returns null once the falloff has fully cleared the display.
   */
  decay(): SpectrumFrame | null {
    if (!this.columns) {
      return null;
    }
    const dt = this.step();
    this.targets.fill(0);
    return this.advance(dt, true);
  }

  private advance(dt: number, decaying: boolean): SpectrumFrame | null {
    let frameMax = 0;
    for (let i = 0; i < this.columns; i++) {
      const target = this.targets[i];
      const level =
        target > this.levels[i] ? target : Math.max(target, this.levels[i] - TUNING.release * dt);
      this.levels[i] = level;
      // peaks track the falling stack while paused, hold slowly while playing
      const fall = (decaying ? TUNING.release : TUNING.peakFall) * dt;
      this.peaks[i] = level > this.peaks[i] ? level : Math.max(level, this.peaks[i] - fall);
      if (level > frameMax) {
        frameMax = level;
      }
    }
    this.agc = Math.max(TUNING.agcFloor, Math.max(frameMax, this.agc * (1 - TUNING.agcDecay * dt)));
    const scale = TUNING.headroom / this.agc;
    let anyLit = false;
    for (let i = 0; i < this.columns; i++) {
      const level = Math.min(1, this.levels[i] * scale);
      const peak = Math.min(1, Math.max(this.peaks[i] * scale, level));
      this.outLevels[i] = level;
      this.outPeaks[i] = peak;
      if (level > EMPTY_LEVEL || peak > EMPTY_LEVEL) {
        anyLit = true;
      }
    }
    return anyLit || !decaying ? { levels: this.outLevels, peaks: this.outPeaks } : null;
  }

  private step(): number {
    const now = performance.now();
    const dt = this.lastStep ? Math.min(0.05, (now - this.lastStep) / 1000) : 1 / 60;
    this.lastStep = now;
    return dt;
  }

  private mapBins(unique: number, binCount: number, sampleRate: number): void {
    const key = `${unique}:${binCount}:${sampleRate}`;
    if (key === this.binKey) {
      return;
    }
    this.binKey = key;
    this.binLo = new Int32Array(unique);
    this.binHi = new Int32Array(unique);
    const hzPerBin = sampleRate / 2 / binCount;
    const ratio = TUNING.freqMax / TUNING.freqMin;
    let previous = Math.max(1, Math.round(TUNING.freqMin / hzPerBin));
    for (let u = 0; u < unique; u++) {
      const lo = Math.max(
        previous,
        Math.round((TUNING.freqMin * ratio ** (u / unique)) / hzPerBin),
      );
      const hi = Math.min(
        binCount,
        Math.max(lo + 1, Math.round((TUNING.freqMin * ratio ** ((u + 1) / unique)) / hzPerBin)),
      );
      this.binLo[u] = lo;
      this.binHi[u] = hi;
      previous = lo;
    }
  }
}
