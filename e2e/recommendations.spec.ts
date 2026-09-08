import { expect, test, type Page, type Route } from "@playwright/test";
import { dropTaggedWav, waitForAppReady } from "./helpers";

const TOKEN = "token-e2e";
const USERNAME = "e2e-user";
const JAMS_MBID = "11111111-1111-4111-8111-111111111111";
const EXPLORATION_MBID = "22222222-2222-4222-8222-222222222222";

interface RecommendationMockOptions {
  failList?: () => boolean;
  failDetail?: () => boolean;
  empty?: boolean;
}

interface MockState {
  createdForRequests: number;
  failList: () => boolean;
  failDetail: () => boolean;
}

function lbTrack(title: string, creator: string, durationMs = 0) {
  return {
    title,
    creator,
    album: "Album",
    duration: durationMs,
    identifier: ["https://musicbrainz.org/recording/x"],
  };
}

function jsonRoute(route: Route, body: unknown): Promise<void> {
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function fulfillValidate(route: Route): Promise<void> {
  await jsonRoute(route, { code: 200, valid: true, user_name: USERNAME });
}

async function fulfillCreatedFor(
  route: Route,
  state: MockState,
  options: RecommendationMockOptions,
): Promise<void> {
  state.createdForRequests += 1;
  if (state.failList()) {
    await route.abort("connectionfailed");
    return;
  }
  const playlists = options.empty
    ? []
    : [
        {
          playlist: {
            title: "Weekly Jams for e2e-user",
            identifier: `https://listenbrainz.org/playlist/${JAMS_MBID}`,
            date: "2026-09-07T00:00:00+00:00",
          },
        },
        {
          playlist: {
            title: "Weekly Exploration",
            identifier: `https://listenbrainz.org/playlist/${EXPLORATION_MBID}`,
            date: "2026-08-31T00:00:00+00:00",
          },
        },
      ];
  await jsonRoute(route, {
    count: playlists.length,
    offset: 0,
    playlist_count: playlists.length,
    playlists,
  });
}

async function fulfillJams(route: Route, tracks: unknown[], state: MockState): Promise<void> {
  if (state.failDetail()) {
    await route.abort("connectionfailed");
    return;
  }
  await jsonRoute(route, {
    playlist: {
      title: "Weekly Jams for e2e-user",
      date: "2026-09-07T00:00:00+00:00",
      track: tracks,
    },
  });
}

function mockRecommendations(
  page: Page,
  tracks: unknown[],
  options: RecommendationMockOptions = {},
): MockState {
  const state: MockState = {
    createdForRequests: 0,
    failList: options.failList ?? (() => false),
    failDetail: options.failDetail ?? (() => false),
  };
  void page.route("https://api.listenbrainz.org/**", async (route) => {
    const url = route.request().url();
    if (url.includes("validate-token")) {
      await fulfillValidate(route);
    } else if (url.includes("/playlists/createdfor")) {
      await fulfillCreatedFor(route, state, options);
    } else if (url.includes(`/playlist/${JAMS_MBID}`)) {
      await fulfillJams(route, tracks, state);
    } else {
      await jsonRoute(route, { playlist: { title: "Weekly Exploration", track: [] } });
    }
  });
  return state;
}

/** Seeds token + username before boot, as an already-connected user has. */
async function connectListenBrainz(page: Page): Promise<void> {
  await page.addInitScript(
    ([token, username]) => {
      localStorage.setItem("listenbrainz-token", token);
      localStorage.setItem("listenbrainz-username", username);
    },
    [TOKEN, USERNAME],
  );
}

async function enterPlaylistsView(page: Page): Promise<void> {
  await page.click(".library__mode-playlists");
  await expect(page.locator(".recommendations")).toBeVisible();
}

test.beforeEach(({ page }) => {
  mockRecommendations(page, [
    lbTrack("Never Gonna Give You Up", "Rick Astley"),
    lbTrack("Absent Melody", "Nobody Here"),
  ]);
});

test("connect flow stores the ListenBrainz username", async ({ page }) => {
  await page.goto("/");
  await waitForAppReady(page);
  await page.click(".player-controls__btn_scrobbling");
  await page.fill(".scrobbling-popup__token", TOKEN);
  await page.click(".scrobbling-popup__connect");
  await expect(page.locator(".scrobbling-popup__status")).toHaveText("Connected to ListenBrainz");
  const username = await page.evaluate(() => localStorage.getItem("listenbrainz-username"));
  expect(username).toBe(USERNAME);
});

test("prompts to connect and performs no requests without a token", async ({ page }) => {
  const state = mockRecommendations(page, []);
  await page.goto("/");
  await waitForAppReady(page);
  await enterPlaylistsView(page);
  await expect(page.locator(".recommendations__state")).toContainText("Connect ListenBrainz");
  expect(state.createdForRequests).toBe(0);
});

test("lists playlists, matches the library, and plays in playlist order", async ({ page }) => {
  await connectListenBrainz(page);
  await page.goto("/");
  await waitForAppReady(page);
  await dropTaggedWav(page, "rick.wav", {
    title: "Never Gonna Give You Up",
    artist: "Rick Astley",
  });
  await enterPlaylistsView(page);

  await expect(page.locator(".recommendations__row")).toHaveCount(2);
  await page.click(".recommendations__row");

  const trackRows = page.locator(".recommendations__track");
  await expect(trackRows).toHaveCount(2);
  await expect(trackRows.nth(0)).toContainText("Rick Astley - Never Gonna Give You Up");
  await expect(trackRows.nth(0)).not.toHaveClass(/recommendations__track_missing/u);
  await expect(trackRows.nth(1)).toHaveClass(/recommendations__track_missing/u);
  await expect(trackRows.nth(1)).toHaveAttribute("title", "Not in library");
  await expect(page.locator(".recommendations__row").first()).toContainText("1/2 in library");

  await trackRows.nth(0).click();
  await expect.poll(() => page.evaluate(() => window.player?.isPlaying ?? false)).toBe(true);
  await expect(trackRows.nth(0)).toHaveClass(/library__row_playing/u);
});

test("matching normalizes case, punctuation and diacritics", async ({ page }) => {
  mockRecommendations(page, [lbTrack("cafe - del  mar!!", "jose padilla")]);
  await connectListenBrainz(page);
  await page.goto("/");
  await waitForAppReady(page);
  await dropTaggedWav(page, "ibiza.wav", { title: "Café Del Mar", artist: "José Padilla" });
  await enterPlaylistsView(page);

  await page.click(".recommendations__row");
  await expect(page.locator(".recommendations__track")).toHaveCount(1);
  await expect(page.locator(".recommendations__track")).not.toHaveClass(
    /recommendations__track_missing/u,
  );
});

test("known duration mismatch keeps the track unplayable", async ({ page }) => {
  mockRecommendations(page, [lbTrack("Never Gonna Give You Up", "Rick Astley", 200_000)]);
  await connectListenBrainz(page);
  await page.goto("/");
  await waitForAppReady(page);
  await dropTaggedWav(page, "rick.wav", {
    title: "Never Gonna Give You Up",
    artist: "Rick Astley",
  });
  await enterPlaylistsView(page);

  await page.click(".recommendations__row");
  await expect(page.locator(".recommendations__track")).toHaveClass(
    /recommendations__track_missing/u,
  );
});

test("saves a recommendation as a local playlist", async ({ page }) => {
  await connectListenBrainz(page);
  await page.goto("/");
  await waitForAppReady(page);
  await dropTaggedWav(page, "rick.wav", {
    title: "Never Gonna Give You Up",
    artist: "Rick Astley",
  });
  await enterPlaylistsView(page);

  await page.click(".recommendations__row");
  const saveButton = page.locator(".recommendations__save");
  await expect(saveButton).toBeVisible();
  await saveButton.click();

  const localRow = page.locator(".library__list .playlists__row", {
    hasText: "Weekly Jams for e2e-user",
  });
  await expect(localRow).toHaveCount(1);
  await localRow.click();
  await expect(
    page.locator(".library__list .playlists__track", { hasText: "Never Gonna Give You Up" }),
  ).toHaveCount(1);
});

test("shows retry after a failed fetch and recovers", async ({ page }) => {
  const state = mockRecommendations(page, [], { failList: () => true });
  await connectListenBrainz(page);
  await page.goto("/");
  await waitForAppReady(page);
  await enterPlaylistsView(page);

  const retry = page.locator(".recommendations__state button", { hasText: "Retry" });
  await expect(retry).toBeVisible();

  state.failList = () => false;
  await retry.click();
  await expect(page.locator(".recommendations__row")).toHaveCount(2);
});

test("guides when the account has no created-for-you playlists", async ({ page }) => {
  mockRecommendations(page, [], { empty: true });
  await connectListenBrainz(page);
  await page.goto("/");
  await waitForAppReady(page);
  await enterPlaylistsView(page);
  await expect(page.locator(".recommendations__state")).toContainText(
    "No created-for-you playlists yet",
  );
});

test("retries a playlist whose details failed to load", async ({ page }) => {
  const state = mockRecommendations(
    page,
    [lbTrack("Never Gonna Give You Up", "Rick Astley"), lbTrack("Absent Melody", "Nobody Here")],
    { failDetail: () => true },
  );
  await connectListenBrainz(page);
  await page.goto("/");
  await waitForAppReady(page);
  await dropTaggedWav(page, "rick.wav", {
    title: "Never Gonna Give You Up",
    artist: "Rick Astley",
  });
  await enterPlaylistsView(page);

  await page.click(".recommendations__row");
  await expect(page.locator(".recommendations__row").first()).toContainText("Could not load");
  state.failDetail = () => false;
  await page.click(".recommendations__row");
  await expect(page.locator(".recommendations__track")).toHaveCount(2);
});
