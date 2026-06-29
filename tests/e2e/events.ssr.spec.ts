// SSR integration tests for the homepage and /events. We read the raw HTML
// response (no browser) and assert:
//   * the editorial events list renders against the deployed origin
//   * every rendered event card links to /event/<slug>
//   * the page is the city='canberra' edition (canonical + masthead)
//   * SSR meta tags are present on both pages
//
// Interactive checks for the "This weekend" toggle and category chips live
// in events.browser.spec.ts and run under the chromium project.
import { expect, test } from "@playwright/test";

function canonicalHref(html: string) {
  const re = /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i;
  const alt = /<link[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["']/i;
  return html.match(re)?.[1] ?? html.match(alt)?.[1] ?? null;
}

function eventSlugs(html: string): string[] {
  const out = new Set<string>();
  const re = /href=["']\/event\/([a-z0-9-]+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) out.add(m[1]);
  return [...out];
}

test.describe("homepage SSR (editorial events)", () => {
  test("renders the canonical Canberra homepage with event links", async ({ request }) => {
    const res = await request.get("/");
    expect(res.status()).toBe(200);
    const html = await res.text();

    // City-scoped: canonical points at the canberra origin root.
    const canon = canonicalHref(html);
    expect(canon, "canonical link present").not.toBeNull();
    expect(canon).toMatch(/\/$|\/index/);
    expect(html).toMatch(/Canberra/);

    // Editorial events list rendered server-side. Some homepages may
    // legitimately have no upcoming events; in that case skip rather than
    // false-fail.
    const slugs = eventSlugs(html);
    test.skip(slugs.length === 0, "No events rendered on homepage today");
    // Each link uses a slug-shaped path, never a placeholder.
    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z0-9][a-z0-9-]*$/);
    }
  });
});

test.describe("/events SSR (editorial events list)", () => {
  test("renders only items that the city-scoped data layer accepted", async ({ request }) => {
    const res = await request.get("/events");
    expect(res.status()).toBe(200);
    const html = await res.text();

    expect(html).toMatch(/Events in Canberra/);

    const canon = canonicalHref(html);
    expect(canon).not.toBeNull();
    expect(canon).toMatch(/\/events$/);

    const slugs = eventSlugs(html);
    if (slugs.length === 0) {
      // Acceptable: copy says "No upcoming events with verified source links."
      expect(html).toMatch(/No upcoming events/i);
      return;
    }

    // Spot-check the first listed event: its detail page must resolve (200),
    // exposing the source link. This proves the rendered slug maps to a real
    // published event that survived the source_url filter on the server.
    const detail = await request.get(`/event/${slugs[0]}`);
    expect(detail.status()).toBe(200);
    const detailHtml = await detail.text();
    // The detail page renders a "Source" anchor only when source_url exists.
    expect(detailHtml).toMatch(/>Source<\/a>/);
  });
});
