// Regression test: the SocialProofBanner must never display events-this-week
// or articles-published counters again. Product decision; see the comment at
// the top of SocialProofBanner.tsx. If a future change re-introduces those
// stats — in the banner, the data layer return shape, or anywhere else — this
// test fails and blocks the merge.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SocialProofBanner } from "@/components/SocialProofBanner";

const __dirname = dirname(fileURLToPath(import.meta.url));

function render(stats: Record<string, number>) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(["public-stats"], stats);
  return renderToStaticMarkup(
    <QueryClientProvider client={qc}>
      <SocialProofBanner />
    </QueryClientProvider>,
  );
}

describe("SocialProofBanner — no event/article counts", () => {
  it("never renders 'events this week' even if upstream returns the count", () => {
    const html = render({ subscriberCount: 5000, eventsThisWeek: 9, articlesPublished: 30 });
    expect(html.toLowerCase()).not.toContain("events this week");
    expect(html.toLowerCase()).not.toContain("articles published");
  });

  it("never displays the stale 9 / 30 badge numbers", () => {
    const html = render({ subscriberCount: 5000, eventsThisWeek: 9, articlesPublished: 30 });
    expect(html).not.toMatch(/>\s*9\s*</);
    expect(html).not.toMatch(/>\s*30\s*</);
  });

  it("renders nothing when there is no subscriber count", () => {
    expect(render({ subscriberCount: 0, eventsThisWeek: 9, articlesPublished: 30 })).toBe("");
  });

  it("renders the subscriber stat only", () => {
    const html = render({ subscriberCount: 5000 });
    expect(html).toContain("subscribers");
    expect(html).toContain("5.0k+");
  });
});

describe("source guard — event/article counters cannot be wired into the banner", () => {
  const src = readFileSync(resolve(__dirname, "../SocialProofBanner.tsx"), "utf8");
  it("does not reference eventsThisWeek", () => {
    expect(src).not.toMatch(/eventsThisWeek/);
  });
  it("does not reference articlesPublished", () => {
    expect(src).not.toMatch(/articlesPublished/);
  });
  it("does not render an 'events' or 'articles' label", () => {
    expect(src).not.toMatch(/events this week/i);
    expect(src).not.toMatch(/articles published/i);
  });
});
