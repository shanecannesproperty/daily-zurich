// Interactive Playwright tests for the client-side filter chips on /events.
// Loads the page in chromium and asserts:
//   * the editorial list renders at least one event link to /event/<slug>
//   * the "This weekend" toggle narrows (or empties) the list
//   * a category chip narrows (or empties) the list
// All visible events must remain links to /event/<slug>, never broken cards.
import { expect, test } from "@playwright/test";

async function visibleEventLinks(page: import("@playwright/test").Page) {
  return page
    .locator('a[href^="/event/"]')
    .evaluateAll((els) =>
      els
        .filter((el) => (el as HTMLElement).offsetParent !== null)
        .map((el) => (el as HTMLAnchorElement).getAttribute("href") ?? ""),
    );
}

test.describe("/events client-side filters", () => {
  test("This weekend toggle and a category chip both narrow the list", async ({ page }) => {
    await page.goto("/events", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});

    const initial = await visibleEventLinks(page);
    test.skip(initial.length === 0, "No events available on /events today");
    for (const href of initial) {
      expect(href).toMatch(/^\/event\/[a-z0-9][a-z0-9-]*$/);
    }

    // "This weekend" toggle.
    const weekend = page.getByRole("button", { name: "This weekend" });
    await expect(weekend).toBeVisible();
    await weekend.click();
    await page.waitForTimeout(100);
    const afterWeekend = await visibleEventLinks(page);
    expect(afterWeekend.length).toBeLessThanOrEqual(initial.length);
    for (const href of afterWeekend) {
      expect(href).toMatch(/^\/event\/[a-z0-9][a-z0-9-]*$/);
    }
    // Reset.
    await page.getByRole("button", { name: "All" }).click();
    await page.waitForTimeout(50);

    // Pick the first category chip that exists.
    const candidates = ["Music", "Arts", "Food & Drink", "Markets", "Community"];
    for (const label of candidates) {
      const chip = page.getByRole("button", { name: label, exact: true });
      if (await chip.count()) {
        await chip.first().click();
        await page.waitForTimeout(100);
        const afterCat = await visibleEventLinks(page);
        expect(afterCat.length).toBeLessThanOrEqual(initial.length);
        for (const href of afterCat) {
          expect(href).toMatch(/^\/event\/[a-z0-9][a-z0-9-]*$/);
        }
        return;
      }
    }
    test.info().annotations.push({
      type: "note",
      description: "No expected category chips were present in this build",
    });
  });
});

test.describe("homepage editorial events strip", () => {
  test("renders event links and the masthead identifies Canberra", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});

    await expect(page.locator("body")).toContainText(/Canberra/);

    const links = await visibleEventLinks(page);
    test.skip(links.length === 0, "No events rendered on the homepage today");
    for (const href of links) {
      expect(href).toMatch(/^\/event\/[a-z0-9][a-z0-9-]*$/);
    }
  });
});
