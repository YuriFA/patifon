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

type MediaSessionNavigator = Navigator & { mediaSession: MediaSession };

function audioFromEvent(event: unknown): HTMLAudioElement | null {
  const target = (event as Event | undefined)?.target;
  return target instanceof HTMLAudioElement ? target : null;
}

function setAction(
  session: MediaSession,
  action: MediaSessionAction,
  handler: MediaSessionActionHandler,
): void {
  try {
    session.setActionHandler(action, handler);
  } catch {
    // This browser does not support the action - skip it
  }
}

/** Registers transport actions mapping onto the same player methods the page controls use. */
function registerTransportActions(player: AudioPlayer, session: MediaSession): void {
  setAction(session, "play", () => {
    void player.play();
  });
  setAction(session, "pause", () => {
    player.pause();
  });
  setAction(session, "previoustrack", () => {
    void player.playPrev();
  });
  setAction(session, "nexttrack", () => {
    void player.playNext();
  });
  setAction(session, "seekto", (details) => {
    const { seekTime } = details;
    if (seekTime !== null && seekTime !== undefined && player.duration > 0) {
      player.rewind(seekTime / player.duration);
    }
  });
}

/** Publishes provider metadata; keeps previous metadata when the provider cannot describe the track. */
function updateSessionMetadata(session: MediaSession, metadataProvider: MetadataProvider): void {
  const meta = metadataProvider();
  if (!meta) {
    return;
  }
  session.metadata = new MediaMetadata({
    title: meta.title,
    artist: meta.artist,
    album: meta.album ?? "",
    artwork: meta.artworkUrl ? [{ src: meta.artworkUrl }] : [],
  });
}

/** Publishes current position/duration/rate; browsers rejecting a combination throw, which we swallow. */
function updateSessionPositionState(session: MediaSession, event: unknown): void {
  const audio = audioFromEvent(event);
  if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) {
    return;
  }
  try {
    session.setPositionState({
      duration: audio.duration,
      playbackRate: audio.playbackRate,
      position: Math.min(Math.max(audio.currentTime, 0), audio.duration),
    });
  } catch {
    // Unsupported rate/duration combination in this browser
  }
}

/**
 * Wires the player to the Media Session API: metadata, playback state,
 * position state and transport action handlers. Every registration is
 * defensive - environments without support degrade to plain playback
 * with no errors.
 */
export function initMediaSession(player: AudioPlayer, metadataProvider: MetadataProvider): void {
  if (!("mediaSession" in navigator)) {
    return;
  }
  const session = (navigator as MediaSessionNavigator).mediaSession;

  registerTransportActions(player, session);
  session.playbackState = "paused";
  player.on("track:play", () => {
    session.playbackState = "playing";
    updateSessionMetadata(session, metadataProvider);
  });
  player.on("track:pause", () => {
    session.playbackState = "paused";
  });
  player.on("track:timeupdate", (event) => {
    updateSessionPositionState(session, event);
  });
}
