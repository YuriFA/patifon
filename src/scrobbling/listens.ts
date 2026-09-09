import type AudioPlayer from "../audio-player";
import type { LibraryRecord } from "../library/store";
import { enqueueListen, retryQueuedListens, spacedSubmit, toSubmittedListen } from "./queue";
import { isEnabled } from "./settings";

/** Submissions shorter than the rule are not sent (Last.fm-style convention). */
const MIN_LISTEN_SECONDS = 240;
/** Rapid switching keeps at most one playing-now per second (the API limit). */
const PLAYING_NOW_THROTTLE_MS = 1000;
/** A replay of the same record counts as a restart only from (near) its end. */
const RESTART_POSITION_S = 3;

export interface ScrobblingDeps {
  /** The library/playlist record the player's current index points at. */
  currentRecord: () => LibraryRecord | null;
}

interface TrackerDeps extends ScrobblingDeps {
  player: AudioPlayer;
}

let deps: TrackerDeps;
let playingRecord: LibraryRecord | null = null;
/** Furthest position listened to of the playing record; reset on switches. */
let lastPosition = 0;
let lastPlayingNowAt = 0;

function thresholdMet(record: LibraryRecord, position: number): boolean {
  const duration = record.duration || deps.player.duration;
  return duration > 0 && (position >= duration / 2 || position >= MIN_LISTEN_SECONDS);
}

function settleCompletion(): void {
  if (playingRecord && isEnabled() && thresholdMet(playingRecord, lastPosition)) {
    void enqueueListen(playingRecord);
  }
}

async function maybePlayingNow(record: LibraryRecord): Promise<void> {
  if (!isEnabled()) {
    return;
  }
  const now = Date.now();
  if (now - lastPlayingNowAt < PLAYING_NOW_THROTTLE_MS) {
    return;
  }
  lastPlayingNowAt = now;
  // transient by nature: failures are dropped, not queued
  await spacedSubmit(toSubmittedListen(record), "playing_now");
}

export function initScrobblingTracker(player: AudioPlayer, deps_: ScrobblingDeps): void {
  deps = { player, ...deps_ };

  player.on("track:play", () => {
    const record = deps.currentRecord();
    if (!record) {
      playingRecord = null;
      lastPosition = 0;
      return;
    }
    if (!playingRecord || record.id !== playingRecord.id) {
      // a switch: settle the previous record with its furthest position
      settleCompletion();
      playingRecord = record;
      lastPosition = player.position;
    } else if (
      player.position < RESTART_POSITION_S &&
      lastPosition > (record.duration || deps.player.duration) * 0.9
    ) {
      // natural end wrapped to the same record (single-track playlist): settle, restart
      settleCompletion();
      lastPosition = 0;
    } else {
      // resume or in-track seek: keep the furthest listened position
      lastPosition = Math.max(lastPosition, player.position);
    }
    void maybePlayingNow(record);
  });
  const trackPosition = () => {
    if (playingRecord) {
      lastPosition = Math.max(lastPosition, player.position);
    }
  };
  player.on("track:timeupdate", trackPosition);
  player.on("track:pause", trackPosition);

  window.addEventListener("online", retryQueuedListens);
  // leftover queue from a previous session
  retryQueuedListens();
}
