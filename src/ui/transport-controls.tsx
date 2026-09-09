import type { ComponentChildren } from "preact";
import type AudioPlayer from "../audio-player";
import { bridge } from "./bridge";
import { isStationEngaged, toggleStationPlayback } from "../radio/ui";
import { formatDuration } from "../utils";

function PlayGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5v14l11-7z" fill="currentColor" />
    </svg>
  );
}

function PauseGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 5h4v14H6zM14 5h4v14h-4z" fill="currentColor" />
    </svg>
  );
}

function PrevGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6h2v12H6zm3.5 6L18 6v12z" fill="currentColor" />
    </svg>
  );
}

function NextGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M16 6h2v12h-2zM6 6l8.5 6L6 18z" fill="currentColor" />
    </svg>
  );
}

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
      class={`player-controls__btn ${className}`}
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

function TimeReadout() {
  const seekable = bridge.duration.value > 0;
  if (!seekable) {
    return null;
  }
  return (
    <span class="player-controls__time">
      {formatDuration(bridge.position.value)} / {formatDuration(bridge.duration.value)}
    </span>
  );
}

/**
 * The transport island: prev/play/next plus the time readout. The glyph and
 * the routing follow the engaged source - radio and library share the bar.
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
        <PrevGlyph />
      </TransportButton>
      <TransportButton
        className={`player-controls__btn_play${playing ? " player-controls__btn_pause" : ""}`}
        title={playing ? "Pause" : "Play"}
        onClick={togglePlay}
      >
        {playing ? <PauseGlyph /> : <PlayGlyph />}
      </TransportButton>
      <TransportButton
        className="player-controls__btn_next"
        title="Next track"
        onClick={step("playNext")}
        disabled={radioEngaged}
      >
        <NextGlyph />
      </TransportButton>
      <TimeReadout />
    </>
  );
}
