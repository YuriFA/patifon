import { expect, test, type Page } from "@playwright/test";

/**
 * Generates an in-memory sine-wave WAV fixture, so no binary audio ever
 * lands in the repository. Served by intercepting the playlist track URLs.
 */
function makeSineWav(seconds = 30, sampleRate = 44100, frequency = 440): Buffer {
  const samples = seconds * sampleRate;
  // 16-bit mono
  const dataSize = samples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8, "ascii");
  buffer.write("fmt ", 12, "ascii");
  // PCM chunk size
  buffer.writeUInt32LE(16, 16);
  // PCM format
  buffer.writeUInt16LE(1, 20);
  // mono
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  // byte rate
  buffer.writeUInt32LE(sampleRate * 2, 28);
  // block align
  buffer.writeUInt16LE(2, 32);
  // bits per sample
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36, "ascii");
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples; i += 1) {
    const t = i / sampleRate;
    // 0.5 Hz tremolo so the spectrum keeps changing frame to frame
    const envelope = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.5 * t);
    const value = Math.round(Math.sin(2 * Math.PI * frequency * t) * 12000 * envelope);
    buffer.writeInt16LE(value, 44 + i * 2);
  }
  return buffer;
}

const wav = makeSineWav();

async function openPlayer(page: Page): Promise<void> {
  await page.route(/s3\.amazonaws\.com|freshly-ground\.com/u, (route) => {
    // emulate a real audio server: byte-range support so seeking works
    const rangeHeader = route.request().headers()["range"];
    const match = /bytes=(\d+)-(\d*)/u.exec(rangeHeader ?? "");
    if (match) {
      const start = Number(match[1]);
      const end = match[2] ? Number(match[2]) : wav.length - 1;
      return route.fulfill({
        status: 206,
        contentType: "audio/wav",
        headers: {
          "access-control-allow-origin": "*",
          "accept-ranges": "bytes",
          "content-range": `bytes ${start}-${end}/${wav.length}`,
        },
        body: wav.subarray(start, end + 1),
      });
    }
    return route.fulfill({
      contentType: "audio/wav",
      headers: {
        "access-control-allow-origin": "*",
        "accept-ranges": "bytes",
      },
      body: wav,
    });
  });
  await page.route(/fonts\.googleapis\.com|fonts\.gstatic\.com/u, (route) => route.abort());
  await page.goto("/");
}

const playBtn = ".player-controls__btn_play";
const nextBtn = ".player-controls__btn_next";
const prevBtn = ".player-controls__btn_prev";

test("page loads with the player shell", async ({ page }) => {
  await openPlayer(page);
  await expect(page).toHaveTitle(/Audio Player/u);
  await expect(page.locator(".player-controls")).toBeVisible();
  await expect(page.locator("#visualizer")).toBeVisible();
});

test("play after page load starts playback (autoplay policy satisfied)", async ({ page }) => {
  await openPlayer(page);
  const progressFill = page.locator(".progress__bar .slider-horiz__filled");

  await page.click(playBtn);
  await expect(page.locator(playBtn)).toHaveClass(/player-controls__btn_pause/u);

  // timeupdate drives the progress fill; growth proves audible-track progress
  const widthAfter1s = await progressFill.evaluate((el) => el.style.width);
  await page.waitForTimeout(1500);
  const widthAfter25s = await progressFill.evaluate((el) => el.style.width);
  expect(Number(widthAfter25s.replace("%", ""))).toBeGreaterThan(
    Number(widthAfter1s.replace("%", "")),
  );
});

test("pause and resume keeps position", async ({ page }) => {
  await openPlayer(page);
  const progressFill = page.locator(".progress__bar .slider-horiz__filled");

  await page.click(playBtn);
  await page.waitForTimeout(1200);
  // pause
  await page.click(playBtn);
  await expect(page.locator(playBtn)).not.toHaveClass(/player-controls__btn_pause/u);

  const pausedWidth = await progressFill.evaluate((el) => el.style.width);
  await page.waitForTimeout(600);
  const stillPausedWidth = await progressFill.evaluate((el) => el.style.width);
  // frozen while paused
  expect(pausedWidth).toBe(stillPausedWidth);

  // resume
  await page.click(playBtn);
  await page.waitForTimeout(1000);
  const resumedWidth = await progressFill.evaluate((el) => el.style.width);
  expect(Number(resumedWidth.replace("%", ""))).toBeGreaterThan(
    Number(pausedWidth.replace("%", "")),
  );
});

