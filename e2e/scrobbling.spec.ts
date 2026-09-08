import { expect, test, type Page } from "@playwright/test";
import { dropFile, dropTaggedWav, expectRowCount, waitForAppReady } from "./helpers";

const TOKEN = "token-e2e";

interface CapturedRequest {
  url: string;
  body: {
    listen_type: string;
    payload: Array<{
      track_metadata: { track_name: string; artist_name: string };
      listened_at?: string;
    }>;
  };
  t: number;
}

/**
 * Intercepts api.listenbrainz.org: validate-token answers per token match,
 * submit-listens records timestamps and either fails at the network level
 * (fail() returns true) or answers 200.
 */
function mockListenBrainz(page: Page, options: { fail?: () => boolean } = {}): CapturedRequest[] {
  const requests: CapturedRequest[] = [];
  void page.route("https://api.listenbrainz.org/**", async (route) => {
    const url = route.request().url();
    if (url.includes("validate-token")) {
      const auth = route.request().headers()["authorization"] ?? "";
      const valid = auth === `Token ${TOKEN}`;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ code: 200, message: "OK", valid }),
      });
      return;
    }
    requests.push({
      url,
      body: route.request().postDataJSON() as CapturedRequest["body"],
      t: Date.now(),
    });
    if (options.fail?.()) {
      await route.abort("connectionfailed");
    } else {
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
  });
  return requests;
}

function submits(requests: CapturedRequest[]): CapturedRequest[] {
  return requests.filter((request) => request.url.includes("submit-listens"));
}

async function waitSubmits(requests: CapturedRequest[], count: number): Promise<void> {
  await expect
    .poll(() => submits(requests).length, { timeout: 10_000 })
    .toBeGreaterThanOrEqual(count);
}

async function openScrobblingPopup(page: Page): Promise<void> {
  await page.click(".player-controls__btn_scrobbling");
  await expect(page.locator(".scrobbling-popup")).toHaveClass(/scrobbling-popup__open/u);
  // the popup animates max-height; controls inside stay "unstable" until it ends
  await page.waitForTimeout(400);
}

async function connect(page: Page): Promise<void> {
  await openScrobblingPopup(page);
  await page.fill(".scrobbling-popup__token", TOKEN);
  await page.click(".scrobbling-popup__connect");
  await expect(page.locator(".scrobbling-popup__status")).toHaveText("Connected to ListenBrainz");
}

async function playRow(page: Page, index: number): Promise<void> {
  await page.locator(".library__row").nth(index).click();
}

function queuedCount(page: Page): Promise<number> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("audio-player");
      request.addEventListener("success", () => resolve(request.result));
      request.addEventListener("error", () => reject(request.error));
    });
    const count = await new Promise<number>((resolve) => {
      const tx = db.transaction("listens", "readonly");
      const getAll = tx.objectStore("listens").getAll();
      getAll.addEventListener("success", () => resolve(getAll.result.length));
    });
    db.close();
    return count;
  });
}
test("connects with a valid token and survives a reload", async ({ page }) => {
  mockListenBrainz(page);
  await page.goto("/");
  await waitForAppReady(page);
  await connect(page);

  await page.reload();
  await waitForAppReady(page);
  await openScrobblingPopup(page);
  await expect(page.locator(".scrobbling-popup__status")).toHaveText("Connected to ListenBrainz");
});

test("rejects an invalid token and submits nothing", async ({ page }) => {
  const requests = mockListenBrainz(page);
  await page.goto("/");
  await dropFile(page, "Alpha - First.wav");
  await expectRowCount(page, 1);
  await waitForAppReady(page);

  await openScrobblingPopup(page);
  await page.fill(".scrobbling-popup__token", "wrong-token");
  await page.click(".scrobbling-popup__connect");
  await expect(page.locator(".scrobbling-popup__status")).toHaveText(
    "Token rejected by ListenBrainz",
  );

  await playRow(page, 0);
  await page.waitForTimeout(1500);
  expect(submits(requests)).toEqual([]);
});

test("submits playing-now on play and a completed listen at the natural end", async ({ page }) => {
  const requests = mockListenBrainz(page);
  await page.goto("/");
  await dropFile(page, "Alpha - First.wav", 2);
  await expectRowCount(page, 1);
  await waitForAppReady(page);
  await connect(page);

  await playRow(page, 0);
  // natural end wraps to the same record: playing-now #2 plus the settled single
  await expect
    .poll(
      () => submits(requests).filter((request) => request.body.listen_type === "single").length,
      { timeout: 10_000 },
    )
    .toBeGreaterThanOrEqual(1);
  const playingNow = submits(requests)[0];
  const single = submits(requests).find((request) => request.body.listen_type === "single")!;
  expect(playingNow.body.listen_type).toBe("playing_now");
  expect(playingNow.body.payload[0].track_metadata.artist_name).toBe("Alpha");
  expect(single.body.payload[0].track_metadata.track_name).toBe("First");
  expect(single.body.payload[0].listened_at).toBeTruthy();
});

