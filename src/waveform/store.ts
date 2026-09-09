import { idbGet, idbPut } from "../utils/idb";

const WAVEFORMS_STORE = "waveforms";

export interface WaveformRecord {
  /** Interleaved min/max amplitude pairs per bucket, each in -1..1. */
  peaks: number[];
  /** Track milliseconds covered by one bucket. */
  bucketMs: number;
  computedAt: number;
}

export function loadWaveform(trackId: string): Promise<WaveformRecord | undefined> {
  return idbGet<WaveformRecord>(WAVEFORMS_STORE, trackId);
}

export async function saveWaveform(trackId: string, record: WaveformRecord): Promise<void> {
  await idbPut(WAVEFORMS_STORE, record, trackId);
}
