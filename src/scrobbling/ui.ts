import type AudioPlayer from "../audio-player";
import { initScrobblingTracker, type ScrobblingDeps } from "./listens";
import { loadScrobblingSettings } from "./settings";

/**
 * Scrobbling boot: settings hydration and the listen tracker (playing-now +
 * completed-listen submissions with the retry queue). The popup UI lives in
 * the ScrobblingPopup island.
 */
export function initScrobbling(player: AudioPlayer, deps: ScrobblingDeps): void {
  loadScrobblingSettings();
  initScrobblingTracker(player, deps);
}
