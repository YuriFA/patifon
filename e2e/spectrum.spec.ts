import { expect, type Page, test } from "@playwright/test";
import { dropFile, seedLibrary, waitForAppReady } from "./helpers";

const playBtn = ".player-controls__btn_play";
const canvasSel = "#visualizer";
const lcdBtn = '.visualizer-controls__style[data-style="lcd"]';
const ledBtn = '.visualizer-controls__style[data-style="led"]';

/**
 * Deterministic FFT replacement: a fixed -6 dB/octave tilt (hot bass, cold
 * treble). Real FFT output is not assertable; the tilt makes the mirrored
 * mapping, the falloff and the style windows pixel-stable.
 */
async function stubSpectrum(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const createAnalyser = AudioContext.prototype.createAnalyser;
    AudioContext.prototype.createAnalyser = function (this: AudioContext) {
      const node = createAnalyser.call(this);
      node.getFloatFrequencyData = (array) => {
        const nyquist = this.sampleRate / 2;
        for (let i = 0; i < array.length; i++) {
          const hz = (i * nyquist) / array.length;
          array[i] = -18 - 6 * Math.log2(Math.max(40, hz) / 40);
        }
      };
      return node;
    };
  });
}

/** Derived canvas facts computed in-page: alpha sum, teal extents, column tops. */
function canvasProbe(page: Page) {
  return page.evaluate(() => {
    const el = document.querySelector<HTMLCanvasElement>("#visualizer")!;
    const ctx = el.getContext("2d")!;
    const { data, width, height } = ctx.getImageData(0, 0, el.width, el.height);
    const top: number[] = Array.from({ length: width }, () => -1);
    // lit cells are --primary teal; ghosts, windows and peaks are not
    const isTeal = (i: number) =>
      data[i] < 80 && data[i + 1] > 90 && data[i + 2] > 90 && data[i + 1] - data[i] > 30;
    let alphaSum = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        alphaSum += data[i + 3];
        if (isTeal(i) && top[x] < 0) {
          top[x] = y;
        }
      }
    }
    // leftmost/rightmost column that holds any lit cell
    const firstTeal = top.findIndex((t) => t >= 0);
    const lastTeal = top.findLastIndex((t) => t >= 0);
    const topIn = (from: number, to: number) => {
      let best = -1;
      for (let x = Math.floor(width * from); x <= Math.floor(width * to); x++) {
        if (top[x] >= 0 && (best < 0 || top[x] < best)) {
          best = top[x];
        }
      }
      return best;
    };
    return {
      width,
      height,
      alphaSum,
      firstTeal,
      lastTeal,
      centerTop: topIn(0.48, 0.52),
      leftEdgeTop: topIn(0.08, 0.14),
      rightEdgeTop: topIn(0.86, 0.92),
    };
  });
}

function canvasAlpha(page: Page) {
  return page.evaluate(() => {
    const el = document.querySelector<HTMLCanvasElement>("#visualizer")!;
    const ctx = el.getContext("2d")!;
    const { data } = ctx.getImageData(0, 0, el.width, el.height);
    let sum = 0;
    for (let i = 3; i < data.length; i += 4) {
      sum += data[i];
    }
    return sum;
  });
}

/** One pixel as [r, g, b] from a canvas selected by a CSS selector. */
function pixelAt(page: Page, selector: string, x: number, y: number) {
  return page.evaluate(
    ({ sel, px, py }) => {
      const el = document.querySelector<HTMLCanvasElement>(sel)!;
      const { data } = el.getContext("2d")!.getImageData(px, py, 1, 1);
      return [data[0], data[1], data[2]];
    },
    { sel: selector, px: x, py: y },
  );
}

test("spectrum mirrors bass in the center and fills the width", async ({ page }) => {
  await stubSpectrum(page);
  await seedLibrary(page);
  await page.click(playBtn);

  await expect
    .poll(async () => (await canvasProbe(page)).alphaSum, { timeout: 3000 })
    .toBeGreaterThan(0);
  const probe = await canvasProbe(page);
  // mirrored tilt: the center column towers, both edges sit low and match
  expect(probe.centerTop, JSON.stringify(probe)).toBeLessThan(probe.height * 0.3);
  expect(probe.leftEdgeTop, JSON.stringify(probe)).toBeGreaterThan(probe.height * 0.6);
  expect(probe.rightEdgeTop, JSON.stringify(probe)).toBeGreaterThan(probe.height * 0.6);
  expect(
    Math.abs(probe.leftEdgeTop - probe.rightEdgeTop),
    JSON.stringify(probe),
  ).toBeLessThanOrEqual(16);
  // the column band spans the canvas edge to edge
  expect(probe.firstTeal).toBeLessThan(probe.width * 0.1);
  expect(probe.lastTeal).toBeGreaterThan(probe.width * 0.9);
});

