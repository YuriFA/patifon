import type { LibraryRecord } from "../library/store";
import { saveWaveform } from "./store";

/** Envelope resolution: roughly 2x device columns of the 15px-tall strip. */
const BUCKETS = 600;

/**
 * Sequential peak-computation queue: one decodeAudioData at a time, so a mass
 * import never forks hundreds of full-file decodes in parallel. Jobs are
 * deduplicated by track id; failures are swallowed (the track keeps the plain
 * progress line).
 */
const queue: LibraryRecord[] = [];
let running = false;

const readyListeners = new Set<(trackId: string) => void>();

export function onWaveformReady(listener: (trackId: string) => void): () => void {
  readyListeners.add(listener);
  return () => {
    readyListeners.delete(listener);
  };
}

export function enqueuePeakJob(record: LibraryRecord): void {
  if (queue.some((entry) => entry.id === record.id)) {
    return;
  }
  queue.push(record);
  void runNext();
}

async function runNext(): Promise<void> {
  if (running) {
    return;
  }
  const record = queue.shift();
  if (!record) {
    return;
  }
  running = true;
  try {
    await computeAndStore(record);
    for (const listener of readyListeners) {
      listener(record.id);
    }
  } catch {
    // undecodable container: no waveform record, the plain line stays
  } finally {
    running = false;
    void runNext();
  }
}

/** Reduces the decoded track to interleaved min/max pairs per bucket. */
export function computePeaks(
  buffer: AudioBuffer,
  buckets = BUCKETS,
): { peaks: number[]; bucketMs: number } {
  const length = buffer.length;
  const size = Math.max(1, Math.floor(length / buckets));
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) =>
    buffer.getChannelData(i),
  );
  const peaks: number[] = [];

  for (let bucket = 0; bucket < buckets; bucket++) {
    const start = bucket * size;
    const end = Math.min(length, start + size);
    let min = 0;
    let max = 0;
    for (const data of channels) {
      for (let i = start; i < end; i++) {
        const sample = data[i];
        if (sample < min) {
          min = sample;
        }
        if (sample > max) {
          max = sample;
        }
      }
    }
    peaks.push(min, max);
  }
  const bucketMs = (buffer.duration * 1000) / buckets;
  return { peaks, bucketMs };
}

/** Decodes the persisted file blob and stores its peaks under the track id. */
export async function computeAndStore(record: LibraryRecord): Promise<void> {
  const arrayBuffer = await record.file.arrayBuffer();
  // decode-only context: no playback, no autoplay policy interference
  const context = new OfflineAudioContext(1, 1, 44100);
  const buffer = await context.decodeAudioData(arrayBuffer);
  const { peaks, bucketMs } = computePeaks(buffer);
  await saveWaveform(record.id, { peaks, bucketMs, computedAt: Date.now() });
}
