import { expect, test } from "@playwright/test";
import { dropFile, waitForAppReady } from "./helpers";

// Mobile shell (mobile-shell change): the approved draft's single column
// at a phone viewport - sticky header, one scrolling content column,
// pinned stacked deck, bottom-sheet popups, 44px touch targets.
test.use({ viewport: { width: 390, height: 844 } });

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await waitForAppReady(page);
});

test("reflows into a single column without horizontal overflow", async ({ page }) => {
  const layout = await page.evaluate(() => {
    const shell = document.querySelector<HTMLElement>(".audio_player")!;
    const style = getComputedStyle(shell);
    return {
      display: style.display,
      direction: style.flexDirection,
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      shellOverflow: shell.scrollWidth > shell.clientWidth,
    };
  });
  expect(layout.display).toBe("flex");
  expect(layout.direction).toBe("column");
  expect(layout.pageOverflow).toBe(false);
  expect(layout.shellOverflow).toBe(false);
});

test("pins the header and the deck while the column scrolls", async ({ page }) => {
  for (let i = 0; i < 6; i += 1) {
    await dropFile(page, `Artist ${i} - Track ${i}.wav`);
  }
  const pinned = await page.evaluate(() => {
    const shell = document.querySelector<HTMLElement>(".audio_player")!;
    shell.scrollTop = 120;
    const header = document.querySelector<HTMLElement>(".library__header")!.getBoundingClientRect();
    const deck = document.querySelector<HTMLElement>(".deck")!.getBoundingClientRect();
    return {
      scrolled: shell.scrollTop,
      headerTop: header.top,
      deckBottom: deck.bottom,
      height: window.innerHeight,
    };
  });
  expect(pinned.scrolled).toBeGreaterThan(0);
  expect(pinned.headerTop).toBe(0);
  expect(pinned.height - pinned.deckBottom).toBeLessThanOrEqual(1);
});

test("stacks the deck rows instead of the desktop single row", async ({ page }) => {
  await dropFile(page, "Artist - Track.wav");
  // start playback the way a user does - from the row (transport-play with
  // no engaged source is a known pre-existing gap, out of scope here)
  await page.click(".library__row");
  await expect(page.locator(".now-playing")).toBeVisible();

  const rows = await page.evaluate(() => {
    const readout = document
      .querySelector<HTMLElement>("#nowplaying-root")!
      .getBoundingClientRect();
    const volume = document.querySelector<HTMLElement>("#volume-root")!.getBoundingClientRect();
    const transport = document
      .querySelector<HTMLElement>("#transport-root")!
      .getBoundingClientRect();
    const panels = document.querySelector<HTMLElement>("#equalizer-root")!.getBoundingClientRect();
    const deck = document.querySelector<HTMLElement>(".deck")!.getBoundingClientRect();
    return { readout, volume, transport, panels, deck };
  });
  // readout + volume share the first row, transport + panels the second
  expect(rows.volume.top).toBeGreaterThan(rows.readout.top);
  expect(rows.volume.top).toBeLessThan(rows.readout.bottom);
  expect(rows.transport.top).toBeGreaterThan(rows.readout.bottom);
  expect(rows.panels.top).toBeCloseTo(rows.transport.top, 0);
  expect(rows.panels.right).toBeLessThanOrEqual(rows.deck.right);
});

test("scales the turntable to the column width", async ({ page }) => {
  await page.getByRole("button", { name: "Vinyl", exact: true }).click();
  const width = await page.evaluate(
    () =>
      document.querySelector<HTMLElement>(".vinyl-deck__platter-wrap")!.getBoundingClientRect()
        .width,
  );
  // the draft's mobile platter (~240px at a 390px viewport)
  expect(width).toBeGreaterThan(190);
  expect(width).toBeLessThan(260);
});

test("docks the equalizer popup as a bottom sheet", async ({ page }) => {
  await page.click(".player-controls__btn_equalizer");
  const popup = page.locator(".equalizer-popup");
  await expect(popup).toBeVisible();
  await expect(page.locator(".player-controls__btn_equalizer")).toHaveAttribute(
    "aria-expanded",
    "true",
  );

  const docked = await popup.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return {
      bottom: window.innerHeight - rect.bottom,
      width: rect.width,
      position: style.position,
    };
  });
  expect(docked.position).toBe("fixed");
  expect(docked.bottom).toBeLessThanOrEqual(1);
  expect(docked.width).toBe(390);

  await page.keyboard.press("Escape");
  await expect(page.locator(".player-controls__btn_equalizer")).toHaveAttribute(
    "aria-expanded",
    "false",
  );
});

test("docks the scrobbling popup as a bottom sheet and closes on outside tap", async ({ page }) => {
  await page.click(".player-controls__btn_scrobbling");
  const popup = page.locator(".scrobbling-popup");
  await expect(popup).toBeVisible();

  const docked = await popup.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return {
      bottom: window.innerHeight - rect.bottom,
      width: rect.width,
      position: style.position,
    };
  });
  expect(docked.position).toBe("fixed");
  expect(docked.bottom).toBeLessThanOrEqual(1);
  expect(docked.width).toBe(390);

  // a tap on the content column (outside the sheet and its button) closes
  await page.mouse.click(195, 300);
  await expect(page.locator(".player-controls__btn_scrobbling")).toHaveAttribute(
    "aria-expanded",
    "false",
  );
});

test("gives the chrome and deck controls 44px touch targets", async ({ page }) => {
  const sizes = await page.evaluate(() =>
    [...document.querySelectorAll(".sidebar__mode, .player-controls__btn, .volume__btn")].map(
      (el) => {
        const rect = el.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      },
    ),
  );
  expect(sizes.length).toBeGreaterThanOrEqual(6);
  for (const size of sizes) {
    expect(size.width).toBeGreaterThanOrEqual(44);
    expect(size.height).toBeGreaterThanOrEqual(44);
  }
});

test("matches the visualizer canvas buffer to its CSS box when the tab opens", async ({ page }) => {
  await page.getByRole("button", { name: "Vinyl", exact: true }).click();
  await page.getByRole("button", { name: "Visualizer", exact: true }).click();
  const canvas = await page.evaluate(() => {
    const el = document.querySelector<HTMLCanvasElement>("#visualizer")!;
    return { buffer: el.width, client: el.clientWidth };
  });
  expect(canvas.client).toBeGreaterThan(300);
  expect(canvas.buffer).toBe(canvas.client);
});

test.describe("desktop shell unchanged", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test("keeps the two-column grid and the 380px sidebar", async ({ page }) => {
    await page.goto("/");
    await waitForAppReady(page);
    const grid = await page.evaluate(() => {
      const shell = document.querySelector<HTMLElement>(".audio_player")!;
      const sidebar = document.querySelector<HTMLElement>(".playlist")!;
      return {
        display: getComputedStyle(shell).display,
        columns: getComputedStyle(shell).gridTemplateColumns,
        sidebarWidth: Math.round(sidebar.getBoundingClientRect().width),
      };
    });
    expect(grid.display).toBe("grid");
    expect(grid.columns.startsWith("380px")).toBe(true);
    expect(grid.sidebarWidth).toBe(380);
  });
});
