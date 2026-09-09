import type { MediaSessionSource } from "../media-session";
import type { RadioStation } from "./api";
import { stationTags } from "./rows";

export interface RadioSessionDeps {
  resumeStation(): Promise<void>;
  pauseStation(): void;
  radioState(): "playing" | "paused" | "stopped" | "error";
}

/**
 * Maps a radio station onto the shared media-session source contract
 * (transport actions + metadata for OS surfaces).
 */
export function stationMetadata(station: RadioStation) {
  return {
    title: station.name,
    artist: stationTags(station),
    album: null,
    artworkUrl: station.favicon || null,
  };
}

export function createStationSource(
  deps: RadioSessionDeps,
  getStation: () => RadioStation | null,
): MediaSessionSource {
  return {
    play: () => {
      void deps.resumeStation();
    },
    pause: () => {
      deps.pauseStation();
    },
    state: () => (deps.radioState() === "playing" ? "playing" : "paused"),
    metadata: () => {
      const station = getStation();
      return station ? stationMetadata(station) : null;
    },
  };
}
