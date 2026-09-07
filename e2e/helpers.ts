import { expect, type Page } from "@playwright/test";

declare global {
  interface Window {
    player: import("../src/audio-player").default;
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
