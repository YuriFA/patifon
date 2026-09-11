import type { ExpandedPlaylist } from "../recommendations/rows";
import type { RecommendationsPlaylistView, RecommendationsTrackView } from "../recommendations/ui";
import {
  playMatched,
  recommendationsRowsView,
  saveLocally,
  toggleExpand,
} from "../recommendations/ui";

function SaveButton({ state }: { state: ExpandedPlaylist }) {
  return (
    <button
      type="button"
      class="library__row-action recommendations__save"
      title="Save as local playlist"
      onClick={(event) => {
        event.stopPropagation();
        saveLocally(state);
      }}
    >
      {"\u2913"}
    </button>
  );
}

function PlaylistRow({ row }: { row: RecommendationsPlaylistView }) {
  return (
    <li
      class="library__row playlists__row recommendations__row"
      onClick={() => void toggleExpand(row.playlist)}
    >
      <div class="library__meta">{row.playlist.title}</div>
      <div class="playlists__track-actions">
        {row.saving && row.state ? <SaveButton state={row.state} /> : null}
      </div>
      <span class="library__duration">{row.info}</span>
    </li>
  );
}

function TrackRow({
  row,
  track,
}: {
  row: RecommendationsPlaylistView;
  track: RecommendationsTrackView;
}) {
  const matched = track.id !== null;
  return (
    <li
      class={
        "library__row playlists__track recommendations__track" +
        (matched ? "" : " recommendations__track_missing") +
        (track.playing ? " library__row_playing" : "")
      }
      data-id={track.id ?? undefined}
      title={matched ? "" : "Not in library"}
      onClick={matched && row.state ? () => playMatched(row.state!, track.position) : undefined}
    >
      <div class="library__meta">{track.label}</div>
      <span class="library__duration">{track.duration}</span>
    </li>
  );
}

/**
 * The recommendations rows island: renders the created-for-you playlists and
 * their expanded tracks from the recommendationsRowsView snapshot signal,
 * replacing the vanilla replaceChildren row builders.
 */
export function RecommendationsRows() {
  const rows = recommendationsRowsView.value;
  return (
    <ul class="recommendations__list">
      {rows.flatMap((row) => [
        <PlaylistRow key={row.playlist.mbid} row={row} />,
        ...row.tracks.map((track) => (
          <TrackRow key={`${row.playlist.mbid}-${track.position}`} row={row} track={track} />
        )),
      ])}
    </ul>
  );
}
