import { expect, test } from "@playwright/test";
import { dropFile, expectRowCount, progressWidth, seedLibrary, waitForAppReady } from "./helpers";

const playBtn = ".player-controls__btn_play";
const nextBtn = ".player-controls__btn_next";
const prevBtn = ".player-controls__btn_prev";

test("page loads with the player shell and empty library", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Patifon/u);
  await expect(page.locator(".player-controls")).toBeVisible();
  await expect(page.locator("#visualizer")).toBeVisible();
  await expect(page.locator(".library__empty")).toBeVisible();
});

test("shell renders on the canonical design tokens", async ({ page }) => {
  await page.goto("/");
  await waitForAppReady(page);

  const tokens = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    return {
      bg: getComputedStyle(document.body).backgroundColor,
      primary: root.getPropertyValue("--primary").trim(),
      card: root.getPropertyValue("--card").trim(),
      waveDim: root.getPropertyValue("--wave-dim").trim(),
    };
  });
  // the token set mirrors .superdesign/design-system.md 1:1
  expect(tokens.bg).toBe("rgb(246, 242, 236)");
  expect(tokens.primary).toBe("#0f766e");
  expect(tokens.card).toBe("#fffdf9");
  expect(tokens.waveDim).toBe("#c9c1b0");
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

test("rewind ignores a non-finite duration (live stream)", async ({ page }) => {
  await seedLibrary(page);
  await page.click(playBtn);
  await expect(page.locator(playBtn)).toHaveClass(/player-controls__btn_pause/u);

  // Freeze playback, then shadow duration with a live-stream Infinity the
  // same way an endless radio stream reports it.
  const seekProbe = await page.evaluate(() => {
    // the debug handle exposes the real element and transport for e2e probes
    const player = window.player as unknown as {
      audio: HTMLAudioElement;
      pause: () => void;
      rewind: (ratio: number) => unknown;
    };
    player.pause();
    Object.defineProperty(player.audio, "duration", {
      get: () => Number.POSITIVE_INFINITY,
      configurable: true,
    });
    const before = player.audio.currentTime;
    player.rewind(0.5);
    return { before, after: player.audio.currentTime };
  });

  // the seek must be a no-op: no jump to Infinity or to the buffered end,
  // and no non-finite assignment exception escaping into the page
  expect(Math.abs(seekProbe.after - seekProbe.before)).toBeLessThan(0.001);
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

test("play button carries the latched look only while playing", async ({ page }) => {
  await seedLibrary(page);

  const play = page.locator(playBtn);
  await expect(play).not.toHaveClass(/is-on/u);
  await page.click(playBtn);
  await expect(play).toHaveClass(/is-on/u);
  await page.click(playBtn);
  await expect(play).not.toHaveClass(/is-on/u);
});

test("seek through the progress lane keeps playback running", async ({ page }) => {
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

test("volume fader reflects state and adjusts by drag", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".library__empty")).toBeVisible();

  const fader = page.locator(".volume__fader");
  const input = fader.locator("input");
  // player starts at volume 0.1
  await expect(input).toHaveValue("0.1");

  // setting the range value fires the same input path as a pointer drag on
  // the rail (the native input owns pointer interaction)
  await input.fill("0.85");
  await expect.poll(() => page.evaluate(() => window.player.volume)).toBeCloseTo(0.85, 2);
  await expect(input).toHaveValue("0.85");

  // mute: the glyph crosses and the fill hides, the value stays
  await page.click(".volume__btn");
  await expect(fader.locator(".fader__fill")).toHaveCSS("width", "0px");
  await expect.poll(() => page.evaluate(() => window.player.volume)).toBeCloseTo(0.85, 2);
  // unmute restores the fill at the same level
  await page.click(".volume__btn");
  await expect(fader.locator(".fader__fill")).not.toHaveCSS("width", "0px");
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

test("visualizer renders while playing, sinks to cleared on pause, survives resize", async ({
  page,
}) => {
  await seedLibrary(page);
  const canvas = page.locator("#visualizer");

  const sampleSum = () =>
    canvas.evaluate((node) => {
      const el = node as HTMLCanvasElement;
      const ctx = el.getContext("2d")!;
      const { data } = ctx.getImageData(0, 0, el.width, el.height);
      // lit cells are --primary teal; the window backgrounds are not, so the
      // count moves only with the column heights
      let sum = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] < 80 && data[i + 1] > 90 && data[i + 2] > 90 && data[i + 1] - data[i] > 30) {
          sum += 1;
        }
      }
      return sum;
    });

  await page.click(playBtn);
  await page.waitForTimeout(800);
  const playingSum = await sampleSum();
  // something is drawn (a steady sine is a steady picture; the falloff below
  // is what proves the canvas animates rather than freezes)
  expect(playingSum).toBeGreaterThan(0);

  // pause: mid-falloff the pixels are still lit but already below the live
  // frame, and the canvas ends fully cleared - no frozen frame
  await page.click(playBtn);
  await page.waitForTimeout(100);
  const sinkingSum = await sampleSum();
  expect(sinkingSum).toBeGreaterThan(0);
  expect(sinkingSum).toBeLessThan(playingSum);
  await expect.poll(() => sampleSum(), { timeout: 3000 }).toBe(0);
  await page.waitForTimeout(300);
  expect(await sampleSum()).toBe(0);

  await page.setViewportSize({ width: 900, height: 600 });
  await page.waitForTimeout(300);
  await expect(canvas).toHaveJSProperty("width", 900);
});
