import { createPortal, flushSync } from "preact/compat";
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import type { LibraryRecord } from "../library/store";
import {
  activateLibraryRecord,
  libraryViewSnapshot,
  subscribeLibraryView,
  type LibraryRowView,
  type LibraryViewSnapshot,
} from "../library/ui";
import { createAddToPlaylistButton } from "../playlists/picker";
import { createPlayNextButton } from "../library/row-actions";
import { bridge } from "./bridge";
function useLibraryView(list: HTMLUListElement): LibraryViewSnapshot {
  const [snapshot, setSnapshot] = useState(libraryViewSnapshot);
  // Whether the portal currently owns the list: on gaining ownership the
  // rows vanilla writers left behind must go before our rows reconcile.
  const owned = useRef(false);
  // Layout effect: the subscription must exist before boot's async
  // continuation (IndexedDB restore) fires the first notifyView.
  useLayoutEffect(
    () =>
      subscribeLibraryView(() => {
        // Synchronous: vanilla writers (radio, playlists) wipe the shared list
        // right after the mode flip, so the portal must unmount its rows first.
        flushSync(() => {
          const isLibrary = bridge.mode.value === "library";
          if (isLibrary && !owned.current) {
            owned.current = true;
            list.replaceChildren();
          } else if (!isLibrary) {
            owned.current = false;
          }
          setSnapshot(libraryViewSnapshot());
        });
      }),
    [],
  );
  return snapshot;
}

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
        {row.label}
      </div>
      <span class="library__duration">{row.duration}</span>
      <RowActions record={row.record} />
    </li>
  );
}

/**
 * The library's rows. Rendered through a portal into the shared persistent
 * list element; outside library mode the portal renders nothing, so radio
 * and playlists keep writing the same element with vanilla replaceChildren.
 * Ownership follows the active mode.
 */
export function LibraryRows({ list }: { list: HTMLUListElement }) {
  const view = useLibraryView(list);
  if (bridge.mode.value !== "library") {
    return null;
  }
  return createPortal(
    <>
      {view.rows.map((row) => (
        <LibraryRow
          key={row.record.id}
          row={row}
          playing={view.playing && view.playingId === row.record.id}
          queued={view.queuedIds.includes(row.record.id)}
        />
      ))}
    </>,
    list,
  );
}
