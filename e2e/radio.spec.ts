import { expect, test } from "@playwright/test";
import { dropFile, expectRowCount, waitForAppReady } from "./helpers";
import { mockCatalog, searchAndPlayFirst, waitForSavedStationCount } from "./radio.helpers";

test("search lists matching stations with tags and bitrate", async ({ page }) => {
  await mockCatalog(page);
  await page.goto("/");
  await waitForAppReady(page);
  await page.click(".library__mode");
  await expect(page.locator(".library__add")).toBeHidden();

  await page.fill(".library__search", "test");
  await expect(page.locator(".radio__row")).toHaveCount(2);
  await expect(page.locator(".radio__row").first()).toContainText("Test Radio One");
  await expect(page.locator(".radio__row").first()).toContainText("128 kbps");
  await expect(page.locator(".radio__row").nth(1)).toContainText("96 kbps");
});

test("clicking a station row plays the stream with highlight and live state", async ({ page }) => {
  await mockCatalog(page);
  await page.goto("/");
  await waitForAppReady(page);
  await searchAndPlayFirst(page);

  await expect(page.locator(".radio__row").first()).toHaveClass(/library__row_playing/u);
  await expect(page.locator(".progress__live")).toBeVisible();
  await expect(page.locator(".player-controls__btn_play")).toHaveClass(
    /player-controls__btn_pause/u,
  );
});

test("transport pause and resume apply to the station", async ({ page }) => {
  await mockCatalog(page);
  await page.goto("/");
  await waitForAppReady(page);
  await searchAndPlayFirst(page);
  await expect(page.locator(".progress__live")).toBeVisible();

  await page.click(".player-controls__btn_play");
  await expect.poll(() => page.evaluate(() => window.radio.state())).toBe("paused");
  await expect(page.locator(".player-controls__btn_play")).not.toHaveClass(
    /player-controls__btn_pause/u,
  );

  await page.click(".player-controls__btn_play");
  await expect.poll(() => page.evaluate(() => window.radio.state())).toBe("playing");
});

test("playing a station reports the listen to the catalog", async ({ page }) => {
  const counters = await mockCatalog(page);
  await page.goto("/");
  await waitForAppReady(page);
  await searchAndPlayFirst(page);

  await expect.poll(() => counters.listenReports).toEqual(["uuid-one"]);
});

test("station name reaches the media session", async ({ page }) => {
  await page.addInitScript(() => {
    const handlers = new Map<string, () => void>();
    window.mediaSessionHandlers = handlers;
    navigator.mediaSession.setActionHandler = ((action: string, handler: () => void) => {
      handlers.set(action, handler);
    }) as typeof navigator.mediaSession.setActionHandler;
  });
  await mockCatalog(page);
  await page.goto("/");
  await waitForAppReady(page);
  await searchAndPlayFirst(page);

  await expect
    .poll(() =>
      page.evaluate(() => {
        const metadata = navigator.mediaSession.metadata;
        return metadata ? { title: metadata.title, artist: metadata.artist } : null;
      }),
    )
    .toEqual({ title: "Test Radio One", artist: "rock, pop" });
});

test("dead stream shows an error state on the row", async ({ page }) => {
  await mockCatalog(page);
  await page.goto("/");
  await waitForAppReady(page);
  await page.click(".library__mode");
  await page.fill(".library__search", "test");
  await expect(page.locator(".radio__row")).toHaveCount(2);

  await page.locator(".radio__row").nth(1).click();
  await expect(page.locator(".radio__row").nth(1)).toHaveClass(/radio__row_error/u);
  await expect(page.locator(".progress__live")).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.radio.state())).toBe("error");
});

test("catalog failure shows an error without losing previous results", async ({ page }) => {
  await mockCatalog(page);
  await page.goto("/");
  await waitForAppReady(page);
  await page.click(".library__mode");

  await page.fill(".library__search", "test");
  await expect(page.locator(".radio__row")).toHaveCount(2);

  await page.fill(".library__search", "fail");
  await expect(page.locator(".library__empty")).toContainText("Radio catalog unavailable");
  await expect(page.locator(".radio__row")).toHaveCount(2);
});

test("activating a library track stops the station", async ({ page }) => {
  await mockCatalog(page);
  await page.goto("/");
  await waitForAppReady(page);
  await dropFile(page, "Artist - Local Track.wav");
  await expectRowCount(page, 1);

  await searchAndPlayFirst(page);
  await expect.poll(() => page.evaluate(() => window.radio.isActive())).toBe(true);

  await page.click(".library__mode");
  await page.locator(".library__row").first().click();
  await expect.poll(() => page.evaluate(() => window.radio.state())).toBe("stopped");
  await expect(page.locator(".library__row").first()).toHaveClass(/library__row_playing/u);
});

