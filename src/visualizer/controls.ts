import type { VisualizerMode } from "./controller";

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
 * Overlay badges in the visualization area's corner, styled after the radio
 * LIVE badge family: the Bars/MilkDrop toggle (hidden without WebGL2) and the
 * preset skip (MilkDrop only). The toggle names the mode a click switches to.
 */
export function createVisualizerControls(deps: VisualizerControlsDeps): VisualizerControls {
  const modeButton = deps.root.querySelector<HTMLButtonElement>(".visualizer-controls__mode")!;
  const skipButton = deps.root.querySelector<HTMLButtonElement>(".visualizer-controls__skip")!;

  modeButton.addEventListener("click", deps.onToggleMode);
  skipButton.addEventListener("click", deps.onSkipPreset);

  let supported = false;
  let mode: VisualizerMode = "bars";

  const sync = () => {
    deps.root.hidden = !supported;
    modeButton.textContent = mode === "bars" ? "MilkDrop" : "Bars";
    skipButton.hidden = mode !== "milkdrop";
  };

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
