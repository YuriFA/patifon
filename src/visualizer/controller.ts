import { effect } from "@preact/signals";
import type AudioPlayer from "../audio-player";
import { MilkDropEngine, isWebGL2Supported } from "./butterchurn";
import { areaMode } from "./area-mode";
import { Spectrum } from "./spectrum";
import { spectrumStyle } from "./spectrum-style";
import { clearSpectrum, columnsForWidth, renderSpectrum } from "./render";
import { createVisualizerControls, type VisualizerControls } from "./controls";

export type VisualizerMode = "bars" | "milkdrop";

const MODE_STORAGE_KEY = "visualizer-mode";

export interface VisualizerDeps {
  player: AudioPlayer;
  barsCanvas: HTMLCanvasElement;
  webglCanvas: HTMLCanvasElement;
  controlsRoot: HTMLElement;
  /** Gates both render modes on app state (radio mode, lyrics panel). */
  shouldDraw: () => boolean;
}

declare global {
  interface Window {
    visualizer?: {
      mode: () => VisualizerMode;
      style: () => "lcd" | "led";
      isRendering: () => boolean;
      isReady: () => boolean;
      presetName: () => string | null;
    };
  }
}

interface RenderLoopState {
  isRendering(): boolean;
}

/**
 * The bars renderer's frame step: live frames while playing, the release
 * falloff while stopped, cleared once the falloff ends. Returns whether a
 * frame is currently held.
 */
function createSpectrumRenderer(deps: {
  player: AudioPlayer;
  barsCanvas: HTMLCanvasElement;
  shouldDraw: () => boolean;
}): () => boolean {
  const { player, barsCanvas, shouldDraw } = deps;
  const spectrum = new Spectrum();
  let drawing = false;
  let columnsFor = 0;

  return () => {
    const analyser = player.analyser;
    if (!analyser || !shouldDraw()) {
      if (drawing) {
        clearSpectrum(barsCanvas);
        drawing = false;
      }
      return false;
    }
    // the band count follows the canvas width wherever it was resized
    if (barsCanvas.width !== columnsFor) {
      spectrum.setColumns(columnsForWidth(barsCanvas.width));
      columnsFor = barsCanvas.width;
    }
    if (player.isPlaying) {
      analyser.updateData();
      const frame = spectrum.update(analyser.fFrequencyData, analyser.analyser.context.sampleRate);
      renderSpectrum(barsCanvas, frame, spectrumStyle.value);
      drawing = true;
      return true;
    }
    // stopped: columns sink through the release path and the canvas ends
    // cleared (a physical falloff, not a frozen frame)
    const frame = spectrum.decay();
    if (!frame) {
      clearSpectrum(barsCanvas);
      drawing = false;
      return false;
    }
    renderSpectrum(barsCanvas, frame, spectrumStyle.value);
    drawing = true;
    return true;
  };
}

/**
 * The single frame loop for both render modes: draws through whichever
 * renderer the mode controller selected. The spectrum follows one rule on
 * stop: columns sink through the release path and the canvas ends cleared
 * (a physical falloff, not a frozen frame); MilkDrop and the blocked states
 * (radio takeover/mode, lyrics panel) clear once on entry. The columns
 * rules and the MilkDrop rules are one rule.
 */
function startRenderLoop(deps: {
  player: AudioPlayer;
  barsCanvas: HTMLCanvasElement;
  engine: MilkDropEngine;
  shouldDraw: () => boolean;
  isMilkdropActive: () => boolean;
}): RenderLoopState {
  const { player, engine, shouldDraw, isMilkdropActive } = deps;
  const drawBars = createSpectrumRenderer(deps);
  let drawing = false;

  const draw = () => {
    if (isMilkdropActive()) {
      if (player.isPlaying && player.analyser && shouldDraw()) {
        engine.render();
        drawing = true;
      } else if (drawing) {
        engine.clear();
        drawing = false;
      }
    } else {
      drawing = drawBars();
    }
    requestAnimationFrame(draw);
  };

  requestAnimationFrame(draw);
  return { isRendering: () => drawing };
}

