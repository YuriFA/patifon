import { useEffect, useRef } from "preact/hooks";
import type AudioPlayer from "../audio-player";
import { Spectrum, type SpectrumFrame } from "../visualizer/spectrum";
import { spectrumStyle } from "../visualizer/spectrum-style";
import { renderMiniMeter } from "../visualizer/render";
import { bridge } from "./bridge";

const MINI_COLUMNS = 9;
const METER_WIDTH = 44;
const METER_HEIGHT = 28;

/** The panel's idle screen: an all-zero frame in the meter's own columns. */
const idleFrame: SpectrumFrame = {
  levels: new Float32Array(MINI_COLUMNS),
  peaks: new Float32Array(MINI_COLUMNS),
};

/**
 * The panel's live meter: a tiny canvas fed by the shared spectrum pipeline
 * (no second AnalyserNode, no second mapping). While paused the columns
 * sink through the same release path as the big renderer and then hold the
 * empty screen; the loop lives only while the panel is mounted.
 */
function NowPlayingMeter({ player }: { player: AudioPlayer }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas?.getContext("2d")) {
      return;
    }
    const spectrum = new Spectrum();
    spectrum.setColumns(MINI_COLUMNS);

    let raf = 0;
    const draw = () => {
      const analyser = player.analyser;
      let frame: SpectrumFrame | null;
      if (bridge.playing.value && analyser) {
        analyser.updateData();
        frame = spectrum.update(analyser.fFrequencyData, analyser.analyser.context.sampleRate);
      } else {
        frame = spectrum.decay() ?? idleFrame;
      }
      renderMiniMeter(canvas, frame, spectrumStyle.value);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [player]);

  return (
    <canvas ref={canvasRef} class="now-playing__meter" width={METER_WIDTH} height={METER_HEIGHT} />
  );
}

/**
 * The transport bar's now-playing panel (draft): for library playback a NOW
 * PLAYING label, the track's title - artist and a small live meter; for an
 * engaged station an ON AIR label with the station's name and no meter
 * (radio bypasses the analyser). Clears on release; pause keeps the content.
 */
export function NowPlaying({ player }: { player: AudioPlayer }) {
  if (bridge.source.value === "radio") {
    const station = bridge.station.value;
    if (!station) {
      return null;
    }
    return (
      <div class="now-playing glass-screen">
        <div class="now-playing__meta">
          <span class="now-playing__label">On air</span>
          <span class="now-playing__track">{station.name}</span>
        </div>
      </div>
    );
  }
  const title = bridge.trackTitle.value;
  if (!title) {
    return null;
  }
  const artist = bridge.trackArtist.value;

  return (
    <div class="now-playing glass-screen">
      <div class="now-playing__meta">
        <span class="now-playing__label">Now playing</span>
        <span class="now-playing__track">{artist ? `${title} - ${artist}` : title}</span>
      </div>
      <NowPlayingMeter player={player} />
    </div>
  );
}
