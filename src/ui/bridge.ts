import { signal } from "@preact/signals";
import type AudioPlayer from "../audio-player";
import {
  engageSource,
  getActiveSource,
  getMode,
  onModeChange,
  onSourceChange,
  type Mode,
  type SourceKind,
} from "../modes";
import {
  onRadioStateChange,
  pauseStation,
  radioState,
  resumeStation,
  type RadioPlaybackState,
} from "../radio/playback";
import { currentRecord, isPlayingLibrary, switchToLibrarySource } from "../library/source";

/**
 * The engaged station as the views see it: display data only - no stream URL
 * and no catalog record shape - so radio internals stay behind the feature.
 */
export interface BridgeStation {
  name: string;
  tags: string;
  bitrate: number;
  uuid: string;
}

/**
 * The one-way bridge from the vanilla playback core to Preact views: core
 * events write signals, components read them and issue commands through
 * `toggle` for engaged-source playback. No playback logic ever moves into
 * the reactive tree.
 */
export const bridge = {
  /** Seconds of the engaged source; 0 for live streams. */
  position: signal(0),
  /** Duration of the engaged source; 0 when unknown or live. */
  duration: signal(0),
  /** Buffered ratio (0..1) of the engaged library source. */
  buffered: signal(0),
  /** Whether the engaged source is audibly playing. */
  playing: signal(false),
  /** The source owning the transport, or null while idle. */
  source: signal<SourceKind | null>(null),
  radioState: signal<RadioPlaybackState>("stopped"),
  volume: signal(0),
  muted: signal(false),
  mode: signal<Mode>("library"),
  /** Library playback rate (0.5..2); radio never scales its stream. */
  playbackRate: signal(1),
  /** Active library track metadata for the transport panel; null clears it. */
  trackTitle: signal<string | null>(null),
  trackArtist: signal<string | null>(null),
  /** The engaged station's display data; null while no station is engaged. */
  station: signal<BridgeStation | null>(null),

  /**
   * Play/pause for the engaged source: an engaged station toggles through
   * its playback state machine, a library track through the player. While
   * idle it first engages the library the way a row activation does, so
   * the now-playing panel, MediaSession and scrobbling follow
   * transport-only playback too.
   */
  toggle(player: AudioPlayer): void {
    const source = getActiveSource();
    if (source === "radio") {
      const state = radioState();
      if (state === "playing") pauseStation();
      else if (state === "paused") void resumeStation();
      return;
    }
    if (player.isPlaying) {
      player.pause();
      return;
    }
    if (!source) {
      engageSource("library");
      if (!isPlayingLibrary()) switchToLibrarySource();
    }
    void player.play();
  },
};

/** Finite duration for the UI: live streams and unknown lengths report 0. */
function finiteDuration(player: AudioPlayer): number {
  const { duration } = player;
  return Number.isFinite(duration) ? duration : 0;
}

function syncPosition(player: AudioPlayer): void {
  // Radio takes over without unloading the library element, so late library
  // timeupdates still land here: while radio owns the transport both values
  // are forced to 0 and the strip shows the live state instead of stale digits.
  const radioOwns = getActiveSource() === "radio";
  bridge.position.value = radioOwns ? 0 : player.position;
  bridge.duration.value = radioOwns ? 0 : finiteDuration(player);
}

function syncPlayback(player: AudioPlayer): void {
  const source = getActiveSource();
  bridge.source.value = source;
  bridge.radioState.value = radioState();
  bridge.playing.value =
    source === "radio" ? bridge.radioState.value === "playing" : player.isPlaying;
  syncPosition(player);
  syncNowPlaying(source);
}

// Transport panel: the library variant carries the track metadata; the radio
// variant reads the station from `bridge.station` (written by the radio
// feature on engage/stop). Pause keeps the last shown content; the release
// clears it through the source change.
function syncNowPlaying(source: SourceKind | null): void {
  const record = source === "library" ? currentRecord() : null;
  bridge.trackTitle.value = record?.title ?? null;
  bridge.trackArtist.value = record?.artist ?? null;
}

/**
 * Subscribes the bridge to the core's typed events. Call once at boot, after
 * the player exists and before the islands mount.
 */
export function initBridge(player: AudioPlayer): void {
  onRadioStateChange(() => syncPlayback(player));

  for (const event of [
    "track:play",
    "track:pause",
    "track:loadeddata",
    "track:loadedmetadata",
  ] as const) {
    player.on(event, () => syncPlayback(player));
  }
  player.on("track:timeupdate", () => syncPosition(player));
  player.on("track:progress", () => {
    bridge.buffered.value = player.bufferedRatio;
  });

  // The native volumechange covers every volume/mute path: the setters, the
  // wheel, the slider. The core needs no extra event logic of its own.
  player.on("track:volumechange", () => {
    bridge.volume.value = player.volume;
    bridge.muted.value = player.muted;
  });
  bridge.volume.value = player.volume;
  bridge.muted.value = player.muted;

  // The element fires ratechange for setter changes; load() resets are
  // covered by defaultPlaybackRate, so this only mirrors real rate states.
  player.on("track:ratechange", () => {
    bridge.playbackRate.value = player.playbackRate;
  });
  bridge.playbackRate.value = player.playbackRate;

  onModeChange(({ mode }) => {
    bridge.mode.value = mode;
  });
  onSourceChange(() => syncPlayback(player));
  bridge.mode.value = getMode();
  syncPlayback(player);
}
