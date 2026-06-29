// SSR regression: the SocialProofBanner must not render legacy "events" or
// "articles" count badges (the stale 9 events / 30 articles numbers). The
// banner is on the home route; we assert against the rendered HTML so the
// guard fails the build if those strings ever reappear server-side.
import { expect, test } from "@playwright/test";

test.describe("SocialProofBanner has no events/articles counts", () => {
  test("home page HTML never mentions events/articles counts", async ({ request }) => {
    const res = await request.get("/");
    expect(res.ok()).toBe(true);
    const html = await res.text();

    // Strip <script>/<style> bodies so JSON-LD or analytics payloads don't
    // give a false positive for the visible-text assertion.
    const visible = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "");

    expect(visible).not.toMatch(/events this week/i);
    expect(visible).not.toMatch(/articles published/i);

    // Stale numbers that previously rendered as count badges. We scope to the
    // SocialProofBanner section so unrelated "9" or "30" elsewhere on the page
    // (e.g. dates) don't trip the guard.
    const bannerMatch = visible.match(
      /<section[^>]*data-component=["']social-proof-banner["'][\s\S]*?<\/section>/i,
    );
    if (bannerMatch) {
      expect(bannerMatch[0]).not.toMatch(/\b9\b/);
      expect(bannerMatch[0]).not.toMatch(/\b30\b/);
    }
  });
});
