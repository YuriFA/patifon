import { expect, type Page } from "@playwright/test";
import { makeSineWav } from "./helpers";

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

export async function mockCatalog(page: Page): Promise<RouteCounters> {
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

/**
 * The page unload kills an in-flight IndexedDB write: wait until the store
 * actually holds the expected number of saved stations.
 */
export async function waitForSavedStationCount(page: Page, count: number): Promise<void> {
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
    .toBe(count);
}

export async function searchAndPlayFirst(page: Page): Promise<void> {
  await page.click(".library__mode");
  await page.fill(".library__search", "test");
  await expect(page.locator(".radio__row")).toHaveCount(2);
  await page.locator(".radio__row").first().click();
}
