import type AudioPlayer from "../audio-player";
import type { LibraryRecord } from "./store";
import { resetQueue, type QueueContext } from "../playlists/queue";
import { engageSource } from "../modes";

export interface TrackSourceView {
  src: string;
  name: string;
}

export interface SourceDeps {
  player: AudioPlayer;
  records: readonly LibraryRecord[];
  /** Builds the player-facing source for a record (object URL + title). */
  toSource(record: LibraryRecord): TrackSourceView;
  /** Notifies the owner that the effective order changed (badge re-render). */
  onOrderApplied(): void;
}

/**
 * The order the player's playlist is built from. It equals the library order
 * for library playback; the playlists module swaps in its own order (playlist
 * playback, queue insertions) without touching the library records, which
 * stay the pure library state.
 */
let deps: SourceDeps;
let order: LibraryRecord[] = [];
let playingLibrary = true;

export function initSource(deps_: SourceDeps): void {
  deps = deps_;
}

export function recordAt(index: number): LibraryRecord | null {
  return order[index] ?? null;
}

/**
 * Full record at the player's current index in the effective order (the
 * lyrics cache keys on artist/title and match LRCLIB by duration). Null
 * before the library init resolves and when the index has no record;
 * callers gate on the engaged source.
 */
export function currentRecord(): LibraryRecord | null {
  return deps ? recordAt(deps.player.currentTrackIndex) : null;
}

export function playbackOrder(): LibraryRecord[] {
  return order;
}

export function isPlayingLibrary(): boolean {
  return playingLibrary;
}

export const queueContext: QueueContext = {
  order: () => order,
  currentIndex: () => deps.player.currentTrackIndex,
  apply: (next) => {
    deps.player.setTracksPreservingCurrent(next.map((record) => deps.toSource(record)));
    deps.onOrderApplied();
  },
};

/** Points the source bookkeeping back at the library order. */
export function markLibrarySource(): void {
  playingLibrary = true;
  order = [...deps.records];
  resetQueue();
}

/** Takes the player order back from a playlist. */
export function switchToLibrarySource(): void {
  if (deps.player.isPlaying) {
    deps.player.stop();
  }
  markLibrarySource();
  deps.player.setTracksPreservingCurrent(order.map((record) => deps.toSource(record)));
}

/**
 * Plays an arbitrary order (a playlist) starting at the given position. The
 * order becomes the player's source: next/prev and highlight follow it until
 * a library row or a rebuild takes over.
 */
export function playRecords(next: LibraryRecord[], startIndex: number): void {
  engageSource("library");
  if (deps.player.isPlaying) {
    deps.player.stop();
  }
  playingLibrary = false;
  order = next;
  resetQueue();
  deps.player.setTracksPreservingCurrent(next.map((record) => deps.toSource(record)));
  void deps.player.play(startIndex);
}
