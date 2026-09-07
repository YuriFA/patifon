import { expect, test } from "@playwright/test";
import { dropFile, expectRowCount } from "./helpers";

async function waitServiceWorkerReady(page: import("@playwright/test").Page): Promise<void> {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
}

test("manifest and icon are served same-origin and linked", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const manifestHref = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')?.href;
    if (!manifestHref) {
      return { ok: false as const, reason: "no manifest link" };
    }
    const manifest = await (await fetch(manifestHref)).json();
    const iconHref = new URL(manifest.icons[0].src, location.href).href;
    const [manifestRes, iconRes] = await Promise.all([fetch(manifestHref), fetch(iconHref)]);
    return {
      ok: manifestRes.ok && iconRes.ok,
      sameOrigin: [manifestHref, iconHref].every(
        (href) => new URL(href).origin === location.origin,
      ),
      display: manifest.display,
      name: manifest.name,
      iconCount: manifest.icons.length,
    };
  });
  expect(result).toMatchObject({ ok: true, sameOrigin: true, display: "standalone", iconCount: 2 });
  expect(result.name).toBe("Audio Player");
});

test("offline reload boots the interface", async ({ page }) => {
  await page.goto("/");
  await waitServiceWorkerReady(page);

  await page.context().setOffline(true);
  await page.reload();
  await expect(page.locator(".library__search")).toBeVisible();
  await expect(page.locator(".library__empty")).toBeVisible();
});

test("previously imported track plays while offline", async ({ page }) => {
  await page.goto("/");
  await waitServiceWorkerReady(page);
  await dropFile(page, "Artist - Alpha.wav");
  await expectRowCount(page, 1);

  await page.context().setOffline(true);
  await page.reload();
  await expectRowCount(page, 1);

  await page.locator(".library__row").first().click();
  await expect(page.locator(".library__row").first()).toHaveClass(/library__row_playing/u);
});

test("persistent storage is requested at startup", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as Record<string, unknown>).persistRequested = false;
    navigator.storage.persist = () => {
      (window as unknown as Record<string, unknown>).persistRequested = true;
      return Promise.resolve(true);
    };
  });
  await page.goto("/");
  await expect
    .poll(() => page.evaluate(() => (window as unknown as Record<string, unknown>).persistRequested))
    .toBe(true);
});
