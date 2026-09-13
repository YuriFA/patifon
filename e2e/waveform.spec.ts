import { expect, test, type Page } from "@playwright/test";
import { dropFile, expectRowCount, progressWidth, waitForAppReady } from "./helpers";
import { mockCatalog, searchAndPlayFirst } from "./radio.helpers";

/** Counts OfflineAudioContext.decodeAudioData calls across reloads. */
async function installDecodeCounter(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const proto = OfflineAudioContext.prototype as unknown as {
      decodeAudioData: (...args: unknown[]) => Promise<AudioBuffer>;
    };
    const original = proto.decodeAudioData;
    proto.decodeAudioData = function (...args: unknown[]) {
      const count = Number(sessionStorage.getItem("decodeCount") ?? "0") + 1;
      sessionStorage.setItem("decodeCount", String(count));
      return original.apply(this, args);
    };
  });
}

function decodeCount(page: Page): Promise<number> {
  return page.evaluate(() => Number(sessionStorage.getItem("decodeCount") ?? "0"));
}

function hasWave(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.querySelector(".progress")?.classList.contains("progress_wave") ?? false,
  );
}

function readWaveformRecord(page: Page): Promise<unknown> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("audio-player");
      request.addEventListener("success", () => resolve(request.result));
      request.addEventListener("error", () => reject(request.error));
    });
    const trackId = await new Promise<string | null>((resolve) => {
      const tx = db.transaction("tracks", "readonly");
      const getAll = tx.objectStore("tracks").getAll();
      getAll.addEventListener("success", () => {
        const records = getAll.result as Array<{ id: string }>;
        resolve(records[0]?.id ?? null);
      });
    });
    const waveform = await new Promise<unknown>((resolve) => {
      if (trackId === null) {
        resolve(null);
        return;
      }
      const tx = db.transaction("waveforms", "readonly");
      const get = tx.objectStore("waveforms").get(trackId);
      get.addEventListener("success", () => resolve(get.result ?? null));
    });
    db.close();
    return waveform;
  });
}

test("import produces cached peaks and a later play skips the decode", async ({ page }) => {
  await installDecodeCounter(page);
  await page.goto("/");
  await waitForAppReady(page);
  await dropFile(page, "Alpha - First.wav");
  await expectRowCount(page, 1);

  // the import pipeline decoded the file once to compute peaks
  await expect.poll(() => decodeCount(page)).toBe(1);
  await expect.poll(() => readWaveformRecord(page)).not.toBeNull();

  await page.locator(".library__row").nth(0).click();
  await expect.poll(() => hasWave(page)).toBe(true);

  // a reload and a second play render from cache: no new decode
  await page.reload();
  await waitForAppReady(page);
  await page.locator(".library__row").nth(0).click();
  await expect.poll(() => hasWave(page)).toBe(true);
  expect(await decodeCount(page)).toBe(1);
});

test("a broken container imports cleanly and keeps the plain progress line", async ({ page }) => {
  await installDecodeCounter(page);
  await page.goto("/");
  await waitForAppReady(page);
  await page.evaluate(() => {
    const garbage = new Uint8Array(2048).fill(0x5a);
    const file = new File([garbage], "broken - Song.wav", { type: "audio/wav" });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    document.body.dispatchEvent(new DragEvent("drop", { dataTransfer: transfer, bubbles: true }));
  });
  await expectRowCount(page, 1);

  // decode attempted and rejected: no waveform record, no strip
  await expect.poll(() => decodeCount(page)).toBe(1);
  expect(await readWaveformRecord(page)).toBeNull();

  await page.locator(".library__row").nth(0).click();
  await page.waitForTimeout(500);
  expect(await hasWave(page)).toBe(false);
});

test("radio keeps the plain progress line", async ({ page }) => {
  await mockCatalog(page);
  await page.goto("/");
  await waitForAppReady(page);
  await searchAndPlayFirst(page);
  await expect(page.locator(".progress__live")).toBeVisible();
  expect(await hasWave(page)).toBe(false);
});

