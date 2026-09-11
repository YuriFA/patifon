import { useEffect, useRef } from "preact/hooks";
import type { LibraryRecord } from "../library/store";
import { activateLibraryRecord, libraryRowsView, type LibraryRowView } from "../library/ui";
import { createAddToPlaylistButton } from "../playlists/picker";
import { createPlayNextButton } from "../library/row-actions";
import { BarChartIcon } from "./icons";

/**
 * Hosts the imperative action buttons the playlists/queue modules build.
 * They own their listeners and stopPropagation, so they keep working
 * unchanged inside the reactive row.
 */
function RowActions({ record }: { record: LibraryRecord }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    ref.current?.replaceChildren(
      createAddToPlaylistButton(record.id),
      createPlayNextButton(record),
    );
  }, [record]);
  return <span ref={ref} />;
}

function LibraryRow({
  row,
  playing,
  queued,
}: {
  row: LibraryRowView;
  playing: boolean;
  queued: boolean;
}) {
  const cls = ["library__row", playing && "library__row_playing", queued && "library__row_queued"]
    .filter(Boolean)
    .join(" ");
  const activate = () => activateLibraryRecord(row.record);
  return (
    <li
      class={cls}
      data-id={row.record.id}
      tabIndex={0}
      onClick={activate}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activate();
        }
      }}
    >
      {row.artworkUrl ? (
        <img class="library__thumb" src={row.artworkUrl} alt="" />
      ) : (
        <span class="library__thumb library__thumb_empty">{"\u266A"}</span>
      )}
      <div class="library__meta" title={row.title}>
        <span class="library__title">{row.record.title}</span>
        {row.record.artist ? <span class="library__artist">{row.record.artist}</span> : null}
      </div>
      {playing ? <BarChartIcon size={16} class="library__playing-glyph" /> : null}
      <span class="library__duration">{row.duration}</span>
      <RowActions record={row.record} />
    </li>
  );
}

/**
 * The library's rows island: renders the shared list plus its empty hint
 * from the libraryRowsView snapshot signal. The host unmounts it whenever
 * another mode owns the list region.
 */
export function LibraryRows() {
  const view = libraryRowsView.value;
  return (
    <>
      <div class="library__empty" hidden={!view.empty}>
        {view.emptyText}
      </div>
      <ul class="library__list">
        {view.rows.map((row) => (
          <LibraryRow
            key={row.record.id}
            row={row}
            playing={view.playing && view.playingId === row.record.id}
            queued={view.queuedIds.includes(row.record.id)}
          />
        ))}
      </ul>
    </>
  );
}
