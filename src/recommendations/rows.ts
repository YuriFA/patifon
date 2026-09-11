import type { RecommendationPlaylistDetails, RecommendationTrack } from "./api";
import type { LibraryRecord } from "../library/store";

export interface ExpandedPlaylist {
  details: RecommendationPlaylistDetails;
  /** Per-track resolution against the library; null = not in library. */
  matches: Array<{ track: RecommendationTrack; record: LibraryRecord | null }>;
  loadError: boolean;
}

/** "2026-09-07 - 3/12 in library" summary for an expanded playlist row. */
export function playlistMeta(state: ExpandedPlaylist): string {
  const date = state.details.date ? state.details.date.slice(0, 10) : null;
  const matched = state.matches.filter((match) => match.record !== null).length;
  const counts = `${matched}/${state.matches.length} in library`;
  return date ? `${date} - ${counts}` : counts;
}
