import { useRef } from "preact/hooks";
import { formatDuration } from "../utils";
import { playRecords } from "../library/source";
import { libraryRecords } from "../library/ui";
import { resolvePlaylistRecords, type PlaylistRecord } from "../playlists/store";
import { startInlineRename } from "../playlists/rename";
import {
  deletePlaylistById,
  findPlaylistById,
  getOpenPlaylist,
  moveTrackAt,
  openPlaylist,
  playlistsRowsView,
  refreshPlaylistsRows,
  removeTrack,
} from "../playlists/ui";

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
}) {
  const name = row.artist ? `${row.artist} - ${row.title}` : row.title;
  const play = () => {
    playRecords(resolvePlaylistRecords(playlist, libraryRecords()), row.position);
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
 * The playlists view's rows island: renders the shared list plus its empty
 * hint. The index shows every playlist; an open playlist shows its tracks
 * with reorder and remove actions. The inline rename still runs imperatively
 * inside a row, then recomputes the snapshot through refreshPlaylistsRows.
 */
export function PlaylistsRows() {
  const view = playlistsRowsView.value;
  const listRef = useRef<HTMLUListElement>(null);
  const hint = (
    <div class="library__empty" hidden={!view.empty}>
      {view.emptyText}
    </div>
  );

  if (view.kind === "index") {
    const renameRow = (id: string) => {
      const playlist = findPlaylistById(id);
      if (playlist && listRef.current) {
        startInlineRename(playlist, listRef.current, refreshPlaylistsRows);
      }
    };
    return (
      <>
        {hint}
        <ul class="library__list" ref={listRef}>
          {view.rows.map((row) => (
            <IndexRow key={row.id} row={row} onRename={renameRow} />
          ))}
        </ul>
      </>
    );
  }

  const playlist = getOpenPlaylist();
  if (!playlist) {
    return null;
  }
  return (
    <>
      {hint}
      <ul class="library__list" ref={listRef}>
        {view.rows.map((row) => (
          <TrackRow key={row.id} row={row} playlist={playlist} />
        ))}
      </ul>
    </>
  );
}
