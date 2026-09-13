import { expect, test } from "@playwright/test";
import { dropFile, dropTaggedWav, expectRowCount, PNG_PIXEL, progressWidth } from "./helpers";

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

const ARTWORK_URL_100 = "https://is1-ssl.mzstatic.com/image/thumb/test/100x100bb.jpg";

/** Mocks the catalog and its image CDN, counting requests. */
async function mockArtworkCatalog(
  page: import("@playwright/test").Page,
  results: unknown[],
  status = 200,
) {
  const searches: string[] = [];
  const images: string[] = [];
  await page.route("**/itunes.apple.com/search*", async (route) => {
    searches.push(route.request().url());
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify({ results }),
    });
  });
  await page.route("**mzstatic.com/**", async (route) => {
    images.push(route.request().url());
    await route.fulfill({ contentType: "image/jpeg", body: PNG_PIXEL });
  });
  return { searches, images };
}

test("playing an artless track enriches its cover from the catalog", async ({ page }) => {
  const catalog = await mockArtworkCatalog(page, [
    { artistName: "Artist", artworkUrl100: ARTWORK_URL_100 },
  ]);
  await page.goto("/");
  await dropTaggedWav(page, "Artist - Catalog.wav", {
    title: "Catalog",
    artist: "Artist",
    album: "Album",
  });
  await expectRowCount(page, 1);

  await page.locator(".library__row").first().click();
  // the placeholder is replaced by the fetched cover
  await expect(page.locator(".library__row img.library__thumb")).toBeVisible();
  // the image request upsamples the catalog thumbnail to 600x600
  expect(catalog.images).toHaveLength(1);
  expect(catalog.images[0]).toContain("600x600bb.jpg");

  // the enriched cover persists in IndexedDB: reload renders it without
  // another catalog request
  await page.reload();
  await expectRowCount(page, 1);
  await expect(page.locator(".library__row img.library__thumb")).toBeVisible();
  expect(catalog.searches).toHaveLength(1);
});

test("enrichment fetches once per album across its tracks", async ({ page }) => {
  const catalog = await mockArtworkCatalog(page, [
    { artistName: "Artist", artworkUrl100: ARTWORK_URL_100 },
  ]);
  await page.goto("/");
  await dropTaggedWav(page, "Artist - First.wav", {
    title: "First",
    artist: "Artist",
    album: "Album",
  });
  await dropTaggedWav(page, "Artist - Second.wav", {
    title: "Second",
    artist: "Artist",
    album: "Album",
  });
  await expectRowCount(page, 2);

  await page.locator(".library__row").first().click();
  await expect(page.locator(".library__row").first().locator("img.library__thumb")).toBeVisible();
  expect(catalog.searches).toHaveLength(1);

  await page.locator(".library__row").nth(1).click();
  // second track of the same album: the pair cache answers, no new request
  await expect(page.locator(".library__row").nth(1).locator("img.library__thumb")).toBeVisible();
  expect(catalog.searches).toHaveLength(1);
});

test("embedded artwork suppresses the catalog request", async ({ page }) => {
  const catalog = await mockArtworkCatalog(page, [
    { artistName: "Artist", artworkUrl100: ARTWORK_URL_100 },
  ]);
  await page.goto("/");
  await dropTaggedWav(page, "Artist - Embedded.wav", {
    title: "Embedded",
    artist: "Artist",
    album: "Album",
    artwork: true,
  });
  await expectRowCount(page, 1);

  await page.locator(".library__row").first().click();
  await expect(page.locator(".library__row img.library__thumb")).toBeVisible();
  expect(catalog.searches).toHaveLength(0);
});

test("a track without artist metadata skips enrichment", async ({ page }) => {
  const catalog = await mockArtworkCatalog(page, [
    { artistName: "Artist", artworkUrl100: ARTWORK_URL_100 },
  ]);
  await page.goto("/");
  await dropFile(page, "Plain Title.wav");
  await expectRowCount(page, 1);

  await page.locator(".library__row").first().click();
  await page.waitForTimeout(400);
  expect(catalog.searches).toHaveLength(0);
  await expect(page.locator(".library__row .library__thumb_empty")).toBeVisible();
});

test("a catalog miss keeps the placeholder quietly", async ({ page }) => {
  const catalog = await mockArtworkCatalog(page, [], 404);
  await page.goto("/");
  await dropTaggedWav(page, "Artist - Missing.wav", {
    title: "Missing",
    artist: "Artist",
    album: "Album",
  });
  await expectRowCount(page, 1);

  await page.locator(".library__row").first().click();
  await page.waitForTimeout(400);
  expect(catalog.searches).toHaveLength(1);
  await expect(page.locator(".library__row .library__thumb_empty")).toBeVisible();
});
