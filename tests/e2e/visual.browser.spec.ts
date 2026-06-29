// Visual regression: snapshots of the editorial layout on the homepage event
// grid and the /events grouped list. Run with --update-snapshots to refresh
// after an intentional layout change.
import { expect, test } from "@playwright/test";

test.describe("visual regression: editorial layout", () => {
  test.use({ viewport: { width: 1280, height: 1800 } });

  test("homepage above the fold", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});
    // Wait for fonts and any lazy hero to settle.
    await page.evaluate(
      () => (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready,
    );
    await page.waitForTimeout(400);
    await expect(page).toHaveScreenshot("homepage-above-fold.png", {
      fullPage: false,
      maxDiffPixelRatio: 0.02,
      animations: "disabled",
    });
  });

  test("/events grouped list", async ({ page }) => {
    await page.goto("/events", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.evaluate(
      () => (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready,
    );
    await page.waitForTimeout(400);
    await expect(page).toHaveScreenshot("events-page.png", {
      fullPage: false,
      maxDiffPixelRatio: 0.02,
      animations: "disabled",
    });
  });
});
