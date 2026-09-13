import { expect, test } from "@playwright/test";
import { dropFile, expectRowCount, waitForAppReady } from "./helpers";
import { mockCatalog, searchAndPlayFirst } from "./radio.helpers";

function hasWave(page: import("@playwright/test").Page): Promise<boolean> {
  return page.evaluate(
    () => document.querySelector(".progress")?.classList.contains("progress_wave") ?? false,
  );
}

test("station takeover clears the stale strip and shows the live badge", async ({ page }) => {
  await mockCatalog(page);
  await page.goto("/");
  await waitForAppReady(page);
  await dropFile(page, "Artist - Local Track.wav");
  await expectRowCount(page, 1);
  await page.locator(".library__row").first().click();
  await expect.poll(() => page.evaluate(() => window.player.isPlaying)).toBe(true);

  // the library track owns the strip: real times, seekable lane
  const now = page.locator(".deck__time_now");
  const total = page.locator(".deck__time_total:not(.progress__live)");
  const seek = page.locator('.slider-input[aria-label="Seek"]');
  await expect(now).toHaveText("0:00");
  await expect(total).toHaveText("0:20");
  await expect(seek).toBeEnabled();
  await expect(page.locator(".progress__live")).toHaveCount(0);

  // the station takes over: no stale digits, no seek - the badge takes the slot
  await searchAndPlayFirst(page);
  await expect.poll(() => page.evaluate(() => window.radio.state())).toBe("playing");
  await expect(now).toHaveText("");
  await expect(total).toHaveCount(0);
  await expect(seek).toBeDisabled();
  // the drawn library wave goes with the takeover (spec: no live position,
  // no stale waveform behind the receiver)
  await expect.poll(() => hasWave(page)).toBe(false);
  const badge = page.locator(".progress__live");
  await expect(badge).toHaveText("Live");
  await expect(badge).not.toHaveClass(/progress__live_dim/u);

  // paused: the badge stays in place, dimmed
  await page.click(".player-controls__btn_play");
  await expect.poll(() => page.evaluate(() => window.radio.state())).toBe("paused");
  await expect(badge).toBeVisible();
  await expect(badge).toHaveClass(/progress__live_dim/u);

  // releasing the station hands the strip back to the loaded library track
  await page.click(".library__mode");
  await page.fill(".library__search", "");
  await page.locator(".library__row").first().click();
  await expect(page.locator(".progress__live")).toHaveCount(0);
  await expect(now).toHaveText("0:00");
  await expect(total).toHaveText("0:20");
});

