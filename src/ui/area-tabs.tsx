import { AreaMode, areaMode, setAreaMode } from "../visualizer/area-mode";

const TABS: Array<{ mode: AreaMode; label: string }> = [
  { mode: "lyrics", label: "Lyrics" },
  { mode: "vinyl", label: "Vinyl" },
  { mode: "visualizer", label: "Visualizer" },
];

/**
 * The visualization area's mode switcher: three tabs top-right (draft). The
 * tabs select the area's owner; each mode's availability rules (WebGL2,
 * radio, lyrics existence) live with their owners, not here.
 */
export function AreaTabs() {
  return (
    <div class="area-tabs" role="group" aria-label="Visualization mode">
      {TABS.map(({ mode, label }) => (
        <button
          key={mode}
          type="button"
          class="area-tabs__tab"
          aria-pressed={areaMode.value === mode}
          onClick={() => setAreaMode(mode)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
