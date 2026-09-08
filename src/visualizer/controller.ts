import type AudioPlayer from "../audio-player";
import { MilkDropEngine, isWebGL2Supported } from "./butterchurn";
import { clearColumns, renderColumns } from "./columns";
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
 * The single frame loop for both render modes: draws through whichever
 * renderer the mode controller selected and, once, clears the active canvas
 * on the transition into a blocked state (radio takeover/mode, lyrics panel,
 * stopped playback). The columns rules and the MilkDrop rules are one rule.
 */
function startRenderLoop(deps: {
  player: AudioPlayer;
  barsCanvas: HTMLCanvasElement;
  engine: MilkDropEngine;
  shouldDraw: () => boolean;
  isMilkdropActive: () => boolean;
}): RenderLoopState {
  const { player, barsCanvas, engine, shouldDraw, isMilkdropActive } = deps;
  let wasDrawing = false;

  const draw = () => {
    // read live: the analyser only exists once the audio graph is built lazily
    const analyser = player.analyser;
    const milkdrop = isMilkdropActive();
    if (player.isPlaying && analyser && shouldDraw()) {
      if (milkdrop) {
        engine.render();
      } else {
        renderColumns(analyser, barsCanvas);
      }
      wasDrawing = true;
    } else if (wasDrawing) {
      if (milkdrop) {
        engine.clear();
      } else {
        clearColumns(barsCanvas);
      }
      wasDrawing = false;
    }
    requestAnimationFrame(draw);
  };

  requestAnimationFrame(draw);
  return { isRendering: () => wasDrawing };
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
 * Applies a mode switch: exactly one canvas stays visible, and the renderer
 * being left behind is cleared so no stale frame returns with it.
 */
function applyCanvasMode(
  mode: VisualizerMode,
  barsCanvas: HTMLCanvasElement,
  webglCanvas: HTMLCanvasElement,
  engine: MilkDropEngine,
  controls: VisualizerControls,
): void {
  barsCanvas.hidden = mode === "milkdrop";
  webglCanvas.hidden = mode !== "milkdrop";
  if (mode === "milkdrop") {
    // leaving bars: drop the last columns frame, it must not come back stale
    clearColumns(barsCanvas);
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
    isRendering: loop.isRendering,
    isReady: () => engine.isReady,
    presetName: () => engine.presetName,
  };
}