test("the volume knob does not move the visualization", async ({ page }) => {
  await seedLibrary(page);
  await page.click(playBtn);

  // the 440 Hz sine's peak bin, read straight from the real analyser
  const read440 = () =>
    page.evaluate(() => {
      const analyser = window.player.analyser!;
      analyser.updateData();
      const binHz = analyser.analyser.context.sampleRate / 2 / analyser.fFrequencyData.length;
      const bin = Math.round(440 / binHz);
      let peak = -Infinity;
      for (let b = bin - 2; b <= bin + 2; b++) {
        peak = Math.max(peak, analyser.fFrequencyData[b]);
      }
      return peak;
    });

  await page.waitForTimeout(600);
  const loud = await read440();
  await page.evaluate(() => {
    window.player.volume = 0.1;
  });
  await page.waitForTimeout(400);
  const quiet = await read440();
  // pre-volume tap: the dB readout is unchanged by the gain drop
  expect(Math.abs(loud - quiet)).toBeLessThan(2);
});

test("LCD is the default style; switching keeps the canvas box and persists", async ({ page }) => {
  await stubSpectrum(page);
  await seedLibrary(page);
  await page.click(playBtn);
  await expect.poll(async () => (await canvasProbe(page)).alphaSum).toBeGreaterThan(0);

  // fresh profile: the LCD matrix's light seafoam window
  await expect
    .poll(async () => (await pixelAt(page, canvasSel, 5, 5)).join(","))
    .toBe("217,239,236");

  const boxBefore = (await page.locator(canvasSel).boundingBox())!;

  await page.click(ledBtn);
  await expect.poll(() => page.evaluate(() => window.visualizer?.style())).toBe("led");
  // the LED ladder's dark vinyl window (corner sits inside the vignette)
  await expect.poll(async () => (await pixelAt(page, canvasSel, 5, 5))[0]).toBeLessThan(60);

  // style is paint only: the canvas box never moves
  const boxAfter = (await page.locator(canvasSel).boundingBox())!;
  expect(boxAfter).toEqual(boxBefore);

  // the choice survives a reload
  await page.reload();
  await waitForAppReady(page);
  await expect.poll(() => page.evaluate(() => window.visualizer?.style())).toBe("led");
  expect(await page.evaluate(() => localStorage.getItem("spectrum-style"))).toBe("led");
});

test("pause sinks the columns and the canvas ends cleared", async ({ page }) => {
  await stubSpectrum(page);
  await seedLibrary(page);
  await page.click(playBtn);
  await expect.poll(async () => await canvasAlpha(page)).toBeGreaterThan(0);

  await page.click(playBtn);
  // animated falloff, then nothing: no frozen frame
  await expect.poll(async () => await canvasAlpha(page), { timeout: 3000 }).toBe(0);
  await page.waitForTimeout(300);
  expect(await canvasAlpha(page)).toBe(0);
});

test("style buttons latch and belong to the visualizer tab only", async ({ page }) => {
  await page.goto("/");
  await waitForAppReady(page);

  await expect(page.locator(lcdBtn)).toBeVisible();
  await expect(page.locator(ledBtn)).toBeVisible();
  await expect(page.locator(lcdBtn)).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(ledBtn)).toHaveAttribute("aria-pressed", "false");

  await page.click(ledBtn);
  await expect(page.locator(ledBtn)).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(lcdBtn)).toHaveAttribute("aria-pressed", "false");

  for (const tab of ["Lyrics", "Vinyl"]) {
    await page.getByRole("button", { name: tab }).click();
    await expect(page.locator(lcdBtn)).toBeHidden();
    await expect(page.locator(ledBtn)).toBeHidden();
  }
  await page.getByRole("button", { name: "Visualizer" }).click();
  await expect(page.locator(lcdBtn)).toBeVisible();
  await expect(page.locator(ledBtn)).toBeVisible();
});

test("the now-playing meter follows the selected style", async ({ page }) => {
  await stubSpectrum(page);
  await seedLibrary(page);
  await page.click(playBtn);
  const meter = "canvas.now-playing__meter";

  // LCD default: the mini window is the same light glass
  await expect.poll(async () => (await pixelAt(page, meter, 2, 14)).join(",")).toBe("217,239,236");

  await page.click(ledBtn);
  // LED: the mini window is the dark vinyl screen
  await expect.poll(async () => (await pixelAt(page, meter, 2, 14))[0]).toBeLessThan(60);
});

test("without WebGL2 both spectrum styles still render", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...rest: unknown[]
    ) {
      if (type === "webgl2") {
        return null;
      }
      return original.call(this, type, ...rest);
    } as typeof HTMLCanvasElement.prototype.getContext;
  });
  await stubSpectrum(page);
  await page.goto("/");
  await waitForAppReady(page);
  await dropFile(page, "Artist - Track.wav");
  await page.click(playBtn);

  await expect.poll(async () => await canvasAlpha(page)).toBeGreaterThan(0);
  await expect(page.locator(".visualizer-controls__mode")).toBeHidden();
  await expect(page.locator(lcdBtn)).toBeVisible();
});