test("does not submit a completed listen when switched away early", async ({ page }) => {
  const requests = mockListenBrainz(page);
  await page.goto("/");
  await dropFile(page, "Alpha - First.wav", 2);
  await dropFile(page, "Beta - Second.wav");
  await expectRowCount(page, 2);
  await waitForAppReady(page);
  await connect(page);

  await playRow(page, 0);
  await page.waitForTimeout(400);
  await playRow(page, 1);
  // the second track is long: any "single" listen arriving now is the first
  // track settling past the threshold, which must not happen
  await page.waitForTimeout(2000);
  expect(submits(requests).filter((request) => request.body.listen_type === "single")).toEqual([]);
});

test("keeps playing-now submissions one second apart on rapid switching", async ({ page }) => {
  const requests = mockListenBrainz(page);
  await page.goto("/");
  await dropFile(page, "Alpha - First.wav");
  await dropFile(page, "Beta - Second.wav");
  await dropFile(page, "Gamma - Third.wav");
  await expectRowCount(page, 3);
  await waitForAppReady(page);
  await connect(page);

  await playRow(page, 0);
  await playRow(page, 1);
  await playRow(page, 2);
  await waitSubmits(requests, 1);
  await page.waitForTimeout(1100);
  const playingNow = submits(requests).filter(
    (request) => request.body.listen_type === "playing_now",
  );
  expect(playingNow.length).toBeGreaterThanOrEqual(1);
  for (let i = 1; i < playingNow.length; i += 1) {
    expect(playingNow[i].t - playingNow[i - 1].t).toBeGreaterThanOrEqual(900);
  }
});

test("queues failed listens and retries them after a reload and the online event", async ({
  page,
}) => {
  let fail = true;
  const requests = mockListenBrainz(page, { fail: () => fail });
  await page.goto("/");
  await dropFile(page, "Alpha - First.wav", 2);
  await dropFile(page, "Beta - Second.wav");
  await expectRowCount(page, 2);
  await waitForAppReady(page);
  await connect(page);

  await playRow(page, 0);
  await page.waitForTimeout(1200);
  await playRow(page, 1);
  // the completion settles into the queue but the submit fails (offline)
  await expect.poll(() => queuedCount(page), { timeout: 5000 }).toBe(1);

  // reload with the network still down: the queue must survive the boot
  await page.reload();
  await waitForAppReady(page);
  await expect.poll(() => queuedCount(page), { timeout: 5000 }).toBe(1);

  fail = false;
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  // playing-now from before the outage is in the log too; the retry carries the single
  await expect
    .poll(
      () => submits(requests).filter((request) => request.body.listen_type === "single").length,
      { timeout: 10_000 },
    )
    .toBeGreaterThanOrEqual(1);
  const single = submits(requests).find((request) => request.body.listen_type === "single")!;
  expect(single.body.payload[0].track_metadata.artist_name).toBe("Alpha");
  await expect.poll(() => queuedCount(page), { timeout: 5000 }).toBe(0);
});

test("spaces queued listens at least one second apart", async ({ page }) => {
  const requests = mockListenBrainz(page);
  await page.goto("/");
  await waitForAppReady(page);
  await connect(page);

  // seed the retry queue with two listens directly, then reboot: the boot
  // drain must submit them through the spacing gate
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const listen = {
          track: "Seed Track",
          artist: "Seed Artist",
          album: null,
          listenedAt: new Date().toISOString(),
        };
        const request = indexedDB.open("audio-player");
        request.addEventListener("success", () => {
          const db = request.result;
          const tx = db.transaction("listens", "readwrite");
          tx.objectStore("listens").add(listen);
          tx.objectStore("listens").add(listen);
          tx.addEventListener("complete", () => {
            db.close();
            resolve();
          });
        });
      }),
  );
  await page.reload();
  await waitForAppReady(page);

  await waitSubmits(requests, 2);
  const [first, second] = submits(requests);
  // 900ms: the 1.1s in-page spacing minus clock/dispatch jitter between workers
  expect(second.t - first.t).toBeGreaterThanOrEqual(900);
});

test("toggle off stops every submission", async ({ page }) => {
  const requests = mockListenBrainz(page);
  await page.goto("/");
  await dropTaggedWav(page, "Tagged Artist - Tagged Title.wav", {
    title: "Tagged Title",
    artist: "Tagged Artist",
  });
  await expectRowCount(page, 1);
  await waitForAppReady(page);
  await connect(page);

  await page.locator(".scrobbling-popup__toggle input").uncheck();
  await expect(page.locator(".player-controls__btn_scrobbling")).not.toHaveClass(/scrobbling-on/u);

  await playRow(page, 0);
  await page.waitForTimeout(1500);
  expect(submits(requests)).toEqual([]);
});