test("the radio deck replaces the area and the previous tab returns on release", async ({
  page,
}) => {
  await mockCatalog(page);
  await page.goto("/");
  await waitForAppReady(page);
  await dropFile(page, "Artist - Local Track.wav");
  await expectRowCount(page, 1);
  await page.locator(".library__row").first().click();

  // the user picked the vinyl tab before the station engaged
  await page.getByRole("button", { name: "Vinyl" }).click();
  await expect(page.locator("#vinyl-root .vinyl-deck")).toBeVisible();

  await searchAndPlayFirst(page);
  await expect.poll(() => page.evaluate(() => window.radio.state())).toBe("playing");
  await expect(page.locator(".radio-deck")).toBeVisible();
  await expect(page.locator(".area-tabs")).toHaveCount(0);
  await expect(page.locator('.visualizer-controls__style[data-style="lcd"]')).toBeHidden();
  await expect(page.locator(".visualizer-controls__mode")).toBeHidden();
  await expect(page.locator("#vinyl-root .vinyl-deck")).toBeHidden();

  // a library track takes over: the tabs return with vinyl still selected
  await page.click(".library__mode");
  await page.fill(".library__search", "");
  await page.locator(".library__row").first().click();
  await expect(page.locator(".radio-deck")).toBeHidden();
  await expect(page.locator(".area-tabs__tab")).toHaveCount(3);
  await expect(page.getByRole("button", { name: "Vinyl" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#vinyl-root .vinyl-deck")).toBeVisible();
});

test("the deck needle is deterministic and parks on a dead stream", async ({ page }) => {
  await mockCatalog(page);
  await page.goto("/");
  await waitForAppReady(page);

  // the rendered position is polled (the CSS transition animates the needle
  // over 0.6s, so immediate reads race it)
  const needleOffset = () =>
    page.evaluate(() => {
      const needle = document.querySelector<HTMLElement>(".radio-deck__needle-pos")!;
      const scale = document.querySelector<HTMLElement>(".radio-deck__scale")!;
      return needle.getBoundingClientRect().left - scale.getBoundingClientRect().left;
    });

  await searchAndPlayFirst(page);
  await expect.poll(() => page.evaluate(() => window.radio.state())).toBe("playing");
  await page.waitForTimeout(700);
  const leftOne = await needleOffset();

  // the dead station: the needle parks at the scale's left edge, the screen
  // flickers NO SIGNAL, the receiver unlit
  await page.locator(".radio__row").nth(1).click();
  await expect.poll(() => page.evaluate(() => window.radio.state())).toBe("error");
  await expect(page.locator(".radio-deck")).toHaveClass(/radio-deck_error/u);
  await expect(page.locator(".radio-deck__nosignal")).toBeVisible();
  await expect(page.locator(".radio-deck__station")).toHaveCount(0);
  await expect.poll(needleOffset).toBeLessThan(1);

  // re-engaging the first station returns the needle to the same spot
  await page.locator(".radio__row").first().click();
  await expect.poll(() => page.evaluate(() => window.radio.state())).toBe("playing");
  await expect(page.locator(".radio-deck__nosignal")).toHaveCount(0);
  await expect.poll(needleOffset).toBeGreaterThan(2);
  await page.waitForTimeout(700);
  expect(Math.abs((await needleOffset()) - leftOne)).toBeLessThan(1);
});

test("the deck volume knob drives and reflects the output volume", async ({ page }) => {
  await mockCatalog(page);
  await page.goto("/");
  await waitForAppReady(page);
  await searchAndPlayFirst(page);
  await expect(page.locator(".radio-deck")).toBeVisible();

  const knob = page.locator('.radio-deck__knob[role="slider"]');
  const tuning = page.locator(".radio-deck__knob_static");
  await expect(knob).toHaveAttribute("aria-valuenow", "10");
  await expect(tuning).toHaveCount(1);
  await expect(tuning).not.toHaveAttribute("role", "slider");

  // external volume changes are reflected on the knob
  await page.evaluate(() => {
    window.player.volume = 0.7;
  });
  await expect(knob).toHaveAttribute("aria-valuenow", "70");

  // arrow keys step the output volume
  await knob.focus();
  await page.keyboard.press("ArrowUp");
  await expect(knob).toHaveAttribute("aria-valuenow", "75");
  await expect.poll(() => page.evaluate(() => window.player.volume)).toBe(0.75);

  // dragging the knob up a third of the sweep adds about a third of the range
  const box = await knob.boundingBox();
  const cx = box!.x + box!.width / 2;
  const cy = box!.y + box!.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx, cy - 30, { steps: 5 });
  await page.mouse.up();
  await expect(knob).toHaveAttribute("aria-valuenow", "95");
  await expect.poll(() => page.evaluate(() => window.player.volume)).toBe(0.95);
});

test("the transport panel shows the station on air", async ({ page }) => {
  await mockCatalog(page);
  await page.goto("/");
  await waitForAppReady(page);
  await dropFile(page, "Artist - Local Track.wav");
  await expectRowCount(page, 1);
  await page.locator(".library__row").first().click();
  await expect(page.locator(".now-playing__label")).toHaveText("Now playing");

  await searchAndPlayFirst(page);
  await expect.poll(() => page.evaluate(() => window.radio.state())).toBe("playing");
  await expect(page.locator(".now-playing__label")).toHaveText("On air");
  await expect(page.locator(".now-playing__track")).toHaveText("Test Radio One");
  // no mini meter for radio: no analyser behind the stream
  await expect(page.locator(".now-playing__meter")).toHaveCount(0);

  // pausing keeps the panel; the library takeover restores the track variant
  await page.click(".player-controls__btn_play");
  await expect.poll(() => page.evaluate(() => window.radio.state())).toBe("paused");
  await expect(page.locator(".now-playing__track")).toHaveText("Test Radio One");

  await page.click(".library__mode");
  await page.fill(".library__search", "");
  await page.locator(".library__row").first().click();
  await expect(page.locator(".now-playing__label")).toHaveText("Now playing");
  await expect(page.locator(".now-playing__meter")).toHaveCount(1);
});

test("the equalizer popup explains its radio irrelevance", async ({ page }) => {
  await mockCatalog(page);
  await page.goto("/");
  await waitForAppReady(page);
  await dropFile(page, "Artist - Local Track.wav");
  await expectRowCount(page, 1);

  // library playback: no notice
  await page.locator(".library__row").first().click();
  await page.click(".player-controls__btn_equalizer");
  await expect(page.locator(".equalizer-popup__notice")).toHaveCount(0);
  await page.keyboard.press("Escape");

  // radio: the popup carries the notice
  await searchAndPlayFirst(page);
  await page.click(".player-controls__btn_equalizer");
  await expect(page.locator(".equalizer-popup__notice")).toHaveText(
    "Affects library playback only",
  );
});