/** Keeps both canvases at body size; MilkDrop re-buffers through the engine. */
function watchCanvasResize(
  barsCanvas: HTMLCanvasElement,
  webglCanvas: HTMLCanvasElement,
  engine: MilkDropEngine,
): void {
  window.addEventListener("resize", () => {
    barsCanvas.width = document.body.clientWidth;
    barsCanvas.height = document.body.clientHeight;
    webglCanvas.width = barsCanvas.width;
    webglCanvas.height = barsCanvas.height;
    engine.resize(webglCanvas.width, webglCanvas.height);
  });
}

/**
 * Owns the visualization area's render mode. Exactly one renderer draws at a
 * time - the idle canvas is hidden, so exclusivity is structural - and the
 * exclusion rules live in the shared frame loop. The Bars/MilkDrop choice
 * persists in localStorage; without WebGL2 the MilkDrop mode stays dormant
 * and the classic renderer is the only mode.
 */

/**
 * Applies a renderer switch inside the VISUALIZER tab: exactly one canvas
 * stays visible, and the renderer being left behind is cleared so no stale
 * frame returns with it. The canvases only show while the VISUALIZER tab
 * owns the area.
 */
function applyCanvasMode(
  mode: VisualizerMode,
  barsCanvas: HTMLCanvasElement,
  webglCanvas: HTMLCanvasElement,
  engine: MilkDropEngine,
  controls: VisualizerControls,
): void {
  const tabOwnsArea = areaMode.value === "visualizer";
  barsCanvas.hidden = mode === "milkdrop" || !tabOwnsArea;
  webglCanvas.hidden = mode !== "milkdrop" || !tabOwnsArea;
  if (mode === "milkdrop") {
    // leaving bars: drop the last spectrum frame, it must not come back stale
    clearSpectrum(barsCanvas);
  } else {
    // leaving MilkDrop: stop preset rotation and clear the WebGL canvas
    engine.clear();
  }
  controls.setMode(mode);
}

export function initVisualizer(deps: VisualizerDeps): void {
  const { player, barsCanvas, webglCanvas, shouldDraw } = deps;
  const webglSupported = isWebGL2Supported();
  const engine = new MilkDropEngine(player, webglCanvas);
  // a stored MilkDrop choice without WebGL2 falls back to the only renderer
  let mode: VisualizerMode =
    webglSupported && localStorage.getItem(MODE_STORAGE_KEY) === "milkdrop" ? "milkdrop" : "bars";

  const isMilkdropActive = () => mode === "milkdrop" && webglSupported;

  const controls = createVisualizerControls({
    root: deps.controlsRoot,
    onToggleMode: () => {
      mode = mode === "bars" ? "milkdrop" : "bars";
      localStorage.setItem(MODE_STORAGE_KEY, mode);
      applyCanvasMode(mode, barsCanvas, webglCanvas, engine, controls);
    },
    onSkipPreset: () => engine.skipPreset(),
  });
  controls.setSupported(webglSupported);
  applyCanvasMode(mode, barsCanvas, webglCanvas, engine, controls);

  // leaving the VISUALIZER tab hides and clears both canvases; coming back
  // re-applies the stored renderer choice (ownership: the tab owns the area)
  effect(() => {
    applyCanvasMode(mode, barsCanvas, webglCanvas, engine, controls);
  });

  const loop = startRenderLoop({
    player,
    barsCanvas,
    engine,
    shouldDraw,
    isMilkdropActive,
  });
  watchCanvasResize(barsCanvas, webglCanvas, engine);

  // debug/observability handle (also used by e2e to inspect render state)
  window.visualizer = {
    mode: () => mode,
    style: () => spectrumStyle.value,
    isRendering: loop.isRendering,
    isReady: () => engine.isReady,
    presetName: () => engine.presetName,
  };
}
