import { expect, test } from "@playwright/test";
import { dropTaggedWav, waitForAppReady } from "./helpers";
import {
  currentTime,
  openLyricsTab,
  playFirstRow,
  SYNCED_LRC,
  SYNCED_TRACK,
  mockLyricsChain,
} from "./lyrics.helpers";

test("an exact hit short-circuits the chain", async ({ page }) => {
  const counters = await mockLyricsChain(page, { "Hit Song": SYNCED_TRACK }, {}, {});
  await page.goto("/");
  await waitForAppReady(page);
  await dropTaggedWav(page, "hit-song.wav", { title: "Hit Song", artist: "Hit Artist" });
  await playFirstRow(page);
  await openLyricsTab(page);

  await expect(page.locator(".lyrics")).toBeVisible();
  await expect(page.locator(".lyrics__line").first()).toHaveText("First line");
  expect(counters.get).toEqual(["Hit Song"]);
  expect(counters.search).toHaveLength(0);
  expect(counters.ovh).toHaveLength(0);
});

test("a search miss falls back to ranked candidates", async ({ page }) => {
  const bootleg = {
    plainLyrics: "Bootleg take\nof the song",
    syncedLyrics: null,
    instrumental: false,
    albumName: "2005-06-12: Download Festival",
    duration: 20.1,
  };
  const studio = {
    plainLyrics: "Studio take\nof the song",
    syncedLyrics: SYNCED_LRC,
    instrumental: false,
    albumName: "Album One",
    duration: 19.2,
  };
  const wrongTake = {
    plainLyrics: "Extended mix",
    syncedLyrics: SYNCED_LRC,
    instrumental: false,
    albumName: "Album One",
    duration: 45,
  };
  const counters = await mockLyricsChain(
    page,
    {},
    { "Search Song": [bootleg, studio, wrongTake] },
    {},
  );
  await page.goto("/");
  await waitForAppReady(page);
  await dropTaggedWav(page, "search-song.wav", {
    title: "Search Song",
    artist: "Search Artist",
    album: "Album One",
  });
  await playFirstRow(page);
  await openLyricsTab(page);

  // album match outranks the closer-duration bootleg; the >10s take is out
  await expect(page.locator(".lyrics__line").first()).toHaveText("First line");
  await expect.poll(() => counters.get).toEqual(["Search Song"]);
  expect(counters.search).toEqual(["Search Song"]);
  expect(counters.ovh).toHaveLength(0);
});

test("an external miss falls through to plain-only lyrics", async ({ page }) => {
  const counters = await mockLyricsChain(
    page,
    {},
    {},
    { "Extern Song": { lyrics: "External plain\ntext only\n" } },
  );
  await page.goto("/");
  await waitForAppReady(page);
  await dropTaggedWav(page, "extern-song.wav", {
    title: "Extern Song (Remastered 2026)",
    artist: "Extern Artist",
  });
  await playFirstRow(page);
  await openLyricsTab(page);

  const plain = page.locator(".lyrics__line_plain");
  await expect(plain).toBeVisible();
  await expect(plain).toContainText("External plain");
  await expect(page.locator(".lyrics__line_active")).toHaveCount(0);
  // the qualifier was stripped from the external request
  await expect.poll(() => counters.ovh).toEqual(["Extern Song"]);
  expect(counters.get).toEqual(["Extern Song (Remastered 2026)"]);
  expect(counters.search).toEqual(["Extern Song (Remastered 2026)"]);

  // cached: replaying does not re-run any chain leg
  await page.evaluate(() => {
    (window.player as unknown as { audio: HTMLAudioElement }).audio.currentTime = 19;
  });
  await page.waitForTimeout(2_500);
  await page.locator(".library__row").first().click();
  await expect(page.locator(".lyrics__line_plain")).toContainText("External plain");
  expect(counters.ovh).toHaveLength(1);
});

test("an exhausted chain behaves like no lyrics", async ({ page }) => {
  const counters = await mockLyricsChain(page, {}, {}, {});
  await page.goto("/");
  await waitForAppReady(page);
  await dropTaggedWav(page, "nowhere-song.wav", {
    title: "Nowhere Song",
    artist: "Nowhere Artist",
  });
  await playFirstRow(page);
  await openLyricsTab(page);

  await expect(page.locator(".lyrics__empty")).toBeVisible();
  expect(counters.get).toEqual(["Nowhere Song"]);
  expect(counters.search).toEqual(["Nowhere Song"]);
  expect(counters.ovh).toEqual(["Nowhere Song"]);
  await expect.poll(() => currentTime(page), { timeout: 5_000 }).toBeGreaterThan(0.5);
});
