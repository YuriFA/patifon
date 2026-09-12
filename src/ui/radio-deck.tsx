import { effect } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";
import type AudioPlayer from "../audio-player";
import { useKnobVolume } from "./knob-volume";
import { bridge, type BridgeStation } from "./bridge";

/* The dial scale: 88-108 MHz, a labeled tick every 2 MHz. */
const SCALE_MIN = 88;
const SCALE_MAX = 108;
const SCALE_STEP = 2;
const TICKS = Array.from(
  { length: (SCALE_MAX - SCALE_MIN) / SCALE_STEP + 1 },
  (_, i) => SCALE_MIN + i * SCALE_STEP,
);

/**
 * The needle's deterministic pseudo-frequency: an FNV-1a hash of the station
 * uuid mapped onto 88.00-108.00 MHz. Stations carry no real frequency (net
 * streams), so the dial is decorative - but stable per station, as the spec
 * demands.
 */
function pseudoFrequency(uuid: string): number {
  let hash = 2166136261;
  for (const ch of uuid) {
    hash ^= ch.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return SCALE_MIN + ((hash >>> 0) % 2001) / 100;
}

/** Needle position as a 0..1 ratio within the scale lane; parked left on error. */
function needleRatio(uuid: string, error: boolean): number {
  if (error) {
    return 0;
  }
  return (pseudoFrequency(uuid) - SCALE_MIN) / (SCALE_MAX - SCALE_MIN);
}

/**
 * The dial's tick row: a labeled tick every 2 MHz, majors (every 4 MHz) tall
 * and bright. Positions are ratios of the scale lane.
 */
function DialTicks() {
  return (
    <>
      {TICKS.map((freq) => {
        const major = freq % 4 === 0;
        return (
          <span
            key={freq}
            class={`radio-deck__tick${major ? " radio-deck__tick_major" : ""}`}
            style={{ left: `${((freq - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100}%` }}
          >
            <span class="radio-deck__tick-line" aria-hidden="true" />
            <span class="radio-deck__tick-label">{freq}</span>
          </span>
        );
      })}
    </>
  );
}

/**
 * The full-width dial glass: band label, STEREO tell-tale, the 88-108 scale
 * and the red needle at the station's pseudo-frequency (parked left on a
 * stream error).
 */
function Dial({ uuid, error }: { uuid: string; error: boolean }) {
  const ratio = needleRatio(uuid, error);
  return (
    <div class="radio-deck__dial">
      <span class="radio-deck__band">FM · MHz</span>
      <span class="radio-deck__dial-stereo" aria-hidden="true">
        <span class="radio-deck__dial-led" />
        Stereo
      </span>
      <div class="radio-deck__scale">
        <DialTicks />
        <span class="radio-deck__needle-pos" style={{ left: `${ratio * 100}%` }}>
          <span class="radio-deck__needle" />
          <span class="radio-deck__needle-cap" />
        </span>
      </div>
      <span class="radio-deck__glass-shine" aria-hidden="true" />
    </div>
  );
}

/**
 * The station screen: name plus tags/bitrate on the warm dark glass. In the
 * error state it flickers NO SIGNAL instead of stale station data.
 */
function StationScreen({ station, error }: { station: BridgeStation | null; error: boolean }) {
  const meta =
    error || !station
      ? ""
      : [station.tags, station.bitrate > 0 ? `${station.bitrate} kbps` : ""]
          .filter(Boolean)
          .join(" · ");
  return (
    <div class="radio-deck__screen" aria-live="polite">
      {error ? (
        <span class="radio-deck__nosignal">No signal</span>
      ) : (
        <>
          <span class="radio-deck__station">{station?.name ?? ""}</span>
          <span class="radio-deck__meta">{meta}</span>
        </>
      )}
      <span class="radio-deck__glass-shine" aria-hidden="true" />
    </div>
  );
}

/**
 * The functional volume knob: a slider-role control writing the output
 * volume and reflecting external changes - the deck slider, mute - through
 * the bridge. Muted dims the knob.
 */
function VolumeKnob({ player }: { player: AudioPlayer }) {
  const knobRef = useRef<HTMLDivElement>(null);
  useKnobVolume(player, knobRef);

  const muted = bridge.muted.value;
  const percent = Math.round(bridge.volume.value * 100);
  // the sweep spans -135..+135 degrees like a real control's travel
  const angle = -135 + (percent / 100) * 270;

  return (
    <div class="radio-deck__knob-group">
      <div
        ref={knobRef}
        class={`radio-deck__knob${muted ? " radio-deck__knob_muted" : ""}`}
        role="slider"
        tabindex={0}
        aria-label="Volume"
        aria-orientation="vertical"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div class="radio-deck__knob-face" style={{ transform: `rotate(${angle}deg)` }}>
          <span class="radio-deck__knob-pointer" aria-hidden="true" />
        </div>
      </div>
      <span class="radio-deck__knob-label">Volume</span>
    </div>
  );
}

/** The tuning knob: same body, fixed detent - purely decorative. */
function TuningKnob() {
  return (
    <div class="radio-deck__knob-group" aria-hidden="true">
      <div class="radio-deck__knob radio-deck__knob_static">
        <div class="radio-deck__knob-face radio-deck__knob-face_detent">
          <span class="radio-deck__knob-pointer" />
        </div>
      </div>
      <span class="radio-deck__knob-label">Tuning</span>
    </div>
  );
}

/** Corner screws and feet: the receiver's static trim. */
function Trim() {
  return (
    <>
      <span class="radio-deck__screw radio-deck__screw_tl" aria-hidden="true" />
      <span class="radio-deck__screw radio-deck__screw_tr" aria-hidden="true" />
      <span class="radio-deck__screw radio-deck__screw_bl" aria-hidden="true" />
      <span class="radio-deck__screw radio-deck__screw_br" aria-hidden="true" />
      <span class="radio-deck__feet radio-deck__feet_left" aria-hidden="true" />
      <span class="radio-deck__feet radio-deck__feet_right" aria-hidden="true" />
    </>
  );
}

/** The telescopic antenna on the top edge; CSS folds it when not playing. */
function Antenna() {
  return (
    <span class="radio-deck__antenna" aria-hidden="true">
      <span class="radio-deck__antenna-base" />
      <span class="radio-deck__antenna-seg radio-deck__antenna-seg_thick" />
      <span class="radio-deck__antenna-seg radio-deck__antenna-seg_thin" />
      <span class="radio-deck__antenna-tip" />
    </span>
  );
}

/**
 * The radio deck (superdesign draft "mahogany receiver"): a tabletop radio
 * that owns the visualization area while a station is engaged. Playing lights
 * the glass and raises the antenna, paused dims it and folds the antenna, a
 * stream error flickers NO SIGNAL with the needle parked. DOM/CSS only -
 * no canvas, no WebGL - mirroring the vinyl deck.
 */
export function RadioDeck({ player }: { player: AudioPlayer }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const deck = rootRef.current;
    const sync = () => {
      if (deck) {
        deck.hidden = bridge.source.value !== "radio";
      }
    };
    sync();
    return effect(sync);
  }, []);

  const error = bridge.radioState.value === "error";
  const stateClass = bridge.playing.value
    ? " radio-deck_playing"
    : error
      ? " radio-deck_error"
      : " radio-deck_idle";

  return (
    <div ref={rootRef} class={`radio-deck${stateClass}`} hidden>
      <div class="radio-deck__body" aria-label="Radio receiver">
        <span class="radio-deck__sheen" aria-hidden="true" />
        <Trim />
        <Antenna />
        <span class="radio-deck__brand">Patifon · FM</span>
        <div class="radio-deck__grille-frame">
          <div class="radio-deck__grille">
            <span class="radio-deck__grille-vignette" aria-hidden="true" />
            <span class="radio-deck__stereo">Stereo</span>
          </div>
        </div>
        <div class="radio-deck__dial-wrap">
          <Dial uuid={bridge.station.value?.uuid ?? ""} error={error} />
        </div>
        <div class="radio-deck__controls">
          <VolumeKnob player={player} />
          <StationScreen station={bridge.station.value} error={error} />
          <TuningKnob />
        </div>
      </div>
    </div>
  );
}
