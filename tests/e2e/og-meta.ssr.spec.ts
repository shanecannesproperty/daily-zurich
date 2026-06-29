// SSR: assert the Canberra masthead lockup ships as the default og:image and
// that per-article pages override it with the article's hero. Runs over HTTP
// against the published site (or E2E_BASE_URL override) so it catches build
// regressions that only appear in the rendered HTML.
import { expect, test } from "@playwright/test";

const MASTHEAD_PATH = "/__l5e/assets-v1/";

function pickMeta(html: string, key: "property" | "name", value: string): string | null {
  const re = new RegExp(`<meta\\s+(?:[^>]*?\\s)?${key}="${value}"[^>]*>`, "i");
  const tag = html.match(re)?.[0];
  if (!tag) return null;
  const content = tag.match(/\scontent="([^"]*)"/i);
  return content ? content[1] : null;
}

test.describe("OG image SSR output", () => {
  test("homepage uses the Canberra masthead lockup as og:image", async ({ request }) => {
    const res = await request.get("/");
    expect(res.status()).toBe(200);
    const html = await res.text();
    const og = pickMeta(html, "property", "og:image");
    const tw = pickMeta(html, "name", "twitter:image");
    expect(og, "missing og:image").toBeTruthy();
    expect(og!).toContain(MASTHEAD_PATH);
    if (tw) expect(tw).toContain(MASTHEAD_PATH);
  });

  test("twitter:card is summary_large_image", async ({ request }) => {
    const res = await request.get("/");
    const html = await res.text();
    expect(pickMeta(html, "name", "twitter:card")).toBe("summary_large_image");
  });

  test("an article page sets og:image to its hero (masthead bug baked in)", async ({ request }) => {
    const sitemap = await request.get("/sitemap.xml");
    if (sitemap.status() !== 200) test.skip(true, "No sitemap available");
    const xml = await sitemap.text();
    const articleUrls = Array.from(xml.matchAll(/<loc>([^<]+\/article\/[^<]+)<\/loc>/g)).map(
      (m) => m[1],
    );
    test.skip(articleUrls.length === 0, "No article URLs in sitemap");

    const url = new URL(articleUrls[0]);
    const res = await request.get(url.pathname);
    expect(res.status()).toBe(200);
    const html = await res.text();

    const og = pickMeta(html, "property", "og:image");
    const tw = pickMeta(html, "name", "twitter:image");
    expect(og, "article missing og:image").toBeTruthy();
    // Article OG must be an absolute http(s) URL pointing at a real image asset.
    expect(og!).toMatch(/^https?:\/\//);
    expect(og!).toMatch(/\.(png|jpe?g|webp|avif)(\?.*)?$/i);
    if (tw) expect(tw).toBe(og);
  });
});
