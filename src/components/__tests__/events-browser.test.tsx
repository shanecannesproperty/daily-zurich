// Integration tests: any event the app renders via <EventsBrowser /> MUST
// have a non-empty source_url. Covers the editorial list, the homepage grid
// variant, and the /events grouped layout (date headings).
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { EventsBrowser } from "@/components/EventsBrowser";
import type { EventRow } from "@/lib/schema";

function ev(partial: Partial<EventRow> & { id: string; title: string }): EventRow {
  return {
    id: partial.id,
    city: "canberra",
    slug: partial.id,
    title: partial.title,
    category: partial.category ?? null,
    venue: partial.venue ?? null,
    suburb: partial.suburb ?? null,
    start_at: partial.start_at ?? new Date(Date.now() + 86_400_000).toISOString(),
    end_at: partial.end_at ?? null,
    price: partial.price ?? null,
    image_url: partial.image_url ?? null,
    booking_url: partial.booking_url ?? null,
    source_url: partial.source_url ?? null,
    is_published: true,
  } as unknown as EventRow;
}

const fixtures: EventRow[] = [
  ev({ id: "ok-1", title: "Sourced Show One", source_url: "https://example.com/1" }),
  ev({ id: "bad-1", title: "Unsourced Mystery Event", source_url: null }),
  ev({ id: "ok-2", title: "Sourced Show Two", source_url: "https://example.com/2" }),
  ev({ id: "bad-2", title: "Blank Source Event", source_url: "   " }),
];

const variants = ["list", "grid"] as const;

for (const variant of variants) {
  describe(`EventsBrowser variant=${variant} drops events without source_url`, () => {
    it("never renders an unsourced event title", () => {
      const html = renderToStaticMarkup(
        <EventsBrowser events={fixtures} variant={variant} showFilters={false} />,
      );
      expect(html).toContain("Sourced Show One");
      expect(html).toContain("Sourced Show Two");
      expect(html).not.toContain("Unsourced Mystery Event");
      expect(html).not.toContain("Blank Source Event");
    });
  });
}

describe("EventsBrowser grouped (=/events page) drops events without source_url", () => {
  it("never renders an unsourced event title under any date heading", () => {
    const html = renderToStaticMarkup(
      <EventsBrowser events={fixtures} grouped showFilters={false} />,
    );
    expect(html).toContain("Sourced Show One");
    expect(html).toContain("Sourced Show Two");
    expect(html).not.toContain("Unsourced Mystery Event");
    expect(html).not.toContain("Blank Source Event");
  });

  it("when every event is unsourced, renders the empty-state copy", () => {
    const onlyBad = fixtures.filter((e) => !e.source_url || !e.source_url.trim());
    const html = renderToStaticMarkup(
      <EventsBrowser events={onlyBad} grouped showFilters={false} />,
    );
    expect(html).not.toContain("Unsourced Mystery Event");
    expect(html).not.toContain("Blank Source Event");
    expect(html).toMatch(/No events match/i);
  });
});
