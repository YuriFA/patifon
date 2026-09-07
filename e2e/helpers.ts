import { expect, type Page } from "@playwright/test";

declare global {
  interface Window {
    player: import("../src/audio-player").default;
    mediaSessionHandlers?: Map<string, (details?: { seekTime?: number }) => void>;
    mediaSessionPositions?: Array<{ duration: number; playbackRate: number; position: number }>;
  }
}

export function makeSineWav(seconds = 20, sampleRate = 44100, frequency = 440): Uint8Array {
  const samples = seconds * sampleRate;
  const dataSize = samples * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8, "ascii");
  buffer.write("fmt ", 12, "ascii");
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36, "ascii");
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples; i += 1) {
    buffer.writeInt16LE(
      Math.round(Math.sin((2 * Math.PI * frequency * i) / sampleRate) * 12000),
      44 + i * 2,
    );
  }
  return new Uint8Array(buffer);
}

const wavBytes = makeSineWav();

/**
 * Imports one audio track by simulating a drop with an in-memory WAV file,
 * so no binary fixture lives in the repository.
 */
export async function dropFile(page: Page, fileName: string, seconds?: number): Promise<void> {
  const data = seconds ? makeSineWav(seconds) : wavBytes;
  await page.evaluate(
    ({ name, data: fileData }) => {
      const file = new File([new Uint8Array(fileData)], name, { type: "audio/wav" });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      document.body.dispatchEvent(new DragEvent("drop", { dataTransfer: transfer, bubbles: true }));
    },
    { name: fileName, data },
  );
}

export async function expectRowCount(page: Page, count: number): Promise<void> {
  await expect(page.locator(".library__row")).toHaveCount(count);
}

export async function seedLibrary(page: Page): Promise<void> {
  await page.goto("/");
  await dropFile(page, "Artist - Test Track.wav");
  await expectRowCount(page, 1);
}

export function progressWidth(page: Page): Promise<number> {
  return page
    .locator(".progress__bar .slider-horiz__filled")
    .evaluate((el) => Number(el.style.width.replace("%", "")));
}

export interface TaggedWavOptions {
  title: string;
  artist?: string;
  album?: string;
  artwork?: boolean;
}

const pngPixel = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

function id3Frame(id: string, payload: Buffer): Buffer {
  const header = Buffer.alloc(10);
  header.write(id, 0, "ascii");
  header.writeUInt32BE(payload.length, 4);
  return Buffer.concat([header, payload]);
}

function id3TextFrame(id: string, text: string): Buffer {
  return id3Frame(id, Buffer.concat([Buffer.from([0]), Buffer.from(text, "latin1")]));
}

function id3ApicFrame(png: Buffer): Buffer {
  return id3Frame(
    "APIC",
    Buffer.concat([
      Buffer.from([0]),
      Buffer.from("image/png\0", "latin1"),
      Buffer.from([3]),
      Buffer.from("\0", "latin1"),
      png,
    ]),
  );
}

function synchsafe(n: number): Buffer {
  return Buffer.from([(n >> 21) & 0x7f, (n >> 14) & 0x7f, (n >> 7) & 0x7f, n & 0x7f]);
}

function uint32le(n: number): Buffer {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n, 0);
  return b;
}

/**
 * A playable WAV carrying an "ID3 " RIFF chunk (tags + embedded PNG cover):
 * music-metadata reads the chunk, browsers skip it and play the audio.
 */
