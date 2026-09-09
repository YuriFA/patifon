import { signal } from "@preact/signals";
import type AudioPlayer from "../audio-player";
import {
  getActiveSource,
  getMode,
  onModeChange,
  onSourceChange,
  type Mode,
  type SourceKind,
} from "../modes";
import { onRadioStateChange, radioState, type RadioPlaybackState } from "../radio/playback";

/**
 * The one-way bridge from the vanilla playback core to Preact views: core
 * events write signals, components read them and call player/radio methods
 * for commands. No playback logic ever moves into the reactive tree.
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
};

/** Finite duration for the UI: live streams and unknown lengths report 0. */
function finiteDuration(player: AudioPlayer): number {
  const { duration } = player;
  return Number.isFinite(duration) ? duration : 0;
}

function syncPosition(player: AudioPlayer): void {
  bridge.position.value = player.position;
  bridge.duration.value = finiteDuration(player);
}

function syncPlayback(player: AudioPlayer): void {
  const source = getActiveSource();
  bridge.source.value = source;
  bridge.radioState.value = radioState();
  bridge.playing.value =
    source === "radio" ? bridge.radioState.value === "playing" : player.isPlaying;
  syncPosition(player);
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

  onModeChange(({ mode }) => {
    bridge.mode.value = mode;
  });
  onSourceChange(() => syncPlayback(player));
  bridge.mode.value = getMode();
  syncPlayback(player);
}
