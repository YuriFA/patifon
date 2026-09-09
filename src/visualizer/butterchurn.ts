import type AudioPlayer from "../audio-player";
import type { ButterchurnVisualizer } from "butterchurn";

/** Auto-rotation cadence for advancing to the next preset while rendering. */
const PRESET_ROTATION_MS = 30_000;
/** MilkDrop-style crossfade when the rotation advances; skips cut immediately. */
const PRESET_BLEND_SECONDS = 2.7;

type PresetEntry = readonly [name: string, preset: unknown];

/**
 * Probes WebGL2 availability the way butterchurn consumes it. The scratch
 * context is released immediately so it never counts against the browser's
 * context limit.
 */
export function isWebGL2Supported(): boolean {
  const gl = document.createElement("canvas").getContext("webgl2");
  gl?.getExtension("WEBGL_lose_context")?.loseContext();
  return gl !== null;
}

/** Random playback order over the preset pack; skip/rotation walk it forward. */
function shuffledPresets(presets: Record<string, unknown>): PresetEntry[] {
  const entries = Object.entries(presets);
  for (let i = entries.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [entries[i], entries[j]] = [entries[j], entries[i]];
  }
  return entries;
}

/**
 * MilkDrop engine: owns the butterchurn lifecycle behind a frame-driven
 * interface. The library (and its preset pack) is imported lazily on the
 * first render() so it stays out of the main bundle chunk; the visualizer is
 * created on the player's existing AudioContext and taps the existing
 * AnalyserNode, leaving the audio graph untouched. Presets rotate on a timer
 * that only runs between render() and clear() calls, so blocked states
 * (radio, lyrics, stopped playback) never advance scenes.
 */
export class MilkDropEngine {
  private visualizer: ButterchurnVisualizer | null = null;
  private presets: PresetEntry[] = [];
  private presetIndex = -1;
  private initStarted = false;
  private initFailed = false;
  private rotationTimer: number | null = null;

  constructor(
    private readonly player: AudioPlayer,
    private readonly canvas: HTMLCanvasElement,
  ) {}

  get isReady(): boolean {
    return this.visualizer !== null;
  }

  get presetName(): string | null {
    return this.presets[this.presetIndex]?.[0] ?? null;
  }

  /** Renders one frame; the first call kicks the lazy butterchurn import. */
  render(): void {
    if (!this.visualizer) {
      this.ensureInitialized();
      return;
    }
    this.visualizer.render();
    if (this.rotationTimer === null) {
      this.rotationTimer = window.setInterval(
        () => this.loadNextPreset(PRESET_BLEND_SECONDS),
        PRESET_ROTATION_MS,
      );
    }
  }

  /** Blocked state or leaving MilkDrop: stop rotation and clear the canvas. */
  clear(): void {
    if (this.rotationTimer !== null) {
      clearInterval(this.rotationTimer);
      this.rotationTimer = null;
    }
    const gl = this.canvas.getContext("webgl2");
    gl?.clearColor(0, 0, 0, 0);
    gl?.clear(gl.COLOR_BUFFER_BIT);
  }

  skipPreset(): void {
    if (this.visualizer) {
      this.loadNextPreset(0);
    }
  }

  resize(width: number, height: number): void {
    this.visualizer?.setRendererSize(width, height);
  }

  private ensureInitialized(): void {
    if (this.initStarted || this.initFailed) {
      return;
    }
    // read live: the graph only exists once the first play built it
    const { audioContext, analyser } = this.player;
    if (!audioContext || !analyser) {
      // retried by the next render() call
      return;
    }
    this.initStarted = true;
    void this.initialize(audioContext, analyser.analyser).catch(() => {
      // a dead chunk fetch must not turn the frame loop into a retry storm
      this.initFailed = true;
    });
  }

  private async initialize(audioContext: AudioContext, analyserNode: AnalyserNode): Promise<void> {
    const [butterchurnInterop, presetsInterop] = await Promise.all([
      import("butterchurn"),
      import("butterchurn-presets"),
    ]);
    // UMD behind bundler interop: the factory sits on the default export or
    // one level nested (see src/types/butterchurn.d.ts)
    const defaultExport = butterchurnInterop.default;
    const factory = "createVisualizer" in defaultExport ? defaultExport : defaultExport.default;
    const getPresets =
      typeof presetsInterop.getPresets === "function"
        ? presetsInterop.getPresets
        : presetsInterop.default.getPresets;

    const visualizer = factory.createVisualizer(audioContext, this.canvas, {
      width: this.canvas.width,
      height: this.canvas.height,
    });
    visualizer.connectAudio(analyserNode);
    this.presets = shuffledPresets(getPresets());
    this.visualizer = visualizer;
    this.loadNextPreset(0);
  }

  private loadNextPreset(blendSeconds: number): void {
    if (!this.visualizer || this.presets.length === 0) {
      return;
    }
    this.presetIndex = (this.presetIndex + 1) % this.presets.length;
    this.visualizer.loadPreset(this.presets[this.presetIndex][1], blendSeconds);
  }
}
