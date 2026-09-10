/**
 * Media element events the player forwards on its typed bus as
 * `track:<event>` with the raw DOM event as payload.
 */
export const MEDIA_EVENTS_FORWARDED = [
  "progress",
  "loadeddata",
  "canplaythrough",
  "volumechange",
  "ratechange",
  "loadedmetadata",
  "timeupdate",
  "play",
  "pause",
] as const;

type ForwardedMediaEvent = (typeof MEDIA_EVENTS_FORWARDED)[number];

/**
 * The player's event contract: every forwarded media event with its listener
 * payload. Subscribing to a name outside this map is a compile-time error.
 */
export type AudioPlayerEvents = {
  [K in ForwardedMediaEvent as `track:${K}`]: Event;
};
