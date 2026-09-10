import { signal } from "@preact/signals";

/**
 * Which view owns the visualization area: the lyrics panel, the vinyl deck,
 * or the frequency visualizer (bars/MilkDrop). Selected by the area tabs and
 * persisted; the shell spec's ownership rule gives the area exactly one
 * writer - the active mode's owner.
 */
export type AreaMode = "lyrics" | "vinyl" | "visualizer";

const AREA_MODE_KEY = "visualization-mode";

function readStoredMode(): AreaMode {
  const stored = localStorage.getItem(AREA_MODE_KEY);
  return stored === "lyrics" || stored === "vinyl" ? stored : "visualizer";
}

export const areaMode = signal<AreaMode>(readStoredMode());

export function setAreaMode(mode: AreaMode): void {
  localStorage.setItem(AREA_MODE_KEY, mode);
  areaMode.value = mode;
}
