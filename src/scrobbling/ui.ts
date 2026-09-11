import type AudioPlayer from "../audio-player";
import { initScrobblingTracker } from "./listens";

/**
 * Scrobbling boot: the listen tracker (playing-now + completed-listen
 * submissions with the retry queue). Settings hydration happens where the
 * state is first read - the ScrobblingPopup island's state initializer.
 */
export function initScrobbling(player: AudioPlayer): void {
  initScrobblingTracker(player);
}
