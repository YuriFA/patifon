import { useState } from "preact/hooks";
import { PRESETS } from "../equalizer";
import type AudioPlayer from "../audio-player";
import { bridge } from "./bridge";
import { usePopup } from "./popup";
import { SlidersIcon } from "./icons";

const BAND_HZ = ["60", "170", "310", "600", "1k", "3k", "6k", "12k", "14k", "16k"];

/** Shown only while a radio station is engaged: the EQ shapes library audio. */
function RadioNotice() {
  return <p class="equalizer-popup__notice">Affects library playback only</p>;
}

function gainPercent(gain: number): number {
  return ((gain + 12) / 24) * 100;
}

function BandLegend() {
  return (
    <div class="equalizer-band__legend">
      <div class="equalizer-band__max">+12 dB</div>
      <div class="equalizer-band__zero">0 dB</div>
      <div class="equalizer-band__min">-12 dB</div>
    </div>
  );
}

function PresetSelect({ onApply }: { onApply: (name: string) => void }) {
  return (
    <select
      class="equalizer-popup__presets"
      title="Presets"
      aria-label="Equalizer preset"
      onChange={(event) => onApply(event.currentTarget.value)}
    >
      <option value="">Flat</option>
      {PRESETS.map((preset) => (
        <option key={preset.name} value={preset.name}>
          {preset.name}
        </option>
      ))}
    </select>
  );
}

function BandSlider({
  player,
  index,
  gain,
  onGain,
}: {
  player: AudioPlayer;
  index: number;
  gain: number;
  onGain: (index: number, gain: number) => void;
}) {
  const percent = gainPercent(gain);
  return (
    <div class="equalizer-band__control">
      <div class="equalizer-band__slider slider-vert">
        <div class="slider-vert__track" aria-hidden="true">
          <div class="slider-vert__filled" style={{ height: `${percent}%` }}>
            <div class="slider-vert__handle" />
          </div>
        </div>
        <input
          class="slider-input"
          type="range"
          min={-12}
          max={12}
          step={1}
          value={gain}
          aria-label={`${BAND_HZ[index]} band gain, decibels`}
          onInput={(event) => {
            const value = Number(event.currentTarget.value);
            onGain(index, value);
            player.changeBandGain(index, value);
          }}
        />
      </div>
      <span class="equalizer-band__hz">{BAND_HZ[index]}</span>
    </div>
  );
}

/**
 * The equalizer popup (Warm Earth): ten native vertical band sliders and the
 * preset selector over the existing player EQ. Sliders write their band gain
 * live while dragging; a preset applies to the graph and moves every slider.
 */
export function EqualizerPopup({ player }: { player: AudioPlayer }) {
  const { containerRef, open, toggle } = usePopup();
  const [gains, setGains] = useState<number[]>(() => BAND_HZ.map((_, i) => player.getBandGain(i)));

  const onGain = (index: number, value: number) => {
    setGains((current) => current.map((gain, i) => (i === index ? value : gain)));
  };

  const applyPreset = (name: string) => {
    const preset = PRESETS.find((candidate) => candidate.name === name);
    if (!preset) {
      return;
    }
    player.applyPreset(preset);
    setGains([...preset.data]);
  };

  return (
    <div class="player-controls__equalizer-container" ref={containerRef}>
      <button
        type="button"
        class={`mech-button player-controls__btn player-controls__btn_panel player-controls__btn_equalizer${open ? " is-on" : ""}`}
        title="Equalizer"
        aria-label="Equalizer"
        aria-expanded={open}
        onClick={toggle}
      >
        <SlidersIcon size={20} />
        <span class="player-controls__btn-label">EQ</span>
      </button>
      <div class={`equalizer-popup${open ? " equalizer-popup__open" : ""}`} hidden={!open}>
        {bridge.source.value === "radio" && <RadioNotice />}
        <div class="equalizer-popup__header">
          <PresetSelect onApply={applyPreset} />
        </div>
        <ul class="equalizer__bands">
          <li class="equalizer-band">
            <BandLegend />
          </li>
          {BAND_HZ.map((hz, i) => (
            <li class="equalizer-band" key={hz}>
              <BandSlider player={player} index={i} gain={gains[i]} onGain={onGain} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
