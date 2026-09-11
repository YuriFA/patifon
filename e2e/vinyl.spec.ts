import { expect, test, type Page } from "@playwright/test";
import { dropTaggedWav, expectRowCount, waitForAppReady } from "./helpers";
import { mockCatalog, searchAndPlayFirst } from "./radio.helpers";

const areaTab = (page: Page, name: string) => page.getByRole("button", { name, exact: true });

async function playOnVinyl(page: Page): Promise<void> {
  await dropTaggedWav(page, "song-one.wav", { title: "Song One", artist: "Artist One" });
  await expectRowCount(page, 1);
  await page.locator(".library__row").first().click();
  await areaTab(page, "Vinyl").click();
}

test("the deck waits at rest on the VINYL tab before anything plays", async ({ page }) => {
  await page.goto("/");
  await waitForAppReady(page);
  await areaTab(page, "Vinyl").click();

  // no source yet: the deck shows idle (platter still, arm at rest)
  const deck = page.locator(".vinyl-deck");
  await expect(deck).toBeVisible();
  await expect(deck).not.toHaveClass(/vinyl-deck_playing/u);
});

test("the deck follows playback state: platter spins and tonearm drops", async ({ page }) => {
  await page.goto("/");
  await waitForAppReady(page);
  await playOnVinyl(page);

  const deck = page.locator(".vinyl-deck");
  await expect(deck).toBeVisible();
  await expect(deck).toHaveClass(/vinyl-deck_playing/u);

  // pausing stands the platter still and lifts the tonearm
  await page.click(".player-controls__btn_play");
  await expect(deck).not.toHaveClass(/vinyl-deck_playing/u);
});

test("the deck start/stop toggles playback like the transport", async ({ page }) => {
  await page.goto("/");
  await waitForAppReady(page);
  await playOnVinyl(page);
  const deck = page.locator(".vinyl-deck");
  await expect(deck).toHaveClass(/vinyl-deck_playing/u);

  await deck.getByRole("button", { name: "Stop" }).click();
  await expect(deck).not.toHaveClass(/vinyl-deck_playing/u);
  await expect(page.locator(".player-controls__btn_play")).toHaveAttribute("title", "Play");

  await deck.getByRole("button", { name: "Start" }).click();
  await expect(deck).toHaveClass(/vinyl-deck_playing/u);
});

test("the pitch fader changes the playback rate and survives a track change", async ({ page }) => {
  await page.goto("/");
  await waitForAppReady(page);
  await playOnVinyl(page);

  await page.locator(".vinyl-deck__pitch").fill("4");
  await expect.poll(() => page.evaluate(() => window.player.playbackRate)).toBeCloseTo(1.25, 5);

  // the rate is playback state: the next track inherits it (no per-track reset)
  await page.locator(".vinyl-deck__pitch").fill("-8");
  await expect.poll(() => page.evaluate(() => window.player.playbackRate)).toBeCloseTo(0.5, 5);
  await page.locator(".player-controls__btn_next").click();
  await expect.poll(() => page.evaluate(() => window.player.playbackRate)).toBeCloseTo(0.5, 5);
});

test("a radio takeover clears the deck and radio ignores the rate", async ({ page }) => {
  await mockCatalog(page);
  await page.goto("/");
  await waitForAppReady(page);
  await playOnVinyl(page);
  await page.locator(".vinyl-deck__pitch").fill("8");
  await expect.poll(() => page.evaluate(() => window.player.playbackRate)).toBeCloseTo(1.5, 5);

  await searchAndPlayFirst(page);
  await expect(page.locator(".vinyl-deck")).toBeHidden();
  await expect(page.locator(".progress__live")).toBeVisible();
  // radio mode renders its own view; the deck stays cleared
  await expect(page.locator(".vinyl-deck")).toBeHidden();
});

test("the VINYL tab works without WebGL2 and its choice persists", async ({ page }) => {
  await page.addInitScript(() => {
    const canvas = HTMLCanvasElement.prototype;
    const original = canvas.getContext;
    canvas.getContext = function (this: HTMLCanvasElement, type: string) {
      // strip WebGL2 only: the deck is DOM/CSS and must not depend on it
      if (type === "webgl2") {
        return null;
      }
      return original.call(this, type);
    } as typeof original;
  });
  await page.goto("/");
  await waitForAppReady(page);
  await playOnVinyl(page);

  const deck = page.locator(".vinyl-deck");
  await expect(deck).toBeVisible();

  // the choice survives a reload
  await page.reload();
  await waitForAppReady(page);
  await expect(page.getByRole("button", { name: "Vinyl" })).toHaveAttribute("aria-pressed", "true");
});

test("the now-playing panel follows the library track and clears on radio", async ({ page }) => {
  await mockCatalog(page);
  await page.goto("/");
  await waitForAppReady(page);
  await dropTaggedWav(page, "song-one.wav", { title: "Song One", artist: "Artist One" });
  await expectRowCount(page, 1);
  await page.locator(".library__row").first().click();

  const panel = page.locator(".now-playing");
  await expect(panel).toContainText("Song One - Artist One");
  await expect(panel).toContainText("Now playing");
  await expect(page.locator(".now-playing__meter")).toBeVisible();

  // radio mode renders its own view; the panel holds no library content
  await searchAndPlayFirst(page);
  await expect(page.locator(".progress__live")).toBeVisible();
  await expect(panel).toHaveCount(0);
});