test("radio mode shows the plain line for library playback and the wave resumes on return", async ({
  page,
}) => {
  await mockCatalog(page);
  await page.goto("/");
  await waitForAppReady(page);
  await dropFile(page, "Alpha - First.wav", 20);
  await expectRowCount(page, 1);
  await page.locator(".library__row").nth(0).click();
  await expect.poll(() => hasWave(page)).toBe(true);

  // browsing radio mode while the track plays clears the wave; the plain
  // fader-styled progress line must stay visible and keep moving
  await page.click(".library__mode");
  await expect.poll(() => hasWave(page)).toBe(false);
  const fill = page.locator(".progress__bar .slider-horiz__filled");
  await expect(fill).toHaveCSS("background-color", "rgb(15, 118, 110)");
  await expect(page.locator(".progress__bar .slider-horiz__track")).toHaveCSS(
    "background-color",
    "rgb(241, 238, 226)",
  );
  await page.waitForTimeout(1500);
  expect(await progressWidth(page)).toBeGreaterThan(1);

  // returning to the library view brings the wave back without a restart
  await page.click(".library__mode-library");
  await expect.poll(() => hasWave(page)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.player.isPlaying)).toBe(true);
});

test("a legacy track gains its wave mid-playback via lazy backfill", async ({ page }) => {
  await installDecodeCounter(page);
  await page.goto("/");
  await waitForAppReady(page);
  await dropFile(page, "Alpha - First.wav");
  await expectRowCount(page, 1);
  await expect.poll(() => decodeCount(page)).toBe(1);

  // the import decode must have landed before the delete can race it
  await expect.poll(() => readWaveformRecord(page)).not.toBeNull();

  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("audio-player");
      request.addEventListener("success", () => resolve(request.result));
      request.addEventListener("error", () => reject(request.error));
    });
    const trackId = await new Promise<string | null>((resolve) => {
      const tx = db.transaction("tracks", "readonly");
      const getAll = tx.objectStore("tracks").getAll();
      getAll.addEventListener("success", () => {
        const records = getAll.result as Array<{ id: string }>;
        resolve(records[0]?.id ?? null);
      });
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("waveforms", "readwrite");
      tx.objectStore("waveforms").delete(trackId as string);
      tx.addEventListener("complete", () => resolve());
      tx.addEventListener("error", () => reject(tx.error));
    });
    db.close();
  });

  await page.reload();
  await waitForAppReady(page);
  // plain line while the peaks are missing
  expect(await hasWave(page)).toBe(false);

  await page.locator(".library__row").nth(0).click();
  await expect.poll(() => hasWave(page)).toBe(true);
  await expect.poll(() => decodeCount(page)).toBe(2);
});

test("seeking through the strip matches the plain slider semantics", async ({ page }) => {
  await page.goto("/");
  await waitForAppReady(page);
  await dropFile(page, "Alpha - First.wav", 20);
  await expectRowCount(page, 1);
  await expect.poll(() => readWaveformRecord(page)).not.toBeNull();

  await page.locator(".library__row").nth(0).click();
  await expect.poll(() => hasWave(page)).toBe(true);
  await page.waitForTimeout(300);

  const duration = await page.evaluate(() => window.player.duration);
  expect(duration).toBeGreaterThan(0);

  // click the middle of the strip: the slider underneath maps it to a ratio
  const bar = page.locator(".progress__bar");
  const box = await bar.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.click(box!.x + box!.width * 0.5, box!.y + box!.height / 2);

  await expect
    .poll(async () => {
      const position = await page.evaluate(() => window.player.position);
      return position / duration;
    })
    .toBeGreaterThan(0.4);
  const finalRatio = (await page.evaluate(() => window.player.position)) / duration;
  expect(finalRatio).toBeLessThan(0.6);
});

test("the wave is one continuous silhouette with the times at the strip ends", async ({ page }) => {
  await page.goto("/");
  await waitForAppReady(page);
  await dropFile(page, "Alpha - First.wav", 20);
  await expectRowCount(page, 1);
  await page.locator(".library__row").nth(0).click();
  await expect.poll(() => hasWave(page)).toBe(true);

  // no gap column between the lane edges: every x has painted pixels
  const gapColumn = await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>(".progress__wave");
    if (!canvas) {
      return -2;
    }
    const ctx = canvas.getContext("2d")!;
    const { width, height } = canvas;
    const data = ctx.getImageData(0, 0, width, height).data;
    for (let x = 0; x < width; x++) {
      let painted = false;
      for (let y = 0; y < height; y += 2) {
        if (data[(y * width + x) * 4 + 3] > 0) {
          painted = true;
          break;
        }
      }
      if (!painted) {
        return x;
      }
    }
    return -1;
  });
  expect(gapColumn).toBe(-1);

  // the strip row carries the time readouts at its ends
  await expect(page.locator(".deck__time_now")).toHaveText(/^\d+:\d{2}$/u);
  await expect(page.locator(".deck__time_total")).toHaveText("0:20");
});
