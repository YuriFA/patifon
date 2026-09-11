import { expect, test } from "@playwright/test";
import { dropFile, expectRowCount, progressWidth } from "./helpers";

test("drop import adds rows with filename fallback metadata", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".library__empty")).toBeVisible();

  await dropFile(page, "Artist - Test Track.wav");
  const rows = page.locator(".library__row");
  await expectRowCount(page, 1);
  await expect(rows.first().locator(".library__title")).toHaveText("Test Track");
  // duration parsed from the audio itself: 20 s
  await expect(rows.first().locator(".library__duration")).toHaveText("0:20");
});

test("non-audio drop is ignored", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    const file = new File(["not audio"], "readme.txt", { type: "text/plain" });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    document.body.dispatchEvent(new DragEvent("drop", { dataTransfer: transfer, bubbles: true }));
  });
  await expectRowCount(page, 0);
  await expect(page.locator(".library__empty")).toBeVisible();
});

test("library persists across reload and stays playable", async ({ page }) => {
  await page.goto("/");
  await dropFile(page, "Artist - Persisted.wav");
  await expectRowCount(page, 1);

  await page.reload();
  await expectRowCount(page, 1);

  await page.locator(".library__row").first().click();
  await page.waitForTimeout(1200);
  // playing from the restored blob
  expect(await progressWidth(page)).toBeGreaterThan(0.5);
});

test("search narrows the list and clearing restores it", async ({ page }) => {
  await page.goto("/");
  await dropFile(page, "Artist - Alpha.wav");
  await dropFile(page, "Artist - Beta.wav");
  await expectRowCount(page, 2);

  await page.fill(".library__search", "Alpha");
  await expect(page.locator(".library__row")).toHaveCount(1);
  await expect(page.locator(".library__row .library__title")).toHaveText("Alpha");
  await expect(page.locator(".library__row .library__artist")).toHaveText("Artist");

  await page.fill(".library__search", "");
  await expectRowCount(page, 2);
});

test("clicking a row switches playback and highlights it", async ({ page }) => {
  await page.goto("/");
  await dropFile(page, "Artist - Alpha.wav");
  await dropFile(page, "Artist - Beta.wav");
  await expectRowCount(page, 2);

  await page.locator(".library__row").first().click();
  await page.waitForTimeout(600);
  await expect(page.locator(".library__row").first()).toHaveClass(/library__row_playing/u);

  await page.locator(".library__row").nth(1).click();
  await page.waitForTimeout(300);
  await expect(page.locator(".library__row").nth(1)).toHaveClass(/library__row_playing/u);
  await expect(page.locator(".library__row").first()).not.toHaveClass(/library__row_playing/u);
});
