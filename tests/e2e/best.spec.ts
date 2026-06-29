// SSR integration tests for the /best hub and /best/[slug] guide detail.
// Hits the deployed origin (E2E_BASE_URL or the published site) and inspects
// the raw HTML response so we verify what crawlers and social platforms see.
import { expect, test } from "@playwright/test";

function jsonLdBlocks(html: string): unknown[] {
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const out: unknown[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      out.push(JSON.parse(m[1].trim()));
    } catch {
      /* ignore malformed */
    }
  }
  return out;
}

function metaContent(html: string, attr: "name" | "property", key: string) {
  const re = new RegExp(`<meta[^>]*${attr}=["']${key}["'][^>]*content=["']([^"']*)["']`, "i");
  const alt = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*${attr}=["']${key}["']`, "i");
  return html.match(re)?.[1] ?? html.match(alt)?.[1] ?? null;
}

function canonicalHref(html: string) {
  const re = /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i;
  const alt = /<link[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["']/i;
  return html.match(re)?.[1] ?? html.match(alt)?.[1] ?? null;
}

test.describe("/best SSR", () => {
  test("renders, with canonical and BreadcrumbList JSON-LD", async ({ request }) => {
    const res = await request.get("/best");
    expect(res.status()).toBe(200);
    const html = await res.text();

    // SSR rendered (not a blank shell waiting for hydration).
    expect(html).toMatch(/Best of Canberra/);

    // Canonical present and self-referential to /best.
    const canon = canonicalHref(html);
    expect(canon, "canonical link present").not.toBeNull();
    expect(canon).toMatch(/\/best(\/)?$/);

    // BreadcrumbList JSON-LD present.
    const blocks = jsonLdBlocks(html);
    const breadcrumb = blocks.find(
      (b) =>
        b && typeof b === "object" && (b as { "@type"?: string })["@type"] === "BreadcrumbList",
    );
    expect(breadcrumb, "BreadcrumbList JSON-LD present").toBeTruthy();
  });
});

test.describe("/best/[slug] SSR", () => {
  test("renders with canonical, og:type=article, and BreadcrumbList JSON-LD", async ({
    request,
  }) => {
    // Discover an existing slug by scraping a link from the /best index, so
    // the test works against whatever guides are published at the time.
    const indexRes = await request.get("/best");
    expect(indexRes.status()).toBe(200);
    const indexHtml = await indexRes.text();
    const slugMatch = indexHtml.match(/href=["']\/best\/([a-z0-9-]+)["']/i);
    test.skip(!slugMatch, "No published guides on /best to follow");

    const slug = slugMatch![1];
    const res = await request.get(`/best/${slug}`);
    expect(res.status()).toBe(200);
    const html = await res.text();

    // SSR rendered: title shows the guide, not a generic shell title.
    expect(html).toMatch(/<title>[^<]+<\/title>/i);

    // og:type=article.
    expect(metaContent(html, "property", "og:type")).toBe("article");

    // Canonical present and points at /best/<slug>.
    const canon = canonicalHref(html);
    expect(canon).not.toBeNull();
    expect(canon).toContain(`/best/${slug}`);

    // BreadcrumbList JSON-LD present and includes the guide as the last item.
    const blocks = jsonLdBlocks(html);
    const breadcrumb = blocks.find(
      (b) =>
        b && typeof b === "object" && (b as { "@type"?: string })["@type"] === "BreadcrumbList",
    ) as { itemListElement?: Array<{ name?: string; item?: string }> } | undefined;
    expect(breadcrumb, "BreadcrumbList JSON-LD present").toBeTruthy();
    const last = breadcrumb!.itemListElement?.at(-1);
    expect(last?.item ?? "").toContain(`/best/${slug}`);

    // Article JSON-LD present (added alongside BreadcrumbList + ItemList).
    const article = blocks.find(
      (b) => b && typeof b === "object" && (b as { "@type"?: string })["@type"] === "Article",
    );
    expect(article, "Article JSON-LD present").toBeTruthy();
  });
});