test("saving a station persists it across reloads", async ({ page }) => {
  await mockCatalog(page);
  await page.goto("/");
  await waitForAppReady(page);
  await page.click(".library__mode");
  await page.fill(".library__search", "test");
  await expect(page.locator(".radio__row")).toHaveCount(2);

  await page.locator(".radio__row").first().locator(".radio__star").click();
  await expect(page.locator(".radio__row").first().locator(".radio__star")).toHaveClass(
    /radio__star_saved/u,
  );

  await waitForSavedStationCount(page, 1);

  await page.reload();
  await waitForAppReady(page);
  await page.click(".library__mode");
  await expect(page.locator(".radio__row")).toHaveCount(1);
  await expect(page.locator(".radio__row").first()).toContainText("Test Radio One");

  // a saved station plays after the reload
  await page.locator(".radio__row").first().click();
  await expect.poll(() => page.evaluate(() => window.radio.state())).toBe("playing");

  // unsaving keeps the pinned playing row but drops it from storage
  await page.locator(".radio__row").first().locator(".radio__star").click();
  await expect(page.locator(".radio__row").first().locator(".radio__star")).not.toHaveClass(
    /radio__star_saved/u,
  );

  // the unload kills an in-flight delete: wait until storage actually dropped it
  await waitForSavedStationCount(page, 0);

  // after a reload only the empty-state hint remains
  await page.reload();
  await waitForAppReady(page);
  await page.click(".library__mode");
  await expect(page.locator(".radio__row")).toHaveCount(0);
  await expect(page.locator(".library__empty")).toContainText("No saved stations yet");
});

test("playing station is pinned in the list and the card shows in library view", async ({
  page,
}) => {
  await mockCatalog(page);
  await page.goto("/");
  await waitForAppReady(page);
  await searchAndPlayFirst(page);

  // radio mode: the station is a pinned list item with its star, no card
  const card = page.locator(".station-now");
  const firstRow = page.locator(".radio__row").first();
  await expect(firstRow).toHaveClass(/library__row_playing/u);
  await expect(firstRow.locator(".radio__star")).toBeVisible();
  await expect(firstRow).toContainText("Test Radio One");
  await expect(card).toBeHidden();

  // library view: the card is the only radio indicator (single icon, no fallback)
  await page.click(".library__mode");
  await expect(card).toBeVisible();
  await expect(card.locator(".station-now__name")).toHaveText("Test Radio One");
  await expect(card.locator(".station-now__tags")).toHaveText("rock, pop");
  await expect(card.locator(".station-now__icon-empty")).toBeVisible();
  await expect(card.locator(".station-now__icon")).toBeHidden();

  // paused radio keeps the card; back in radio mode the pinned row returns
  await page.click(".player-controls__btn_play");
  await expect.poll(() => page.evaluate(() => window.radio.state())).toBe("paused");
  await expect(card).toBeVisible();

  await page.click(".library__mode");
  await expect(card).toBeHidden();
  await expect(page.locator(".radio__row").first()).toHaveClass(/library__row_playing/u);
});

test("radio mode hides the library waveform while a track keeps playing", async ({ page }) => {
  await mockCatalog(page);
  await page.goto("/");
  await waitForAppReady(page);
  await dropFile(page, "Artist - Local Track.wav");
  await expectRowCount(page, 1);
  await page.locator(".library__row").first().click();
  await expect.poll(() => page.evaluate(() => window.player.isPlaying)).toBe(true);

  const pixelAlphaSum = () =>
    page.evaluate(() => {
      const canvas = document.querySelector<HTMLCanvasElement>("#visualizer")!;
      const data = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data;
      let sum = 0;
      for (let i = 3; i < data.length; i += 4) {
        sum += data[i];
      }
      return sum;
    });
  await expect.poll(pixelAlphaSum).toBeGreaterThan(0);

  // browsing radio while the song plays: the list must not overlap a waveform
  await page.click(".library__mode");
  await page.fill(".library__search", "some");
  await expect(page.locator(".radio__row")).toHaveCount(2);
  await expect.poll(pixelAlphaSum).toBe(0);

  // leaving radio mode brings the waveform back for the still-playing track
  await page.click(".library__mode");
  await expect.poll(pixelAlphaSum).toBeGreaterThan(0);
});

test("radio takeover clears the frozen library visualizer frame", async ({ page }) => {
  await mockCatalog(page);
  await page.goto("/");
  await waitForAppReady(page);
  await dropFile(page, "Artist - Local Track.wav");
  await expectRowCount(page, 1);
  await page.locator(".library__row").first().click();
  await expect.poll(() => page.evaluate(() => window.player.isPlaying)).toBe(true);

  const pixelAlphaSum = () =>
    page.evaluate(() => {
      const canvas = document.querySelector<HTMLCanvasElement>("#visualizer")!;
      const data = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data;
      let sum = 0;
      for (let i = 3; i < data.length; i += 4) {
        sum += data[i];
      }
      return sum;
    });

  // the library track is being visualized...
  await expect.poll(pixelAlphaSum).toBeGreaterThan(0);

  // ...until a radio station takes over: no frozen frame, no card overlay
  await page.click(".library__mode");
  await page.fill(".library__search", "test");
  await expect(page.locator(".radio__row")).toHaveCount(2);
  await page.locator(".radio__row").first().click();
  await expect.poll(() => page.evaluate(() => window.radio.state())).toBe("playing");
  await expect.poll(pixelAlphaSum).toBe(0);
  await expect(page.locator(".station-now")).toBeHidden();
});
