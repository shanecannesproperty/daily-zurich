// Guards the homepage "What's on this weekend" cross-link module:
// - renders NOTHING when there are no events (no empty box, no error)
// - every event is an OUTBOUND link to What's On Canberra (no re-hosted content)
// - external links are safe (target=_blank, rel includes noopener + nofollow)
// - the heading and the "see all" CTA are present
// We render to static markup and assert on the HTML, keeping the test
// environment plain Node (no jsdom), matching cards-a11y.test.tsx.
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { WhatsOnWeekend } from "@/components/WhatsOnWeekend";
import type { WhatsOnEvent } from "@/lib/whatson.functions";
import { cityName } from "@/lib/city";

function ev(p: Partial<WhatsOnEvent> & { id: string; title: string; url: string }): WhatsOnEvent {
  return {
    id: p.id,
    title: p.title,
    url: p.url,
    date: p.date ?? null,
    venue: p.venue ?? null,
    thumbnail: p.thumbnail ?? null,
  };
}

const fixtures: WhatsOnEvent[] = [
  ev({
    id: "1",
    title: "Floriade Opening Night",
    url: "https://whatsoncanberra.com.au/event/floriade",
    date: "2026-09-12T18:00:00+10:00",
    venue: "Commonwealth Park",
    thumbnail: "https://whatsoncanberra.com.au/img/floriade.jpg",
  }),
  ev({
    id: "2",
    title: "Night Noodle Markets",
    url: "https://whatsoncanberra.com.au/event/noodles",
    venue: "Civic",
  }),
];

describe("WhatsOnWeekend", () => {
  it("renders nothing when there are no events", () => {
    expect(renderToStaticMarkup(<WhatsOnWeekend events={[]} />)).toBe("");
  });

  it("renders the heading and the see-all CTA", () => {
    const html = renderToStaticMarkup(<WhatsOnWeekend events={fixtures} />);
    expect(html).toContain(`What&#x27;s on in ${cityName()} this weekend`);
    expect(html).toContain("See all events on What&#x27;s On Canberra");
    expect(html).toContain('href="https://whatsoncanberra.com.au"');
  });

  it("deep-links each event out to its What's On Canberra page", () => {
    const html = renderToStaticMarkup(<WhatsOnWeekend events={fixtures} />);
    expect(html).toContain('href="https://whatsoncanberra.com.au/event/floriade"');
    expect(html).toContain('href="https://whatsoncanberra.com.au/event/noodles"');
    expect(html).toContain("Floriade Opening Night");
    expect(html).toContain("Night Noodle Markets");
  });

  it("opens external links safely (noopener + nofollow, new tab)", () => {
    const html = renderToStaticMarkup(<WhatsOnWeekend events={fixtures} />);
    expect(html).toContain('target="_blank"');
    expect(html).toContain("noopener");
    expect(html).toContain("nofollow");
  });

  it("renders a thumbnail only when one is present", () => {
    const html = renderToStaticMarkup(<WhatsOnWeekend events={fixtures} />);
    expect(html).toContain('src="https://whatsoncanberra.com.au/img/floriade.jpg"');
    // The second fixture has no thumbnail; exactly one <img> should appear.
    expect(html.match(/<img/g) ?? []).toHaveLength(1);
  });
});
