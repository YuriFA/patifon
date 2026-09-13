import type { Page } from "@playwright/test";
import { expectRowCount } from "./helpers";

export const SYNCED_LRC = [
  "[00:01.00]First line",
  "[00:04.00]Second line",
  "[00:08.00]Third line",
  "[00:12.00]Fourth line",
].join("\n");

export const PLAIN_TEXT = "Just a plain text\nwithout any timestamps";

export const SYNCED_TRACK = {
  plainLyrics: null,
  syncedLyrics: SYNCED_LRC,
  instrumental: false,
};

export async function playFirstRow(page: Page): Promise<void> {
  await expectRowCount(page, 1);
  await page.locator(".library__row").first().click();
}

/** Selects the LYRICS tab: the panel shows only while this tab is active. */
export async function openLyricsTab(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Lyrics" }).click();
}

export function currentTime(page: Page): Promise<number> {
  return page.evaluate(
    () => (window.player as unknown as { audio: HTMLAudioElement }).audio.currentTime,
  );
}

interface LyricsCounters {
  requests: string[];
}

export async function mockLrclib(
  page: Page,
  tracks: Record<string, unknown>,
): Promise<LyricsCounters> {
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

export interface ChainCounters {
  get: string[];
  search: string[];
  ovh: string[];
}

/** Mocks the whole fallback chain and counts requests per leg. */
export async function mockLyricsChain(
  page: Page,
  get: Record<string, unknown>,
  search: Record<string, unknown[]>,
  ovh: Record<string, unknown>,
): Promise<ChainCounters> {
  const counters: ChainCounters = { get: [], search: [], ovh: [] };
  await page.route("**/lrclib.net/api/get*", (route) => {
    const track = new URL(route.request().url()).searchParams.get("track_name") ?? "";
    counters.get.push(track);
    const body = get[track];
    return body === undefined
      ? route.fulfill({ status: 404, contentType: "application/json", body: "{}" })
      : route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
  });
  await page.route("**/lrclib.net/api/search*", (route) => {
    const track = new URL(route.request().url()).searchParams.get("track_name") ?? "";
    counters.search.push(track);
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(search[track] ?? []),
    });
  });
  await page.route("**/api.lyrics.ovh/v1/**", (route) => {
    const url = new URL(route.request().url());
    const title = decodeURIComponent(url.pathname.split("/")[3] ?? "");
    counters.ovh.push(title);
    const body = ovh[title];
    return body === undefined
      ? route.fulfill({ status: 404, contentType: "application/json", body: "{}" })
      : route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
  });
  return counters;
}
