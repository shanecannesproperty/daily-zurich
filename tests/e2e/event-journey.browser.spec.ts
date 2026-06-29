// E2E: navigate homepage → /events → event detail.
// Verifies that:
//   * Every visible event card image has a non-empty alt attribute.
//   * Every event image declares width + height (no layout shift on decode).
//   * Cumulative Layout Shift (CLS) measured on /events stays below 0.1
//     (Core Web Vitals "good" threshold).
//   * Clicking an event card lands on /event/<slug> and that page renders
//     a hero image (when one exists) with an alt attribute, or text-only.
import { expect, test } from "@playwright/test";

async function measureCLS(page: import("@playwright/test").Page): Promise<number> {
  return page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let cls = 0;
        const obs = new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as Array<
            PerformanceEntry & { hadRecentInput?: boolean; value?: number }
          >) {
            if (!entry.hadRecentInput && typeof entry.value === "number") {
              cls += entry.value;
            }
          }
        });
        try {
          obs.observe({ type: "layout-shift", buffered: true });
        } catch {
          resolve(0);
          return;
        }
        // Scroll to trigger lazy images, then settle.
        window.scrollTo(0, document.body.scrollHeight);
        setTimeout(() => {
          window.scrollTo(0, 0);
          setTimeout(() => {
            obs.disconnect();
            resolve(cls);
          }, 800);
        }, 1200);
      }),
  );
}

async function assertImagesAccessible(page: import("@playwright/test").Page) {
  const issues = await page.locator('a[href^="/event/"] img').evaluateAll((imgs) =>
    imgs.map((img) => {
      const el = img as HTMLImageElement;
      return {
        src: el.getAttribute("src") ?? "",
        alt: el.getAttribute("alt"),
        width: el.getAttribute("width"),
        height: el.getAttribute("height"),
        loading: el.getAttribute("loading"),
      };
    }),
  );
  for (const i of issues) {
    expect(i.alt, `img missing alt: ${i.src}`).not.toBeNull();
    expect((i.alt ?? "").trim().length, `empty alt: ${i.src}`).toBeGreaterThan(0);
    expect(i.width, `missing width: ${i.src}`).toBeTruthy();
    expect(i.height, `missing height: ${i.src}`).toBeTruthy();
    expect(i.loading, `missing loading: ${i.src}`).toMatch(/lazy|eager/);
  }
}

test.describe("event card journey", () => {
  test("homepage event cards have accessible images", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});
    await assertImagesAccessible(page);
  });

  test("/events cards have accessible images and low CLS", async ({ page }) => {
    await page.goto("/events", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});

    await assertImagesAccessible(page);

    const cls = await measureCLS(page);
    // Core Web Vitals: < 0.1 is "good".
    expect(cls, `Cumulative Layout Shift was ${cls}`).toBeLessThan(0.1);
  });

  test("clicking an /events card navigates to /event/<slug> with hero rendering", async ({
    page,
  }) => {
    await page.goto("/events", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});

    const firstLink = page.locator('a[href^="/event/"]').first();
    const count = await firstLink.count();
    test.skip(count === 0, "No event cards available today");

    const href = await firstLink.getAttribute("href");
    expect(href).toMatch(/^\/event\/[a-z0-9][a-z0-9-]*$/);

    await Promise.all([
      page.waitForURL(new RegExp(`${href!.replace(/[/]/g, "\\/")}$`)),
      firstLink.click(),
    ]);

    // Detail page must render the event title as an <h1>.
    await expect(page.locator("h1")).toBeVisible();

    // Hero figure is optional (text-only events are valid); when present it
    // must carry a non-empty alt and explicit dimensions to avoid CLS.
    const hero = page.locator("figure img").first();
    if (await hero.count()) {
      const alt = await hero.getAttribute("alt");
      expect((alt ?? "").trim().length).toBeGreaterThan(0);
      expect(await hero.getAttribute("width")).toBeTruthy();
      expect(await hero.getAttribute("height")).toBeTruthy();
    }
  });
});
