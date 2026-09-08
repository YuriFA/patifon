import { expect, test, type Page } from "@playwright/test";
import { dropFile, expectRowCount, waitForAppReady } from "./helpers";

function playingTrackName(page: Page): Promise<string> {
  return page.evaluate(
    () => window.player.playlist.tracks[window.player.currentTrackIndex]?.name ?? "",
  );
}

/** Reads persisted playlists straight from IndexedDB. */
function persistedPlaylists(
  page: Page,
): Promise<Array<{ id: string; name: string; trackIds: string[] }>> {
  return page.evaluate(
    () =>
      new Promise<Array<{ id: string; name: string; trackIds: string[] }>>((resolve) => {
        const request = indexedDB.open("audio-player", 4);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction("playlists", "readonly");
          const getAll = tx.objectStore("playlists").getAll();
          getAll.onsuccess = () => {
            db.close();
            resolve(getAll.result as Array<{ id: string; name: string; trackIds: string[] }>);
          };
        };
      }),
  );
}

/** Creates a named playlist through the playlists view and returns to the library. */
async function createPlaylist(page: Page, name: string): Promise<void> {
  await page.click(".library__mode-playlists");
  await page.click(".playlists__new");
  await page.click(".playlists__rename");
  await page.fill(".playlists__rename-input", name);
  await page.press(".playlists__rename-input", "Enter");
  await expect(page.locator(".playlists__row")).toHaveCount(1);
  await page.click(".library__mode-playlists");
}

/** Adds a library row's track to a playlist via the row popover. */
async function addToPlaylist(page: Page, rowIndex: number, playlistName: string): Promise<void> {
  await page.locator(".library__row").nth(rowIndex).locator(".playlists__add").click();
  await page.locator(".playlists__popover-item", { hasText: playlistName }).click();
}

async function openPlaylist(page: Page, name: string): Promise<void> {
  await page.click(".library__mode-playlists");
  await page.locator(".playlists__row", { hasText: name }).click();
}

test("creating a playlist from rows survives a reload", async ({ page }) => {
  await page.goto("/");
  await waitForAppReady(page);
  await dropFile(page, "Alpha - First.wav");
  await dropFile(page, "Beta - Second.wav");
  await expectRowCount(page, 2);

  await createPlaylist(page, "Mix");
  await addToPlaylist(page, 0, "Mix");
  await addToPlaylist(page, 1, "Mix");

  await openPlaylist(page, "Mix");
  const tracks = page.locator(".playlists__track");
  await expect(tracks).toHaveCount(2);
  await page.reload();
  await waitForAppReady(page);
  await openPlaylist(page, "Mix");
  await expect(page.locator(".playlists__track")).toHaveCount(2);
});

test("reorder then delete: actions persist and removal sticks", async ({ page }) => {
  await page.goto("/");
  await waitForAppReady(page);
  for (const name of ["Alpha - First.wav", "Beta - Second.wav", "Gamma - Third.wav"]) {
    await dropFile(page, name);
  }
  await expectRowCount(page, 3);

  await createPlaylist(page, "Mix");
  await addToPlaylist(page, 0, "Mix");
  await addToPlaylist(page, 1, "Mix");
  await addToPlaylist(page, 2, "Mix");

  await openPlaylist(page, "Mix");
  await page.locator(".playlists__track").nth(0).locator(".playlists__move-down").click();
  const tracks = page.locator(".playlists__track");
  await expect(tracks.nth(0)).toContainText("Beta - Second");
  await expect(tracks.nth(1)).toContainText("Alpha - First");
  await expect(tracks.nth(2)).toContainText("Gamma - Third");

  // removal of a track from the playlist keeps the rest
  await tracks.nth(2).locator(".playlists__remove-track").click();
  await expect(page.locator(".playlists__track")).toHaveCount(2);
  // the removal must reach IndexedDB before the reload, not race it
  await expect.poll(() => persistedPlaylists(page).then((r) => r[0]?.trackIds)).toHaveLength(2);

  await page.reload();
  await waitForAppReady(page);
  await openPlaylist(page, "Mix");
  await expect(page.locator(".playlists__track")).toHaveCount(2);
  await expect(page.locator(".playlists__track").nth(0)).toContainText("Beta - Second");

  // delete the whole playlist
  await page.click(".playlists__back");
  await page.locator(".playlists__row").locator(".playlists__remove").click();
  await expect(page.locator(".playlists__row")).toHaveCount(0);
  await expect.poll(() => persistedPlaylists(page).then((r) => r.length)).toBe(0);

  await page.reload();
  await waitForAppReady(page);
  await page.click(".library__mode-playlists");
  await expect(page.locator(".playlists__row")).toHaveCount(0);
});

test("playing a playlist follows the playlist order, not the library order", async ({ page }) => {
  await page.goto("/");
  await waitForAppReady(page);
  for (const name of ["Alpha - First.wav", "Beta - Second.wav", "Gamma - Third.wav"]) {
    await dropFile(page, name);
  }
  await createPlaylist(page, "Mix");
  await addToPlaylist(page, 2, "Mix");
  await addToPlaylist(page, 0, "Mix");

  await openPlaylist(page, "Mix");
  // rows are Gamma, Alpha - activate the first one
  await page.locator(".playlists__track").nth(0).click();
  await expect.poll(() => playingTrackName(page)).toBe("Third");

  await page.click(".player-controls__btn_next");
  await expect.poll(() => playingTrackName(page)).toBe("First");

  await page.click(".player-controls__btn_prev");
  await expect.poll(() => playingTrackName(page)).toBe("Third");

  // the playing row is highlighted inside the playlist view
  await expect(page.locator(".playlists__track").nth(0)).toHaveClass(/library__row_playing/u);
});

