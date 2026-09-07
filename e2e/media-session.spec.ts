import { expect, test } from "@playwright/test";
import {
  captureMediaSession,
  dropFile,
  dropTaggedWav,
  expectRowCount,
  invokeMediaAction,
  progressWidth,
  readMediaSessionPositions,
  readMediaSessionState,
  withoutMediaSession,
} from "./helpers";

test("publishes metadata for the playing library track", async ({ page }) => {
  await captureMediaSession(page);
  await page.goto("/");
  await dropTaggedWav(page, "Tagged Artist - Tagged Title.wav", {
    title: "Tagged Title",
    artist: "Tagged Artist",
    album: "Tagged Album",
  });
  await expectRowCount(page, 1);

  await page.locator(".library__row").first().click();
  await expect
    .poll(() => readMediaSessionState(page))
    .toEqual({
      playbackState: "playing",
      metadata: {
        title: "Tagged Title",
        artist: "Tagged Artist",
        album: "Tagged Album",
        artwork: [],
      },
    });
});

test("publishes embedded artwork with the metadata", async ({ page }) => {
  await captureMediaSession(page);
  await page.goto("/");
  await dropTaggedWav(page, "Cover Song.wav", { title: "Cover Song", artwork: true });
  await expectRowCount(page, 1);

  await page.locator(".library__row").first().click();
  await expect.poll(async () => (await readMediaSessionState(page)).metadata).not.toBeNull();
  const { metadata } = await readMediaSessionState(page);
  expect(metadata?.title).toBe("Cover Song");
  expect(metadata?.artwork).toHaveLength(1);
  expect(metadata?.artwork[0]).toMatch(/^blob:/u);
});

test("playback state follows OS transport actions", async ({ page }) => {
  await captureMediaSession(page);
  await page.goto("/");
  await dropFile(page, "Artist - Alpha.wav");
  await expectRowCount(page, 1);

  await page.locator(".library__row").first().click();
  await expect.poll(() => readMediaSessionState(page)).toMatchObject({ playbackState: "playing" });

  await invokeMediaAction(page, "pause");
  await expect.poll(() => readMediaSessionState(page)).toMatchObject({ playbackState: "paused" });

  await invokeMediaAction(page, "play");
  await expect.poll(() => readMediaSessionState(page)).toMatchObject({ playbackState: "playing" });
});

test("OS previous and next switch tracks like the page controls", async ({ page }) => {
  await captureMediaSession(page);
  await page.goto("/");
  await dropFile(page, "Artist - Alpha.wav");
  await dropFile(page, "Artist - Beta.wav");
  await expectRowCount(page, 2);

  await page.locator(".library__row").first().click();
  await expect(page.locator(".library__row").first()).toHaveClass(/library__row_playing/u);
  // let the first track actually start before switching (mirrors user pacing)
  await page.waitForTimeout(300);

  await invokeMediaAction(page, "nexttrack");
  await expect(page.locator(".library__row").nth(1)).toHaveClass(/library__row_playing/u);
  await expect(page.locator(".library__row").first()).not.toHaveClass(/library__row_playing/u);

  await invokeMediaAction(page, "previoustrack");
  await expect(page.locator(".library__row").first()).toHaveClass(/library__row_playing/u);
});

test("OS seek-to jumps to the requested position", async ({ page }) => {
  await captureMediaSession(page);
  await page.goto("/");
  await dropFile(page, "Artist - Alpha.wav", 20);
  await expectRowCount(page, 1);

  await page.locator(".library__row").first().click();
  // duration must be known before an OS seek can map onto the track
  await page.waitForTimeout(300);
  await invokeMediaAction(page, "seekto", { seekTime: 10 });

  // 10s of a 20s track = 50% of the progress bar
  await expect.poll(() => progressWidth(page), { timeout: 5000 }).toBeGreaterThan(45);
  await expect.poll(() => progressWidth(page), { timeout: 5000 }).toBeLessThan(55);
});

test("position state is published while playing", async ({ page }) => {
  await captureMediaSession(page);
  await page.goto("/");
  await dropFile(page, "Artist - Alpha.wav", 20);
  await expectRowCount(page, 1);

  await page.locator(".library__row").first().click();
  // timeupdate fires ~4 times a second: the last published position advances
  await expect
    .poll(async () => {
      const positions = await readMediaSessionPositions(page);
      const last = positions.at(-1);
      return last ? last.position : -1;
    })
    .toBeGreaterThan(0);

  const positions = await readMediaSessionPositions(page);
  const last = positions.at(-1);
  expect(last?.duration).toBe(20);
  expect(last?.playbackRate).toBe(1);
  expect(last?.position).toBeLessThan(20);
});

test("page works when Media Session is unavailable", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => {
    errors.push(error.message);
  });

  await withoutMediaSession(page);
  await page.goto("/");
  await dropFile(page, "Artist - Alpha.wav");
  await expectRowCount(page, 1);

  await page.locator(".library__row").first().click();
  await expect(page.locator(".library__row").first()).toHaveClass(/library__row_playing/u);
  expect(errors).toEqual([]);
});
