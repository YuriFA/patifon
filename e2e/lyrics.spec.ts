import { expect, test, type Page } from "@playwright/test";
import { dropFile, dropTaggedWav, expectRowCount, waitForAppReady } from "./helpers";
import { mockCatalog, searchAndPlayFirst } from "./radio.helpers";

const SYNCED_LRC = [
  "[00:01.00]First line",
  "[00:04.00]Second line",
  "[00:08.00]Third line",
  "[00:12.00]Fourth line",
].join("\n");

const PLAIN_TEXT = "Just a plain text\nwithout any timestamps";

interface LyricsCounters {
  requests: string[];
}

async function mockLrclib(page: Page, tracks: Record<string, unknown>): Promise<LyricsCounters> {
  const counters: LyricsCounters = { requests: [] };
  await page.route("**/lrclib.net/api/get*", (route) => {
    const url = new URL(route.request().url());
    const track = url.searchParams.get("track_name") ?? "";
    counters.requests.push(track);
    const body = tracks[track];
    if (body === undefined) {
      return route.fulfill({ status: 404, contentType: "application/json", body: "{}" });
    }
    return route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
  });
  return counters;
}

/** Alpha-channel sum of the columns canvas: > 0 drawn, 0 cleared. */
function barsAlphaSum(page: Page): Promise<number> {
  return page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>("#visualizer")!;
    const data = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data;
    let sum = 0;
    for (let i = 3; i < data.length; i += 4) {
      sum += data[i];
    }
    return sum;
  });
}

async function playFirstRow(page: Page): Promise<void> {
  await expectRowCount(page, 1);
  await page.locator(".library__row").first().click();
}

function currentTime(page: Page): Promise<number> {
  return page.evaluate(
    () => (window.player as unknown as { audio: HTMLAudioElement }).audio.currentTime,
  );
}

const SYNCED_TRACK = {
  plainLyrics: null,
  syncedLyrics: SYNCED_LRC,
  instrumental: false,
};

test("highlight follows playback and clicking a line seeks", async ({ page }) => {
  const counters = await mockLrclib(page, { "Song One": SYNCED_TRACK });
  await page.goto("/");
  await waitForAppReady(page);
  await dropTaggedWav(page, "song-one.wav", {
    title: "Song One",
    artist: "Artist One",
    album: "Album One",
  });
  await playFirstRow(page);

  await expect(page.locator(".lyrics")).toBeVisible();
  expect(counters.requests).toEqual(["Song One"]);

  await expect(page.locator(".lyrics__line").first()).toHaveText("First line");
  // after the 1s timestamp passes, the first line becomes active
  await expect(page.locator(".lyrics__line_active")).toHaveText("First line");
  // and follows into the second line at 4s
  await expect(page.locator(".lyrics__line_active")).toHaveText("Second line", {
    timeout: 10_000,
  });

  // clicking a future line seeks there
  await page.locator(".lyrics__line").nth(3).click();
  await expect.poll(() => currentTime(page), { timeout: 5_000 }).toBeGreaterThan(11);
  await expect(page.locator(".lyrics__line_active")).toHaveText("Fourth line");
});

test("repeat plays use the IndexedDB cache without new requests", async ({ page }) => {
  const counters = await mockLrclib(page, { "Song One": SYNCED_TRACK });
  await page.goto("/");
  await waitForAppReady(page);
  await dropTaggedWav(page, "song-one.wav", { title: "Song One", artist: "Artist One" });
  await playFirstRow(page);
  await expect(page.locator(".lyrics")).toBeVisible();
  expect(counters.requests).toHaveLength(1);

  // a reload replays from the persisted library: still exactly one request
  await page.reload();
  await waitForAppReady(page);
  await playFirstRow(page);
  await expect(page.locator(".lyrics")).toBeVisible();
  expect(counters.requests).toHaveLength(1);
});

test("missing lyrics keep the panel hidden and playback unaffected", async ({ page }) => {
  const counters = await mockLrclib(page, {});
  await page.goto("/");
  await waitForAppReady(page);
  await dropTaggedWav(page, "unknown-song.wav", {
    title: "Unknown Song",
    artist: "Unknown Artist",
  });
  await playFirstRow(page);

  await expect(page.locator(".lyrics")).toBeHidden();
  // 404 is a normal answer, playback keeps going
  await expect.poll(() => currentTime(page), { timeout: 5_000 }).toBeGreaterThan(0.5);
  expect(counters.requests).toEqual(["Unknown Song"]);
});