test("next and previous switch tracks", async ({ page }) => {
  await openPlayer(page);
  await page.click(playBtn);
  await expect(page.locator(playBtn)).toHaveClass(/player-controls__btn_pause/u);

  await page.click(nextBtn);
  await expect(page.locator(playBtn)).toHaveClass(/player-controls__btn_pause/u);

  await page.click(prevBtn);
  await expect(page.locator(playBtn)).toHaveClass(/player-controls__btn_pause/u);

  // wrap-around: prev from the first track falls back to track 0 and plays
  await page.click(prevBtn);
  // pause whatever is playing
  await page.click(playBtn);
  // play again
  await page.click(playBtn);
  await expect(page.locator(playBtn)).toHaveClass(/player-controls__btn_pause/u);
});

test("seek through the progress bar keeps playback running", async ({ page }) => {
  await openPlayer(page);
  await page.click(playBtn);
  await page.waitForTimeout(800);

  const bar = page.locator(".progress__bar");
  const box = await bar.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.click(box!.x + box!.width * 0.8, box!.y + box!.height / 2);
  await page.waitForTimeout(300);

  const width = await page
    .locator(".progress__bar .slider-horiz__filled")
    .evaluate((el) => Number(el.style.width.replace("%", "")));
  // jumped forward, still advancing
  expect(width).toBeGreaterThan(60);
});

test("volume slider reflects state and mute toggles", async ({ page }) => {
  await openPlayer(page);

  const volumeFill = page.locator(".volume__slider .slider-horiz__filled");
  const initial = await volumeFill.evaluate((el) => Number(el.style.width.replace("%", "")));
  // player starts at volume 0.1
  expect(initial).toBeCloseTo(10, 0);

  const box = await page.locator(".volume__slider").boundingBox();
  await page.mouse.click(box!.x + box!.width * 0.9, box!.y + box!.height / 2);
  const raised = await volumeFill.evaluate((el) => Number(el.style.width.replace("%", "")));
  expect(raised).toBeGreaterThan(initial);

  const volumeIcon = page.locator(".volume__icon");
  // mute
  await page.click(".volume__btn");
  await expect(volumeIcon).toHaveClass(/volume__icon_mute/u);
  // unmute
  await page.click(".volume__btn");
  await expect(volumeIcon).not.toHaveClass(/volume__icon_mute/u);
});

test("equalizer preset applies to every band", async ({ page }) => {
  await openPlayer(page);

  await page.click(".player-controls__btn_equalizer");
  const popup = page.locator(".equalizer-popup");
  await expect(popup).toHaveClass(/equalizer-popup__open/u);

  // flat: every vertical fill sits at the 50% zero-gain line
  const bandFill = (index: number) =>
    popup.locator(".equalizer-band__slider .slider-vert__filled").nth(index);

  const flatFirst = await bandFill(0).evaluate((el) => el.style.height);
  expect(Number(flatFirst.replace("%", ""))).toBeCloseTo(50, 0);

  await page.selectOption(".equalizer-popup__presets", "Bass Booster");

  // preset data[0] = +6 dB -> (6 + 12) / 24 = 75%
  const boostedFirst = await bandFill(0).evaluate((el) => el.style.height);
  expect(Number(boostedFirst.replace("%", ""))).toBeCloseTo(75, 0);

  // last band stays 0 dB -> 50%
  const boostedLast = await bandFill(9).evaluate((el) => el.style.height);
  expect(Number(boostedLast.replace("%", ""))).toBeCloseTo(50, 0);
});

test("visualizer renders while playing, freezes on pause, survives resize", async ({ page }) => {
  await openPlayer(page);
  const canvas = page.locator("#visualizer");

  const sampleSum = () =>
    canvas.evaluate((node) => {
      const el = node as HTMLCanvasElement;
      const ctx = el.getContext("2d")!;
      const { data } = ctx.getImageData(0, 0, el.width, el.height);
      let sum = 0;
      for (let i = 3; i < data.length; i += 4) {
        sum += data[i];
      }
      // alpha channel of drawn pixels
      return sum;
    });

  await page.click(playBtn);
  await page.waitForTimeout(800);
  const playingSum = await sampleSum();
  // something is drawn
  expect(playingSum).toBeGreaterThan(0);

  await page.waitForTimeout(500);
  const playingSumLater = await sampleSum();
  // animating: a later frame differs (tremolo keeps the spectrum moving)
  expect(playingSumLater).not.toBe(playingSum);

  // pause
  await page.click(playBtn);
  await page.waitForTimeout(500);
  const frozenSum = await sampleSum();
  await page.waitForTimeout(500);
  const frozenSumLater = await sampleSum();
  // frozen
  expect(frozenSum).toBe(frozenSumLater);

  await page.setViewportSize({ width: 900, height: 600 });
  await page.waitForTimeout(300);
  await expect(canvas).toHaveJSProperty("width", 900);
});
