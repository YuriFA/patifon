import { AreaMode, areaMode, setAreaMode } from "../visualizer/area-mode";
import { bridge } from "./bridge";

const TABS: Array<{ mode: AreaMode; label: string }> = [
  { mode: "lyrics", label: "Lyrics" },
  { mode: "vinyl", label: "Vinyl" },
  { mode: "visualizer", label: "Visualizer" },
];

/**
 * The visualization area's mode switcher: three tabs top-right (draft). The
 * tabs select the area's owner; each mode's availability rules (WebGL2,
 * radio, lyrics existence) live with their owners, not here. An engaged
 * station owns the area outright - the radio deck replaces it - so the
 * tabs vanish and return with the previous tab on release.
 */
export function AreaTabs() {
  if (bridge.source.value === "radio") {
    return null;
  }
  return (
    <div class="area-tabs" role="group" aria-label="Visualization mode">
      {TABS.map(({ mode, label }) => (
        <button
          key={mode}
          type="button"
          class={`mech-button area-tabs__tab${areaMode.value === mode ? " is-on" : ""}`}
          aria-pressed={areaMode.value === mode}
          onClick={() => setAreaMode(mode)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
