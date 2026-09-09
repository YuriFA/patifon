import type AudioPlayer from "./audio-player";

/**
 * Metadata of the currently playing track as advertised to OS media
 * surfaces (lock screen, notification area, media keys).
 */
export interface MediaSessionMetadata {
  title: string;
  artist: string;
  album: string | null;
  artworkUrl: string | null;
}

export type MetadataProvider = () => MediaSessionMetadata | null;

/**
 * A controllable playback source (library player, radio). OS transport
 * actions and metadata publication always address the active source.
 */
export interface MediaSessionSource {
  play(): void;
  pause(): void;
  state(): "playing" | "paused";
  metadata(): MediaSessionMetadata | null;
}

type MediaSessionNavigator = Navigator & { mediaSession: MediaSession };

function session(): MediaSession | null {
  if (!("mediaSession" in navigator)) {
    return null;
  }
  return (navigator as MediaSessionNavigator).mediaSession;
}

let librarySource: MediaSessionSource | null = null;
let radioSource: MediaSessionSource | null = null;

function activeSource(): MediaSessionSource | null {
  return radioSource ?? librarySource;
}

function setAction(
  ms: MediaSession,
  action: MediaSessionAction,
  handler: MediaSessionActionHandler,
): void {
  try {
    ms.setActionHandler(action, handler);
  } catch {
    // This browser does not support the action - skip it
  }
}

/** Registers transport actions; play/pause address the active source, prev/next/seek stay library-only. */
function registerTransportActions(ms: MediaSession): void {
  setAction(ms, "play", () => {
    activeSource()?.play();
  });
  setAction(ms, "pause", () => {
    activeSource()?.pause();
  });
  setAction(ms, "previoustrack", () => {
    if (libraryPlayer && !radioSource) {
      void libraryPlayer.playPrev();
    }
  });
  setAction(ms, "nexttrack", () => {
    if (libraryPlayer && !radioSource) {
      void libraryPlayer.playNext();
    }
  });
  setAction(ms, "seekto", (details) => {
    const { seekTime } = details;
    if (radioSource || seekTime === null || seekTime === undefined) {
      return;
    }
    if (libraryPlayer && libraryPlayer.duration > 0) {
      libraryPlayer.rewind(seekTime / libraryPlayer.duration);
    }
  });
}

let libraryPlayer: AudioPlayer | null = null;

/** Publishes the source's metadata; keeps previous metadata when the source cannot describe the track. */
function publishMetadata(ms: MediaSession, source: MediaSessionSource): void {
  const meta = source.metadata();
  if (!meta) {
    return;
  }
  ms.metadata = new MediaMetadata({
    title: meta.title,
    artist: meta.artist,
    album: meta.album ?? "",
    artwork: meta.artworkUrl ? [{ src: meta.artworkUrl }] : [],
  });
}

function publishActive(ms: MediaSession): void {
  const source = activeSource();
  if (!source) {
    return;
  }
  ms.playbackState = source.state();
  publishMetadata(ms, source);
}

/**
 * Switches the active transport source. Pass the radio source while a
 * station plays and `null` to hand control back to the library player.
 * The newly active source's state and metadata are published immediately.
 */
export function setActiveSource(source: MediaSessionSource | null): void {
  radioSource = source;
  const ms = session();
  if (!ms) {
    return;
  }
  publishActive(ms);
}

/** Republishes the active source's state and metadata (called on its state changes). */
export function refreshMediaSession(): void {
  const ms = session();
  if (ms) {
    publishActive(ms);
  }
}

/** Publishes current position/duration/rate; browsers rejecting a combination throw, which we swallow. */
function updateSessionPositionState(ms: MediaSession, player: AudioPlayer): void {
  const duration = player.duration;
  if (duration <= 0) {
    return;
  }
  try {
    ms.setPositionState({
      duration,
      playbackRate: player.playbackRate,
      position: Math.min(Math.max(player.position, 0), duration),
    });
  } catch {
    // Unsupported rate/duration combination in this browser
  }
}

/**
 * Wires the library player to the Media Session API: metadata, playback
 * state, position state and transport action handlers. The player is the
 * default transport source; radio replaces it via setActiveSource while a
 * station plays. Every registration is defensive - environments without
 * support degrade to plain playback with no errors.
 */
export function initMediaSession(player: AudioPlayer, metadataProvider: MetadataProvider): void {
  const ms = session();
  if (!ms) {
    return;
  }
  libraryPlayer = player;
  librarySource = {
    play: () => {
      void player.play();
    },
    pause: () => {
      player.pause();
    },
    state: () => (player.isPlaying ? "playing" : "paused"),
    metadata: metadataProvider,
  };

  registerTransportActions(ms);
  ms.playbackState = "paused";
  player.on("track:play", () => {
    if (!radioSource) {
      ms.playbackState = "playing";
      publishMetadata(ms, librarySource!);
    }
  });
  player.on("track:pause", () => {
    if (!radioSource) {
      ms.playbackState = "paused";
    }
  });
  player.on("track:timeupdate", () => {
    updateSessionPositionState(ms, player);
  });
}
