import type AudioPlayer from "../audio-player";
import { formatDuration } from "../utils";
import { bridge } from "./bridge";

/**
 * The live badge (radio): occupies the total-time slot while a station is
 * engaged - bright while playing, dimmed while paused, hidden on stop and
 * stream errors (the radio deck carries the error state instead).
 */
function LiveBadge() {
  const state = bridge.radioState.value;
  const dim = state === "paused";
  const visible = state === "playing" || dim;
  if (!visible) {
    return null;
  }
  return (
    <span class={`deck__time deck__time_total progress__live${dim ? " progress__live_dim" : ""}`}>
      Live
    </span>
  );
}

/**
 * The seek control: the deck strip row's time - lane - time layout. The lane
 * is a native range input layered invisibly over the styled track (which also
 * hosts the waveform strip canvas mounted by the vanilla strip module).
 * Keyboard, pointer and assistive-tech semantics come from the platform;
 * disabled for live sources - radio seeks through the station's own logic.
 */
export function SeekBar({ player }: { player: AudioPlayer }) {
  const duration = bridge.duration.value;
  const seekable = duration > 0;
  const ratio = seekable ? bridge.position.value / duration : 0;
  const percent = ratio * 100;
  const radioOwns = bridge.source.value === "radio";

  return (
    <>
      <span class="deck__time deck__time_now" aria-hidden="true">
        {seekable ? formatDuration(bridge.position.value) : ""}
      </span>
      <div class="progress__bar">
        <div class="slider-horiz__track" aria-hidden="true" />
        <div class="slider-horiz__buffer" style={{ width: `${bridge.buffered.value * 100}%` }} />
        <div class="slider-horiz__filled" style={{ width: `${percent}%` }} />
        <div class="slider-horiz__handle" style={{ left: `${percent}%` }} />
        <input
          class="slider-input"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={ratio}
          disabled={!seekable}
          aria-label="Seek"
          onInput={(event) => player.rewind(Number(event.currentTarget.value))}
        />
      </div>
      {radioOwns ? (
        <LiveBadge />
      ) : (
        <span class="deck__time deck__time_total" aria-hidden="true">
          {seekable ? formatDuration(duration) : ""}
        </span>
      )}
    </>
  );
}
