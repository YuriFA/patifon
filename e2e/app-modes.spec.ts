import { expect, test } from "@playwright/test";
import { dropFile, expectRowCount, waitForAppReady } from "./helpers";
import { mockCatalog, searchAndPlayFirst } from "./radio.helpers";

const playBtn = ".player-controls__btn_play";

test("radio to playlists switches directly without a library flash", async ({ page }) => {
  await mockCatalog(page);
  await page.goto("/");
  await waitForAppReady(page);
  await dropFile(page, "Alpha - First.wav");
  await expectRowCount(page, 1);

  await page.click(".library__mode");
  await expect(page.locator(".library__row")).toHaveCount(0);

  await page.click(".library__mode-playlists");
  await expect(page.locator(".playlists__new")).toBeVisible();
  await expect(page.locator(".library__empty")).toContainText("No playlists yet");
  // the library list never re-enters the shared list between the two views
  await expect(page.locator(".library__row")).toHaveCount(0);
  await expect(page.locator(".library__add")).toBeHidden();
});

test("rapid alternating switches land in a coherent library state", async ({ page }) => {
  await mockCatalog(page);
  await page.goto("/");
  await waitForAppReady(page);
  await dropFile(page, "Alpha - First.wav");
  await expectRowCount(page, 1);

  for (const button of [".library__mode", ".library__mode-playlists"]) {
    await page.click(button);
    await page.click(button);
  }

  await expectRowCount(page, 1);
  await expect(page.locator(".library__add")).toBeVisible();
  await expect(page.locator(".library__search")).toHaveAttribute("placeholder", "Search library");
  await expect(page.locator(".radio__row")).toHaveCount(0);
});

test("entering radio with query text searches stations for that text", async ({ page }) => {
  await mockCatalog(page);
  await page.goto("/");
  await waitForAppReady(page);
  await dropFile(page, "Alpha - First.wav");
  await expectRowCount(page, 1);

  await page.fill(".library__search", "test");
  await expect(page.locator(".library__row")).toHaveCount(0);

  await page.click(".library__mode");
  await expect(page.locator(".radio__row")).toHaveCount(2);
  await expect(page.locator(".radio__row").first()).toContainText("Test Radio One");
  await expect(page.locator(".library__search")).toHaveValue("test");
});

test("playing a library track takes over from a playing station", async ({ page }) => {
  await mockCatalog(page);
  await page.goto("/");
  await waitForAppReady(page);
  await dropFile(page, "Alpha - First.wav");
  await expectRowCount(page, 1);

  await searchAndPlayFirst(page);
  await expect(page.locator(playBtn)).toHaveClass(/player-controls__btn_pause/u);

  // back to the library view: the station stays engaged as the now-playing card
  await page.click(".library__mode");
  await expect(page.locator(".station-now")).toBeVisible();

  await page.fill(".library__search", "");
  await page.locator(".library__row").first().click();
  await expect(page.evaluate(() => window.radio.state())).resolves.toBe("stopped");
  await expect(page.evaluate(() => window.player.isPlaying)).resolves.toBe(true);
  await expect(page.locator(".station-now")).toBeHidden();
});

test("entering playlists while a track plays keeps it playing", async ({ page }) => {
  await page.goto("/");
  await waitForAppReady(page);
  await dropFile(page, "Alpha - First.wav");
  await expectRowCount(page, 1);

  await page.locator(".library__row").first().click();
  await expect(page.locator(playBtn)).toHaveClass(/player-controls__btn_pause/u);

  await page.click(".library__mode-playlists");
  await expect(page.locator(".playlists__new")).toBeVisible();
  const stillPlaying = await page.evaluate(() => window.player.isPlaying);
  expect(stillPlaying).toBe(true);
});

test("import controls follow the active mode", async ({ page }) => {
  await mockCatalog(page);
  await page.goto("/");
  await waitForAppReady(page);
  await dropFile(page, "Alpha - First.wav");

  await page.click(".library__mode");
  await expect(page.locator(".library__add")).toBeHidden();

  await page.click(".library__mode-playlists");
  await expect(page.locator(".library__add")).toBeHidden();

  await page.click(".library__mode-playlists");
  await expect(page.locator(".library__add")).toBeVisible();
});

test("transport icon follows the newly audible source", async ({ page }) => {
  await mockCatalog(page);
  await page.goto("/");
  await waitForAppReady(page);
  await dropFile(page, "Alpha - First.wav");
  await expectRowCount(page, 1);

  await searchAndPlayFirst(page);
  await expect(page.locator(playBtn)).toHaveClass(/player-controls__btn_pause/u);

  // pausing the station flips the glyph for the station source
  await page.click(playBtn);
  await expect(page.locator(playBtn)).not.toHaveClass(/player-controls__btn_pause/u);

  // a library track takes over: the glyph flips to pause for the new source
  await page.click(".library__mode");
  await expect(page.locator(".station-now")).toBeVisible();
  await page.fill(".library__search", "");
  await page.locator(".library__row").first().click();
  await expect(page.locator(playBtn)).toHaveClass(/player-controls__btn_pause/u);
});
