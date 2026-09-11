import { useEffect, useRef } from "preact/hooks";
import type AudioPlayer from "../audio-player";
import { bridge } from "./bridge";

const BARS = 16;
const METER_WIDTH = 44;
const METER_HEIGHT = 22;

/**
 * The panel's live meter: a tiny canvas fed by the same analyser the
 * visualizers use (no second AnalyserNode). Draws only while a library track
 * is audibly playing.
 */
function NowPlayingMeter({ player }: { player: AudioPlayer }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx2d = canvas?.getContext("2d");
    if (!canvas || !ctx2d) {
      return;
    }

    const accent = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
    ctx2d.fillStyle = accent || "#0f766e";

    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const analyser = player.analyser;
      ctx2d.clearRect(0, 0, METER_WIDTH, METER_HEIGHT);
      if (!analyser || !bridge.playing.value) {
        return;
      }
      analyser.updateData();
      const data = analyser.fFrequencyData;
      // log-ish sampling over the bins keeps the bars music-shaped
      const step = Math.floor(data.length / 64);
      for (let bar = 0; bar < BARS; bar++) {
        const bin = Math.floor((bar / BARS) * 48) * step;
        const level = (Math.max(-72, data[bin]) + 72) / 72;
        const h = Math.max(2, level * METER_HEIGHT);
        ctx2d.fillRect(bar * 3, METER_HEIGHT - h, 2, h);
      }
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [player]);

  return (
    <canvas ref={canvasRef} class="now-playing__meter" width={METER_WIDTH} height={METER_HEIGHT} />
  );
}

/**
 * The transport bar's now-playing panel (draft): NOW PLAYING label, the
 * library track's title - artist, and a small live meter. Library playback
 * only - radio keeps its station card and the panel clears (spec).
 */
export function NowPlaying({ player }: { player: AudioPlayer }) {
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
