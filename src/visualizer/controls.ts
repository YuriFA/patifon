import { effect } from "@preact/signals";
import type { VisualizerMode } from "./controller";
import { areaMode } from "./area-mode";
import { setSpectrumStyle, spectrumStyle } from "./spectrum-style";
import type { SpectrumStyle } from "./spectrum";
import { bridge } from "../ui/bridge";

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
 * The visualization area's corner badges: the spectrum style buttons (LCD
 * latches the matrix, LED the ladder), the bars/MilkDrop toggle (names the
 * mode a click switches to) and the MilkDrop preset-skip. All belong to
 * the VISUALIZER tab only - phase 2 moved lyrics/vinyl to the area tabs.
 */
export function createVisualizerControls(deps: VisualizerControlsDeps): VisualizerControls {
  const modeButton = deps.root.querySelector<HTMLButtonElement>(".visualizer-controls__mode")!;
  const skipButton = deps.root.querySelector<HTMLButtonElement>(".visualizer-controls__skip")!;
  const styleButtons = Array.from(
    deps.root.querySelectorAll<HTMLButtonElement>(".visualizer-controls__style"),
  );

  modeButton.addEventListener("click", deps.onToggleMode);
  skipButton.addEventListener("click", deps.onSkipPreset);
  for (const button of styleButtons) {
    button.addEventListener("click", () => {
      const style: SpectrumStyle = button.dataset.style === "led" ? "led" : "lcd";
      setSpectrumStyle(style);
    });
  }

  let supported = false;
  let mode: VisualizerMode = "bars";

  const sync = () => {
    // an engaged station owns the area: the radio deck replaces the whole
    // corner chrome, whatever the tabs say
    const visualizerTab = areaMode.value === "visualizer" && bridge.source.value !== "radio";
    modeButton.hidden = !supported || !visualizerTab;
    modeButton.textContent = mode === "bars" ? "MilkDrop" : "Bars";
    skipButton.hidden = !supported || mode !== "milkdrop" || !visualizerTab;
    for (const button of styleButtons) {
      const on = spectrumStyle.value === (button.dataset.style === "led" ? "led" : "lcd");
      button.hidden = !visualizerTab;
      button.classList.toggle("is-on", on);
      button.setAttribute("aria-pressed", String(on));
    }
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
