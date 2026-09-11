import { createPortal } from "preact/compat";
import { useLayoutEffect, useRef } from "preact/hooks";
import { stationTags } from "../radio/rows";
import type { RadioStation } from "../radio/api";
import { playStation, stationRowsView, toggleSaveStation, type RadioRowItem } from "../radio/ui";
import type { Mode } from "../modes";
import { bridge } from "./bridge";

/** Shared list-ownership pattern: on gaining ownership, wipe the previous
 * writer's rows before our portal reconciles. */
function useOwnership(list: HTMLUListElement, mine: Mode): void {
  const owned = useRef(false);
  // Subscribe once for the component's lifetime: on gaining ownership the
  // previous writer's rows are wiped synchronously, BEFORE this island's
  // portal reconciles its rows into the same list element.
  useLayoutEffect(() => {
    return bridge.mode.subscribe(() => {
      if (bridge.mode.value === mine && !owned.current) {
        owned.current = true;
        list.replaceChildren();
      } else if (bridge.mode.value !== mine) {
        owned.current = false;
      }
    });
  }, [list, mine]);
}

function StationThumb({ station }: { station: RadioStation }) {
  if (!station.favicon) {
    return (
      <span class="library__thumb library__thumb_empty" aria-hidden="true">
        ♪
      </span>
    );
  }
  return (
    <img
      class="library__thumb"
      src={station.favicon}
      alt=""
      onError={(event) => {
        const image = event.currentTarget;
        const placeholder = document.createElement("span");
        placeholder.className = "library__thumb library__thumb_empty";
        placeholder.textContent = "♪";
        image.replaceWith(placeholder);
      }}
    />
  );
}

function StationRow({
  item,
  playing,
  error,
}: {
  item: RadioRowItem;
  playing: boolean;
  error: boolean;
}) {
  const { station } = item;
  const rowClass =
    `library__row radio__row` +
    (playing ? " library__row_playing" : "") +
    (error ? " radio__row_error" : "");
  return (
    <li class={rowClass} data-uuid={station.stationuuid} onClick={() => void playStation(station)}>
      <StationThumb station={station} />
      <div class="library__meta">{station.name}</div>
      <button
        type="button"
        class={`radio__star${item.saved ? " radio__star_saved" : ""}`}
        title={item.saved ? "Remove from saved" : "Save station"}
        onClick={(event) => {
          event.stopPropagation();
          toggleSaveStation(station);
        }}
      >
        {item.saved ? "★" : "☆"}
      </button>
      <span class="library__duration" title={stationTags(station)}>
        {station.bitrate > 0 ? `${station.bitrate} kbps` : ""}
      </span>
    </li>
  );
}

/**
 * The radio view's station rows (Warm Earth): a portal into the shared
 * persistent list, owning it exactly while radio mode is active. Rows come
 * from the radio module's snapshot signal; the empty hint is rendered into
 * the sidebar's hint line.
 */
export function RadioRows({ list }: { list: HTMLUListElement }) {
  const view = stationRowsView.value;
  const active = bridge.mode.value === "radio";
  useOwnership(list, "radio");

  if (!active) {
    return null;
  }

  return (
    <>
      {createPortal(
        view.rows.map((item) => (
          <StationRow
            key={item.station.stationuuid}
            item={item}
            playing={view.playingUuid === item.station.stationuuid}
            error={view.errorUuids.includes(item.station.stationuuid)}
          />
        )),
        list,
      )}
    </>
  );
}
