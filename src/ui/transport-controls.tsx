import type { ComponentChildren } from "preact";
import type AudioPlayer from "../audio-player";
import { bridge } from "./bridge";
import { isStationEngaged, toggleStationPlayback } from "../radio/ui";
import { PauseIcon, PlayIcon, SkipBackIcon, SkipForwardIcon } from "./icons";

interface TransportButtonProps {
  className: string;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  children: ComponentChildren;
}

function TransportButton({ className, title, onClick, disabled, children }: TransportButtonProps) {
  return (
    <button
      class={`mech-button player-controls__btn ${className}`}
      type="button"
      title={title}
      aria-label={title}
      aria-disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/**
 * The transport island: prev/play/next mech buttons with the canonical
 * lucide glyphs. The play button carries the latched look while playing.
 * The glyph and the routing follow the engaged source - radio and library
 * share the deck (times live in the strip row).
 */
export function TransportControls({ player }: { player: AudioPlayer }) {
  const playing = bridge.playing.value;
  const radioEngaged = bridge.source.value === "radio";

  const togglePlay = () => {
    if (isStationEngaged()) {
      toggleStationPlayback();
      return;
    }
    if (player.isPlaying) {
      player.pause();
    } else {
      void player.play();
    }
  };
  const step = (method: "playPrev" | "playNext") => () => {
    if (!radioEngaged) void player[method]();
  };

  return (
    <>
      <TransportButton
        className="player-controls__btn_prev"
        title="Previous track"
        onClick={step("playPrev")}
        disabled={radioEngaged}
      >
        <SkipBackIcon size={24} />
      </TransportButton>
      <TransportButton
        className={`player-controls__btn_play${playing ? " player-controls__btn_pause is-on" : ""}`}
        title={playing ? "Pause" : "Play"}
        onClick={togglePlay}
      >
        {playing ? <PauseIcon size={28} /> : <PlayIcon size={28} />}
      </TransportButton>
      <TransportButton
        className="player-controls__btn_next"
        title="Next track"
        onClick={step("playNext")}
        disabled={radioEngaged}
      >
        <SkipForwardIcon size={24} />
      </TransportButton>
    </>
  );
}
