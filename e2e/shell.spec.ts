import { expect, type Page, test } from "@playwright/test";
import { seedLibrary, waitForAppReady } from "./helpers";
import { mockCatalog } from "./radio.helpers";

async function expectShellRegions(page: Page): Promise<void> {
  await expect(page.locator(".playlist")).toBeVisible();
  await expect(page.locator(".audio_visualize")).toBeVisible();
  await expect(page.locator(".bar")).toBeVisible();
  await expect(page.locator(".library__header")).toBeVisible();
}

const playerVolume = (page: Page) => page.evaluate(() => window.player.volume);
const playerMuted = (page: Page) => page.evaluate(() => window.player.muted);
const playerPosition = (page: Page) => page.evaluate(() => window.player.position);

test.describe("ui-shell regions", () => {
  test("shell regions persist across mode switches", async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);

    for (const switchTo of [".library__mode", ".library__mode-playlists", ".library__mode"]) {
      await page.click(switchTo);
      await expectShellRegions(page);
    }
  });

  test("shell regions persist across reload", async ({ page }) => {
    await seedLibrary(page);
    await page.reload();
    await waitForAppReady(page);

    await expectShellRegions(page);
    await expect(page.locator("#seek-root .progress__bar")).toBeVisible();
    await expect(page.locator("#transport-root .player-controls__btn_play")).toBeVisible();
    await expect(page.locator("#volume-root .volume__btn")).toBeVisible();
  });

  test("list ownership handoff leaves no stale or duplicated rows", async ({ page }) => {
    await mockCatalog(page);
    await seedLibrary(page);

    // library -> radio: radio owns the list and renders stations
    await page.click(".library__mode");
    await page.fill(".library__search", "test");
    await expect(page.locator(".radio__row")).toHaveCount(2);

    // radio -> library: the island takes the list back, stations are gone;
    // the shared search keeps its query by design, so the user clears it
    await page.click(".library__mode");
    await page.fill(".library__search", "");
    await expect(page.locator(".library__row")).toHaveCount(1);
    await expect(page.locator(".library__row")).toContainText("Artist - Test Track");

    // library -> playlists -> library: playlist rows must not linger
    await page.click(".library__mode-playlists");
    await page.click(".playlists__new");
    await expect(page.locator(".playlists__row")).toHaveCount(1);
    await page.click(".library__mode-playlists");
    await expect(page.locator(".library__row")).toHaveCount(1);
    await expect(page.locator(".playlists__row")).toHaveCount(0);
  });
});

test.describe("keyboard operability: library", () => {
  test("a track row activates with the keyboard", async ({ page }) => {
    await seedLibrary(page);

    const row = page.locator(".library__row").first();
    await row.focus();
    await expect(row).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(page.locator(".library__row").first()).toHaveClass(/library__row_playing/u);
    expect(await page.evaluate(() => window.player.isPlaying)).toBe(true);
  });
});

test.describe("keyboard operability: transport", () => {
  test("transport play and pause work from the keyboard", async ({ page }) => {
    await seedLibrary(page);

    const playBtn = page.locator(".player-controls__btn_play");
    await playBtn.focus();
    await page.keyboard.press("Enter");
    await expect(playBtn).toHaveClass(/player-controls__btn_pause/u);

    await page.keyboard.press("Space");
    await expect(playBtn).not.toHaveClass(/player-controls__btn_pause/u);
  });

  test("seek moves in keyboard steps without stopping playback", async ({ page }) => {
    await seedLibrary(page);
    await page.click(".player-controls__btn_play");
    await expect(page.locator(".player-controls__btn_play")).toHaveClass(
      /player-controls__btn_pause/u,
    );
    // the seek control enables once the duration is known
    const seek = page.locator("#seek-root .slider-input");
    await expect(seek).not.toBeDisabled();
    await seek.focus();
    await expect(seek).toBeFocused();

    // wait until playback actually progresses before stepping
    await expect.poll(() => playerPosition(page), { timeout: 5_000 }).toBeGreaterThan(0.2);
    const before = await playerPosition(page);
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(300);

    expect(await playerPosition(page)).toBeGreaterThan(before + 0.5);
    expect(await page.evaluate(() => window.player.isPlaying)).toBe(true);
  });
});

test.describe("keyboard operability: volume", () => {
  test("volume adjusts and mutes from the keyboard", async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);

    const volume = page.locator("#volume-root .volume__knob");
    await volume.focus();
    const before = await playerVolume(page);

    await page.keyboard.press("ArrowUp");
    expect(await playerVolume(page)).toBeCloseTo(before + 0.05, 5);

    const mute = page.locator(".volume__btn");
    await mute.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(".volume__icon")).toHaveClass(/volume__icon_mute/u);
    expect(await playerMuted(page)).toBe(true);

    await page.keyboard.press("Enter");
    await expect(page.locator(".volume__icon")).not.toHaveClass(/volume__icon_mute/u);
  });
});
