import { expect, test, type Page } from "@playwright/test";
import { dropFile, dropTaggedWav, expectRowCount, waitForAppReady } from "./helpers";
import { mockCatalog, searchAndPlayFirst } from "./radio.helpers";

const barsCanvas = (page: Page) => page.locator("#visualizer");
const webglCanvas = (page: Page) => page.locator(".visualizer__webgl");
const isReady = (page: Page) => page.evaluate(() => window.visualizer?.isReady() ?? false);
const isRendering = (page: Page) => page.evaluate(() => window.visualizer?.isRendering() ?? false);

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
  await page.locator(".library__row").first().click();
  await expect.poll(() => page.evaluate(() => window.player.isPlaying)).toBe(true);
}

async function switchToMilkDrop(page: Page): Promise<void> {
  await page.locator(".visualizer-controls__mode").click();
  await expect(webglCanvas(page)).toBeVisible();
}

/** Only "Song With Lyrics" resolves; every other track gets a 404. */
async function mockLyrics(page: Page): Promise<void> {
  await page.route("**/lrclib.net/api/get*", (route) => {
    const name = new URL(route.request().url()).searchParams.get("track_name") ?? "";
    if (name !== "Song With Lyrics") {
      return route.fulfill({ status: 404, contentType: "application/json", body: "{}" });
    }
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        plainLyrics: null,
        syncedLyrics: "[00:01.00]First line\n[00:04.00]Second line",
        instrumental: false,
      }),
    });
  });
}

test("switching to MilkDrop stops the columns renderer and shows the WebGL canvas", async ({
  page,
}) => {
  await page.goto("/");
  await waitForAppReady(page);
  await dropFile(page, "Artist - Track.wav");
  await playFirstRow(page);
  await expect.poll(() => barsAlphaSum(page)).toBeGreaterThan(0);

  await switchToMilkDrop(page);

  await expect(barsCanvas(page)).toBeHidden();
  await expect(webglCanvas(page)).toBeVisible();
  // the columns canvas holds no frame at all, not a frozen one
  await expect.poll(() => barsAlphaSum(page)).toBe(0);
  // butterchurn booted on the existing audio graph and renders scenes
  await expect.poll(() => isReady(page)).toBe(true);
  await expect.poll(() => isRendering(page)).toBe(true);
  // preset skip is a MilkDrop-only control
  await expect(page.locator(".visualizer-controls__skip")).toBeVisible();
});

test("the MilkDrop choice survives a reload", async ({ page }) => {
  await page.goto("/");
  await waitForAppReady(page);
  await dropFile(page, "Artist - Track.wav");
  await playFirstRow(page);
  await switchToMilkDrop(page);

  await page.reload();
  await waitForAppReady(page);

  await expect(webglCanvas(page)).toBeVisible();
  await expect(barsCanvas(page)).toBeHidden();
  await expect(page.locator(".visualizer-controls__mode")).toHaveText("Bars");
  expect(await page.evaluate(() => localStorage.getItem("visualizer-mode"))).toBe("milkdrop");
});

test("switching back to Bars resumes the columns renderer", async ({ page }) => {
  await page.goto("/");
  await waitForAppReady(page);
  await dropFile(page, "Artist - Track.wav");
  await playFirstRow(page);
  await switchToMilkDrop(page);
  await expect.poll(() => isReady(page)).toBe(true);

  // the toggle now names the mode a click returns to
  await page.locator(".visualizer-controls__mode").click();

  await expect(webglCanvas(page)).toBeHidden();
  await expect(barsCanvas(page)).toBeVisible();
  await expect(page.locator(".visualizer-controls__skip")).toBeHidden();
  await expect.poll(() => barsAlphaSum(page)).toBeGreaterThan(0);
});

test("preset skip loads the next preset immediately", async ({ page }) => {
  await page.goto("/");
  await waitForAppReady(page);
  await dropFile(page, "Artist - Track.wav");
  await playFirstRow(page);
  await switchToMilkDrop(page);
  await expect.poll(() => isReady(page)).toBe(true);
  const first = await page.evaluate(() => window.visualizer?.presetName());
  expect(first).toBeTruthy();

  await page.locator(".visualizer-controls__skip").click();

  await expect.poll(() => page.evaluate(() => window.visualizer?.presetName())).not.toBe(first);
});

test("the lyrics panel pauses MilkDrop and resume redraws when it hides", async ({ page }) => {
  await mockLyrics(page);
  await page.goto("/");
  await waitForAppReady(page);
  await dropTaggedWav(page, "plain.wav", { title: "Plain Song", artist: "Artist" });
  await dropTaggedWav(page, "lyrics.wav", { title: "Song With Lyrics", artist: "Artist" });
  await expectRowCount(page, 2);

  // plain track: MilkDrop renders with the panel out of the way
  await page.locator(".library__row").first().click();
  await expect.poll(() => isRendering(page)).toBe(true);
  await switchToMilkDrop(page);
  await expect.poll(() => isReady(page)).toBe(true);
  await expect(page.locator(".lyrics")).toBeHidden();

  // the lyrics panel takes the visualization area: the render loop pauses
  await page.locator(".library__row").nth(1).click();
  await expect(page.locator(".lyrics")).toBeVisible();
  await expect.poll(() => isRendering(page)).toBe(false);

  // back to the plain track: the panel hides and scene updates resume
  await page.locator(".library__row").first().click();
  await expect(page.locator(".lyrics")).toBeHidden();
  await expect.poll(() => isRendering(page)).toBe(true);
});

test("pausing playback stops MilkDrop scene updates", async ({ page }) => {
  await page.goto("/");
  await waitForAppReady(page);
  await dropFile(page, "Artist - Track.wav");
  await playFirstRow(page);
  await switchToMilkDrop(page);
  await expect.poll(() => isRendering(page)).toBe(true);

  await page.click(".player-controls__btn_play");

  await expect.poll(() => isRendering(page)).toBe(false);
});

test("a radio takeover clears and pauses the MilkDrop canvas", async ({ page }) => {
  await mockCatalog(page);
  await page.goto("/");
  await waitForAppReady(page);
  await dropFile(page, "Artist - Track.wav");
  await playFirstRow(page);
  await switchToMilkDrop(page);
  await expect.poll(() => isReady(page)).toBe(true);
  await expect.poll(() => isRendering(page)).toBe(true);

  await searchAndPlayFirst(page);

  await expect.poll(() => page.evaluate(() => window.radio.state())).toBe("playing");
  await expect.poll(() => isRendering(page)).toBe(false);
});

test("without WebGL2 the mode control is hidden and bars stay the only mode", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...rest: unknown[]
    ) {
      if (type === "webgl2") {
        return null;
      }
      return original.call(this, type, ...rest);
    } as typeof HTMLCanvasElement.prototype.getContext;
  });
  await page.goto("/");
  await waitForAppReady(page);
  await dropFile(page, "Artist - Track.wav");
  await playFirstRow(page);
  await expect(page.locator(".visualizer-controls__mode")).toBeHidden();
  await expect(page.locator(".visualizer-controls__skip")).toBeHidden();
  // the karaoke toggle lives in the same row and works without WebGL2
  await expect(page.locator(".visualizer-controls__lyrics")).toBeVisible();

  await expect.poll(() => barsAlphaSum(page)).toBeGreaterThan(0);
  // MilkDrop never engaged: no lazy chunk was even requested
  await expect.poll(() => isReady(page)).toBe(false);
});