export function makeTaggedWav(seconds: number, options: TaggedWavOptions): Uint8Array {
  const frames: Buffer[] = [id3TextFrame("TIT2", options.title)];
  if (options.artist) {
    frames.push(id3TextFrame("TPE1", options.artist));
  }
  if (options.album) {
    frames.push(id3TextFrame("TALB", options.album));
  }
  if (options.artwork) {
    frames.push(id3ApicFrame(pngPixel));
  }
  const frameBytes = Buffer.concat(frames);
  let id3 = Buffer.concat([
    Buffer.from("ID3", "ascii"),
    Buffer.from([3, 0, 0]),
    synchsafe(frameBytes.length),
    frameBytes,
  ]);
  if (id3.length % 2) {
    id3 = Buffer.concat([id3, Buffer.from([0])]);
  }

  const wav = makeSineWav(seconds);
  const pcm = wav.subarray(44);
  const dataSize = pcm.length;
  const fmtBody = Buffer.concat([Buffer.from([1, 0, 1, 0]), Buffer.alloc(12)]);
  fmtBody.writeUInt32LE(44100, 4);
  fmtBody.writeUInt32LE(44100 * 2, 8);
  fmtBody.writeUInt16LE(2, 12);
  fmtBody.writeUInt16LE(16, 14);
  const riffSize = 4 + (8 + 16) + (8 + id3.length) + (8 + dataSize);
  const tagged = Buffer.concat([
    Buffer.from("RIFF", "ascii"),
    uint32le(riffSize),
    Buffer.from("WAVE", "ascii"),
    Buffer.from("fmt ", "ascii"),
    uint32le(16),
    fmtBody,
    Buffer.from("ID3 ", "ascii"),
    uint32le(id3.length),
    id3,
    Buffer.from("data", "ascii"),
    uint32le(dataSize),
    pcm,
  ]);
  return new Uint8Array(tagged);
}

/** Imports a tagged WAV via a drop, like dropFile, exercising the tag metadata path. */
export async function dropTaggedWav(
  page: Page,
  fileName: string,
  options: TaggedWavOptions,
): Promise<void> {
  const data = makeTaggedWav(20, options);
  await page.evaluate(
    ({ name, data: fileData }) => {
      const file = new File([new Uint8Array(fileData)], name, { type: "audio/wav" });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      document.body.dispatchEvent(new DragEvent("drop", { dataTransfer: transfer, bubbles: true }));
    },
    { name: fileName, data },
  );
}

/** Captures media session registrations before the app runs so tests can invoke handlers directly. */
export async function captureMediaSession(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const handlers = new Map<string, (details?: { seekTime?: number }) => void>();
    const positions: Array<{ duration: number; playbackRate: number; position: number }> = [];
    window.mediaSessionHandlers = handlers;
    window.mediaSessionPositions = positions;
    navigator.mediaSession.setActionHandler = ((
      action: string,
      handler: ((details?: { seekTime?: number }) => void) | null,
    ) => {
      if (handler) {
        handlers.set(action, handler);
      } else {
        handlers.delete(action);
      }
    }) as typeof navigator.mediaSession.setActionHandler;
    navigator.mediaSession.setPositionState = ((state: {
      duration: number;
      playbackRate: number;
      position: number;
    }) => {
      positions.push(state);
    }) as typeof navigator.mediaSession.setPositionState;
  });
}

/** Invokes a captured media session action handler, as an OS media surface would. */
export async function invokeMediaAction(
  page: Page,
  action: string,
  details?: { seekTime?: number },
): Promise<void> {
  await page.evaluate(
    ({ action: a, details: d }) => {
      const handler = window.mediaSessionHandlers?.get(a);
      if (!handler) {
        throw new Error(`no media session handler registered for "${a}"`);
      }
      handler(d);
    },
    { action, details },
  );
}

export interface MediaSessionState {
  playbackState: string;
  metadata: { title: string; artist: string; album: string; artwork: string[] } | null;
}

export function readMediaSessionState(page: Page): Promise<MediaSessionState> {
  return page.evaluate(() => {
    const metadata = navigator.mediaSession.metadata;
    return {
      playbackState: navigator.mediaSession.playbackState,
      metadata: metadata
        ? {
            title: metadata.title,
            artist: metadata.artist,
            album: metadata.album,
            artwork: [...metadata.artwork].map((a) => a.src),
          }
        : null,
    };
  });
}

export function readMediaSessionPositions(
  page: Page,
): Promise<Array<{ duration: number; playbackRate: number; position: number }>> {
  return page.evaluate(() => window.mediaSessionPositions ?? []);
}

/** Makes `navigator.mediaSession` disappear before the app runs (graceful degradation). */
export async function withoutMediaSession(page: Page): Promise<void> {
  await page.addInitScript(() => {
    delete (Navigator.prototype as unknown as { mediaSession?: unknown }).mediaSession;
  });
}