test("a network failure behaves like no lyrics", async ({ page }) => {
  const requests: string[] = [];
  await page.addInitScript(() => {
    // test-only recorder hanging off the page global
    const w = window as unknown as { unhandledRejections: string[] };
    w.unhandledRejections = [];
    window.addEventListener("unhandledrejection", (event) => {
      w.unhandledRejections.push(String(event.reason));
    });
  });
  await page.route("**/lrclib.net/api/get*", (route) => {
    const url = new URL(route.request().url());
    requests.push(url.searchParams.get("track_name") ?? "");
    return route.abort();
  });
  await page.goto("/");
  await waitForAppReady(page);
  await dropTaggedWav(page, "offline-song.wav", {
    title: "Offline Song",
    artist: "Offline Artist",
  });
  await playFirstRow(page);

  // A dead network is the same as "no lyrics": the panel stays hidden,
  // playback continues, and the rejection must not escape as an
  // unhandled page error.
  await expect(page.locator(".lyrics")).toBeHidden();
  await expect.poll(() => requests).toEqual(["Offline Song"]);
  await expect.poll(() => currentTime(page), { timeout: 5_000 }).toBeGreaterThan(0.5);
  // let a possible rejection settle
  await page.waitForTimeout(500);
  const unhandled = await page.evaluate(() => {
    // test-only recorder hanging off the page global
    const w = window as unknown as { unhandledRejections: string[] };
    return w.unhandledRejections;
  });
  expect(unhandled).toEqual([]);
});

test("untagged tracks never request lyrics", async ({ page }) => {
  const counters = await mockLrclib(page, { "Song One": SYNCED_TRACK });
  await page.goto("/");
  await waitForAppReady(page);
  await dropFile(page, "no-tags.wav", 20);
  await playFirstRow(page);

  await expect(page.locator(".lyrics")).toBeHidden();
  await expect.poll(() => currentTime(page), { timeout: 5_000 }).toBeGreaterThan(0.5);
  expect(counters.requests).toHaveLength(0);
});

test("plain lyrics render without highlight or seek", async ({ page }) => {
  await mockLrclib(page, {
    "Plain Song": { plainLyrics: PLAIN_TEXT, syncedLyrics: null, instrumental: false },
  });
  await page.goto("/");
  await waitForAppReady(page);
  await dropTaggedWav(page, "plain-song.wav", { title: "Plain Song", artist: "Plain Artist" });
  await playFirstRow(page);

  const plain = page.locator(".lyrics__line_plain");
  await expect(plain).toBeVisible();
  await expect(plain).toContainText("plain text");
  // no active line ever appears for plain text
  await expect(page.locator(".lyrics__line_active")).toHaveCount(0);
  const before = await currentTime(page);
  await plain.click();
  const after = await currentTime(page);
  expect(after).toBeGreaterThanOrEqual(before);
});

test("a radio takeover clears the panel", async ({ page }) => {
  await mockCatalog(page);
  await mockLrclib(page, { "Song One": SYNCED_TRACK });
  await page.goto("/");
  await waitForAppReady(page);
  await dropTaggedWav(page, "song-one.wav", { title: "Song One", artist: "Artist One" });
  await playFirstRow(page);
  await expect(page.locator(".lyrics")).toBeVisible();

  await searchAndPlayFirst(page);
  await expect(page.locator(".progress__live")).toBeVisible();
  await expect(page.locator(".lyrics")).toBeHidden();
});

test("the karaoke toggle hides the panel and the visualizer keeps rendering", async ({ page }) => {
  await mockLrclib(page, { "Song One": SYNCED_TRACK });
  await page.goto("/");
  await waitForAppReady(page);
  await dropTaggedWav(page, "song-one.wav", { title: "Song One", artist: "Artist One" });
  await playFirstRow(page);
  await expect(page.locator(".lyrics")).toBeVisible();
  // on: the panel takes the area, the classic renderer stays paused
  await expect(page.locator(".visualizer-controls__lyrics")).toHaveClass(/lyrics_active/u);

  await page.click(".visualizer-controls__lyrics");

  await expect(page.locator(".lyrics")).toBeHidden();
  await expect(page.locator(".visualizer-controls__lyrics")).not.toHaveClass(/lyrics_active/u);
  // the freed area renders again
  await expect.poll(() => barsAlphaSum(page)).toBeGreaterThan(0);
});

test("the karaoke choice persists and applies mid-track on enable", async ({ page }) => {
  await mockLrclib(page, { "Song One": SYNCED_TRACK });
  await page.goto("/");
  await waitForAppReady(page);
  await dropTaggedWav(page, "song-one.wav", { title: "Song One", artist: "Artist One" });
  // off before playing: the panel never takes the area
  await page.click(".visualizer-controls__lyrics");
  await playFirstRow(page);
  await expect(page.locator(".lyrics")).toBeHidden();

  await page.reload();
  await waitForAppReady(page);
  await playFirstRow(page);
  await expect(page.locator(".lyrics")).toBeHidden();

  // enabling mid-track resolves lyrics for the playing track
  await page.click(".visualizer-controls__lyrics");
  await expect(page.locator(".lyrics")).toBeVisible();
});
