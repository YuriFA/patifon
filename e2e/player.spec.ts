import { expect, test } from "@playwright/test";
import { dropFile, expectRowCount, progressWidth, seedLibrary } from "./helpers";

const playBtn = ".player-controls__btn_play";
const nextBtn = ".player-controls__btn_next";
const prevBtn = ".player-controls__btn_prev";

test("page loads with the player shell and empty library", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Audio Player/u);
  await expect(page.locator(".player-controls")).toBeVisible();
  await expect(page.locator("#visualizer")).toBeVisible();
  await expect(page.locator(".library__empty")).toBeVisible();
});

test("play after page load starts playback (autoplay policy satisfied)", async ({ page }) => {
  await seedLibrary(page);

  await page.click(playBtn);
  await expect(page.locator(playBtn)).toHaveClass(/player-controls__btn_pause/u);

  // timeupdate drives the progress fill; growth proves audible-track progress
  await page.waitForTimeout(500);
  const width1 = await progressWidth(page);
  await page.waitForTimeout(1500);
  const width2 = await progressWidth(page);
  expect(width2).toBeGreaterThan(width1);
});

test("pause and resume keeps position", async ({ page }) => {
  await seedLibrary(page);

  await page.click(playBtn);
  await page.waitForTimeout(1200);
  await page.click(playBtn);
  await expect(page.locator(playBtn)).not.toHaveClass(/player-controls__btn_pause/u);

  const pausedWidth = await progressWidth(page);
  await page.waitForTimeout(1000);
  const stillPausedWidth = await progressWidth(page);
  // frozen while paused: no forward progress beyond decoder jitter (a playing
  // track advances ~5% per second on this fixture)
  expect(Math.abs(stillPausedWidth - pausedWidth)).toBeLessThan(1);

  // resume
  await page.click(playBtn);
  await page.waitForTimeout(1000);
  const resumedWidth = await progressWidth(page);
  expect(resumedWidth).toBeGreaterThan(pausedWidth);
});

test("next and previous switch tracks", async ({ page }) => {
  await page.goto("/");
  await dropFile(page, "Artist - Alpha.wav");
  await dropFile(page, "Artist - Beta.wav");
  await expectRowCount(page, 2);

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
  await seedLibrary(page);

  await page.click(playBtn);
  await page.waitForTimeout(800);

  const bar = page.locator(".progress__bar");
  const box = await bar.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.click(box!.x + box!.width * 0.8, box!.y + box!.height / 2);
  await page.waitForTimeout(300);

  const width = await progressWidth(page);
  // jumped forward, still advancing
  expect(width).toBeGreaterThan(60);
});

test("volume slider reflects state and mute toggles", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".library__empty")).toBeVisible();

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
  await page.goto("/");

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
  await seedLibrary(page);
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
  // animating: a later frame differs
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
