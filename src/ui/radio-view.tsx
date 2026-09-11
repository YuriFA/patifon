import { stationTags } from "../radio/rows";
import type { RadioStation } from "../radio/api";
import { playStation, stationRowsView, toggleSaveStation, type RadioRowItem } from "../radio/ui";

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
 * The radio view's rows island: renders the shared list plus its empty hint
 * from the stationRowsView snapshot signal. The host unmounts it whenever
 * another mode owns the list region.
 */
export function RadioRows() {
  const view = stationRowsView.value;
  return (
    <>
      <div class="library__empty" hidden={!view.empty}>
        {view.emptyText}
      </div>
      <ul class="library__list">
        {view.rows.map((item) => (
          <StationRow
            key={item.station.stationuuid}
            item={item}
            playing={view.playingUuid === item.station.stationuuid}
            error={view.errorUuids.includes(item.station.stationuuid)}
          />
        ))}
      </ul>
    </>
  );
}
