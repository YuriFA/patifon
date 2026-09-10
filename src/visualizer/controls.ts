import { effect } from "@preact/signals";
import type { VisualizerMode } from "./controller";
import { areaMode } from "./area-mode";

export interface VisualizerControlsDeps {
  /** Overlay container inside the visualization area (`.visualizer-controls`). */
  root: HTMLElement;
  onToggleMode: () => void;
  onSkipPreset: () => void;
}

export interface VisualizerControls {
  setSupported(supported: boolean): void;
  setMode(mode: VisualizerMode): void;
}

/**
 * The visualization area's corner badges: the bars/MilkDrop toggle (names
 * the mode a click switches to) and the MilkDrop preset-skip. Both belong
 * to the VISUALIZER tab only - phase 2 moved lyrics/vinyl to the area tabs.
 */
export function createVisualizerControls(deps: VisualizerControlsDeps): VisualizerControls {
  const modeButton = deps.root.querySelector<HTMLButtonElement>(".visualizer-controls__mode")!;
  const skipButton = deps.root.querySelector<HTMLButtonElement>(".visualizer-controls__skip")!;

  modeButton.addEventListener("click", deps.onToggleMode);
  skipButton.addEventListener("click", deps.onSkipPreset);

  let supported = false;
  let mode: VisualizerMode = "bars";

  const sync = () => {
    const visualizerTab = areaMode.value === "visualizer";
    modeButton.hidden = !supported || !visualizerTab;
    modeButton.textContent = mode === "bars" ? "MilkDrop" : "Bars";
    skipButton.hidden = !supported || mode !== "milkdrop" || !visualizerTab;
  };

  effect(sync);

  return {
    setSupported(value) {
      supported = value;
      sync();
    },
    setMode(value) {
      mode = value;
      sync();
    },
  };
}
