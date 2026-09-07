import { expect, test } from "@playwright/test";
import { dropFile, expectRowCount, makeSineWav, waitForAppReady } from "./helpers";

const STATIONS = [
  {
    stationuuid: "uuid-one",
    name: "Test Radio One",
    url_resolved: "https://stream.test/live-one",
    favicon: "",
    tags: "rock,pop",
    bitrate: 128,
  },
  {
    stationuuid: "uuid-two",
    name: "Broken Waves",
    url_resolved: "https://stream.test/dead",
    favicon: "",
    tags: "electronic",
    bitrate: 96,
  },
];

interface RouteCounters {
  searchQueries: string[];
  listenReports: string[];
}

async function mockCatalog(page: import("@playwright/test").Page): Promise<RouteCounters> {
  const counters: RouteCounters = { searchQueries: [], listenReports: [] };
  const wav = Buffer.from(makeSineWav(60));
  await page.route("**/json/stations/search*", (route) => {
    const url = new URL(route.request().url());
    const name = url.searchParams.get("name") ?? "";
    counters.searchQueries.push(name);
    if (name === "fail") {
      return route.abort();
    }
    return route.fulfill({ contentType: "application/json", body: JSON.stringify(STATIONS) });
  });
  await page.route("https://stream.test/live-one", (route) => {
    return route.fulfill({ contentType: "audio/wav", body: wav });
  });
  await page.route("https://stream.test/dead", (route) => {
    return route.fulfill({ status: 404, contentType: "text/plain", body: "gone" });
  });
  await page.route("**/json/url/*", (route) => {
    const uuid = route.request().url().split("/").pop() ?? "";
    counters.listenReports.push(uuid);
    return route.fulfill({ contentType: "application/json", body: "{}" });
  });
  return counters;
}

async function searchAndPlayFirst(page: import("@playwright/test").Page): Promise<void> {
  await page.click(".library__mode");
  await page.fill(".library__search", "test");
  await expect(page.locator(".radio__row")).toHaveCount(2);
  await page.locator(".radio__row").first().click();
}

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

  // the page unload kills an in-flight IndexedDB write - wait for the commit
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const r = indexedDB.open("audio-player");
          r.addEventListener("success", () => resolve(r.result));
          r.addEventListener("error", () => reject(r.error));
        });
        const tx = db.transaction("stations", "readonly");
        const result = await new Promise<number>((resolve) => {
          const rq = tx.objectStore("stations").getAll();
          rq.onsuccess = () => resolve(rq.result.length);
        });
        db.close();
        return result;
      }),
    )
    .toBe(1);

  await page.reload();
  await waitForAppReady(page);
  await page.click(".library__mode");
  await expect(page.locator(".radio__row")).toHaveCount(1);
  await expect(page.locator(".radio__row").first()).toContainText("Test Radio One");

  // a saved station plays after the reload
  await page.locator(".radio__row").first().click();
  await expect.poll(() => page.evaluate(() => window.radio.state())).toBe("playing");

  // unsaving removes it from the list
  await page.locator(".radio__row").first().locator(".radio__star").click();
  await expect(page.locator(".radio__row")).toHaveCount(0);
  await expect(page.locator(".library__empty")).toContainText("No saved stations yet");
});

test("now playing card shows the station name and tags", async ({ page }) => {
  await mockCatalog(page);
  await page.goto("/");
  await waitForAppReady(page);
  await searchAndPlayFirst(page);

  const card = page.locator(".station-now");
  await expect(card).toBeVisible();
  await expect(card.locator(".station-now__name")).toHaveText("Test Radio One");
  await expect(card.locator(".station-now__tags")).toHaveText("rock, pop");

  await page.click(".player-controls__btn_play");
  await expect.poll(() => page.evaluate(() => window.radio.state())).toBe("paused");
  await expect(card).toBeVisible();

  await page.click(".player-controls__btn_play");
  await page.click(".library__mode");
  await page.click(".library__mode");
  // switching back to the library view keeps the card while the station plays
  await expect(card).toBeVisible();
});