test("play next inserts after the current track and the original order resumes", async ({
  page,
}) => {
  await page.goto("/");
  await waitForAppReady(page);
  for (const name of ["Alpha - First.wav", "Beta - Second.wav", "Gamma - Third.wav"]) {
    await dropFile(page, name);
  }

  await page.locator(".library__row").nth(0).click();
  await expect.poll(() => playingTrackName(page)).toBe("First");

  await page.locator(".library__row").nth(2).locator(".library__row-next").click();
  await expect(page.locator(".library__row").nth(2)).toHaveClass(/library__row_queued/u);

  await page.click(".player-controls__btn_next");
  await expect.poll(() => playingTrackName(page)).toBe("Third");
  await expect(page.locator(".library__row").nth(2)).not.toHaveClass(/library__row_queued/u);

  // the queue region played through: the library order resumes
  await page.click(".player-controls__btn_next");
  await expect.poll(() => playingTrackName(page)).toBe("Second");
});

test("two queued tracks play in queue order after the current one", async ({ page }) => {
  await page.goto("/");
  await waitForAppReady(page);
  for (const name of ["Alpha - First.wav", "Beta - Second.wav", "Gamma - Third.wav"]) {
    await dropFile(page, name);
  }

  await page.locator(".library__row").nth(0).click();
  await expect.poll(() => playingTrackName(page)).toBe("First");

  await page.locator(".library__row").nth(2).locator(".library__row-next").click();
  await page.locator(".library__row").nth(1).locator(".library__row-next").click();
  await expect(page.locator(".library__row").nth(2)).toHaveClass(/library__row_queued/u);
  await expect(page.locator(".library__row").nth(1)).toHaveClass(/library__row_queued/u);

  await page.click(".player-controls__btn_next");
  await expect.poll(() => playingTrackName(page)).toBe("Third");
  await page.click(".player-controls__btn_next");
  await expect.poll(() => playingTrackName(page)).toBe("Second");

  // the queue region played through: playback wraps to the top of the order
  await page.click(".player-controls__btn_next");
  await expect.poll(() => playingTrackName(page)).toBe("First");
});

test("reloading mid-playlist keeps the order and the highlight", async ({ page }) => {
  await page.goto("/");
  await waitForAppReady(page);
  for (const name of ["Alpha - First.wav", "Beta - Second.wav", "Gamma - Third.wav"]) {
    await dropFile(page, name);
  }
  await createPlaylist(page, "Mix");
  await addToPlaylist(page, 2, "Mix");
  await addToPlaylist(page, 0, "Mix");

  await openPlaylist(page, "Mix");
  await page.locator(".playlists__track").nth(0).click();
  await expect.poll(() => playingTrackName(page)).toBe("Third");

  await page.reload();
  await waitForAppReady(page);
  await openPlaylist(page, "Mix");
  // the playlist still exists with its order and plays in its own order
  await page.locator(".playlists__track").nth(1).click();
  await expect.poll(() => playingTrackName(page)).toBe("First");
  await expect(page.locator(".playlists__track").nth(1)).toHaveClass(/library__row_playing/u);
});

test("adding to a playlist never interrupts playback", async ({ page }) => {
  await page.goto("/");
  await waitForAppReady(page);
  await dropFile(page, "Alpha - First.wav");
  await dropFile(page, "Beta - Second.wav");
  await createPlaylist(page, "Mix");

  await page.locator(".library__row").nth(0).click();
  await expect.poll(() => playingTrackName(page)).toBe("First");

  await addToPlaylist(page, 1, "Mix");
  expect(await page.evaluate(() => window.player.isPlaying)).toBe(true);
  await expect.poll(() => playingTrackName(page)).toBe("First");
});

test("playlists drop references to tracks missing from the library", async ({ page }) => {
  await page.goto("/");
  await waitForAppReady(page);
  await dropFile(page, "Alpha - First.wav");
  await expectRowCount(page, 1);

  const trackId = await page.locator(".library__row").nth(0).getAttribute("data-id");
  await page.evaluate((id) => {
    const request = indexedDB.open("audio-player", 4);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction("playlists", "readwrite");
      tx.objectStore("playlists").put({
        id: "seed-1",
        name: "Seeded",

        trackIds: [id, "deleted-track-id"],
        createdAt: Date.now(),
      });
      tx.oncomplete = () => {
        db.close();
      };
    };
  }, trackId);

  await page.reload();
  await waitForAppReady(page);
  await openPlaylist(page, "Seeded");
  await expect(page.locator(".playlists__track")).toHaveCount(1);
  await expect(page.locator(".playlists__track").nth(0)).toContainText("Alpha - First");
});

test("playlists view is exclusive with radio mode", async ({ page }) => {
  await page.goto("/");
  await waitForAppReady(page);
  await dropFile(page, "Alpha - First.wav");

  await page.click(".library__mode");
  await expect(page.locator(".library__add")).toBeHidden();

  await page.click(".library__mode-playlists");
  await expect(page.locator(".library__empty")).toContainText("No playlists yet");
  await expect(page.locator(".library__add")).toBeHidden();
  await expect(page.locator(".playlists__new")).toBeVisible();

  await page.click(".library__mode-playlists");
  await expect(page.locator(".library__add")).toBeVisible();
  await expect(page.locator(".library__row")).toHaveCount(1);
});
