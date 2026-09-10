import { createPortal } from "preact/compat";
import { useLayoutEffect, useRef } from "preact/hooks";
import type { LibraryRecord } from "../library/store";
import { formatDuration } from "../utils";
import { playRecords } from "../library/source";
import { resolvePlaylistRecords, type PlaylistRecord } from "../playlists/store";
import { startInlineRename } from "../playlists/rename";
import {
  deletePlaylistById,
  findPlaylistById,
  getOpenPlaylist,
  moveTrackAt,
  openPlaylist,
  playlistsRowsView,
  removeTrack,
  rerenderPlaylists,
} from "../playlists/ui";
import type { Mode } from "../modes";
import { bridge } from "./bridge";

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

function Thumb({ artwork }: { artwork: string | null }) {
  if (artwork) {
    return <img class="library__thumb" src={artwork} alt="" />;
  }
  return (
    <span class="library__thumb library__thumb_empty" aria-hidden="true">
      ♪
    </span>
  );
}

function RowActionButton({
  className,
  title,
  glyph,
  hidden,
  onClick,
}: {
  className: string;
  title: string;
  glyph: string;
  hidden?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      class={`library__row-action ${className}${hidden ? " hidden-button" : ""}`}
      title={title}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      {glyph}
    </button>
  );
}

function IndexRow({
  row,
  onRename,
}: {
  row: { id: string; name: string; trackCount: number };
  onRename: (id: string) => void;
}) {
  return (
    <li class="library__row playlists__row" data-pid={row.id} onClick={() => openPlaylist(row.id)}>
      <Thumb artwork={null} />
      <div class="library__meta">{row.name}</div>
      <div class="playlists__track-actions">
        <RowActionButton
          className="playlists__play"
          title="Play playlist"
          glyph="▶"
          onClick={() => openPlaylist(row.id)}
        />
        <RowActionButton
          className="playlists__rename"
          title="Rename playlist"
          glyph="✎"
          onClick={() => onRename(row.id)}
        />
        <RowActionButton
          className="playlists__remove"
          title="Delete playlist"
          glyph="×"
          onClick={() => deletePlaylistById(row.id)}
        />
      </div>
      <span class="library__duration">{row.trackCount} tracks</span>
    </li>
  );
}

function TrackActions({
  row,
  playlist,
}: {
  row: {
    position: number;
    length: number;
  };
  playlist: PlaylistRecord;
}) {
  return (
    <div class="playlists__track-actions">
      <RowActionButton
        className="playlists__move-up"
        title="Move up"
        glyph="↑"
        hidden={row.position === 0}
        onClick={() => moveTrackAt(playlist, row.position, row.position - 1)}
      />
      <RowActionButton
        className="playlists__move-down"
        title="Move down"
        glyph="↓"
        hidden={row.position === row.length - 1}
        onClick={() => moveTrackAt(playlist, row.position, row.position + 1)}
      />
      <RowActionButton
        className="playlists__remove-track"
        title="Remove from playlist"
        glyph="×"
        onClick={() => removeTrack(playlist, row.position)}
      />
    </div>
  );
}

function TrackRow({
  row,
  playlist,
  records,
}: {
  row: {
    id: string;
    artist: string;
    title: string;
    position: number;
    length: number;
    duration: number;
    artwork: string | null;
    playing: boolean;
  };
  playlist: PlaylistRecord;
  records: () => readonly LibraryRecord[];
}) {
  const name = row.artist ? `${row.artist} - ${row.title}` : row.title;
  const play = () => {
    playRecords(resolvePlaylistRecords(playlist, records()), row.position);
  };
  return (
    <li
      class={`library__row playlists__track${row.playing ? " library__row_playing" : ""}`}
      data-id={row.id}
      data-pos={String(row.position)}
      onClick={play}
    >
      <Thumb artwork={row.artwork} />
      <div class="library__meta">{name}</div>
      <TrackActions row={row} playlist={playlist} />
      <span class="library__duration">{formatDuration(row.duration)}</span>
    </li>
  );
}

/**
 * The playlists view's rows (Warm Earth): a portal into the shared
 * persistent list, owning it exactly while playlists mode is active. The
 * index shows every playlist; an open playlist shows its tracks with
 * reorder and remove actions.
 */
export function PlaylistsRows({
  list,
  records,
}: {
  list: HTMLUListElement;
  records: () => readonly LibraryRecord[];
}) {
  const view = playlistsRowsView.value;
  const active = bridge.mode.value === "playlists";
  useOwnership(list, "playlists");

  if (!active) {
    return null;
  }

  if (view.kind === "index") {
    const renameRow = (id: string) => {
      const playlist = findPlaylistById(id);
      if (playlist) {
        startInlineRename(playlist, list, rerenderPlaylists);
      }
    };
    return createPortal(
      view.rows.map((row) => <IndexRow key={row.id} row={row} onRename={renameRow} />),
      list,
    );
  }

  const playlist = getOpenPlaylist();
  if (!playlist) {
    return null;
  }
  return createPortal(
    view.rows.map((row) => (
      <TrackRow key={row.id} row={row} playlist={playlist} records={records} />
    )),
    list,
  );
}
