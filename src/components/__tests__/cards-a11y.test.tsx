// Automated accessibility checks for the event cards rendered on the homepage
// (variant="grid") and the /events page (grouped list). These guard against
// regressions in alt text, link accessible names, ARIA on filter chips, and
// the use of design-system colour tokens (so no hard-coded low-contrast
// utilities sneak in). We render to static markup and lint the HTML directly,
// which keeps the test environment as plain Node (no jsdom dependency).
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { EventsBrowser } from "@/components/EventsBrowser";
import type { EventRow } from "@/lib/schema";

function ev(p: Partial<EventRow> & { id: string; title: string }): EventRow {
  return {
    id: p.id,
    city: "canberra",
    slug: p.id,
    title: p.title,
    category: p.category ?? "Music",
    venue: p.venue ?? "Venue",
    suburb: p.suburb ?? "Civic",
    start_at: p.start_at ?? new Date(Date.now() + 86_400_000).toISOString(),
    end_at: p.end_at ?? null,
    price: p.price ?? null,
    image_url: p.image_url ?? null,
    booking_url: p.booking_url ?? null,
    source_url: p.source_url ?? "https://example.com/x",
    is_published: true,
  } as unknown as EventRow;
}

const fixtures: EventRow[] = [
  ev({
    id: "with-photo",
    title: "Floriade Opening Night",
    image_url: "https://images.example.com/floriade.jpg",
  }),
  ev({ id: "text-only", title: "Quiet Reading at the Library", image_url: null }),
  ev({ id: "blank-url", title: "Whitespace Photo Event", image_url: "   " }),
  ev({
    id: "fallback",
    title: "Branded Tile Event",
    image_url: "https://cdn.example.com/branding/canberra-fallback-tile.png",
  }),
];

// Forbidden Tailwind colour utilities that bypass the design-system tokens
// and have known contrast issues against the paper background.
const FORBIDDEN_CLASSES = [
  /\bbg-white\b/,
  /\btext-white\b/,
  /\bbg-black\b/,
  /\btext-black\b/,
  /\btext-gray-\d{3}\b/,
  /\bbg-gray-\d{3}\b/,
  /\btext-\[#[0-9a-fA-F]{3,8}\]/,
  /\bbg-\[#[0-9a-fA-F]{3,8}\]/,
];

function findAllTags(html: string, tag: string): string[] {
  const re = new RegExp(`<${tag}\\b[^>]*>`, "gi");
  return html.match(re) ?? [];
}

function attr(tagHtml: string, name: string): string | null {
  const m = tagHtml.match(new RegExp(`\\s${name}="([^"]*)"`, "i"));
  return m ? m[1] : null;
}

function innerTextOf(html: string, openTag: string, tagName: string): string {
  // Naive: get the substring from openTag to the matching closing tag.
  const start = html.indexOf(openTag);
  if (start < 0) return "";
  const after = html.slice(start + openTag.length);
  const close = after.indexOf(`</${tagName}>`);
  if (close < 0) return "";
  return after
    .slice(0, close)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function renderHomepageGrid() {
  return renderToStaticMarkup(<EventsBrowser events={fixtures} variant="grid" showFilters />);
}

function renderEventsPage() {
  return renderToStaticMarkup(<EventsBrowser events={fixtures} grouped showFilters />);
}

describe.each([
  ["homepage grid", renderHomepageGrid],
  ["/events grouped list", renderEventsPage],
])("a11y: %s", (_name, render) => {
  const html = render();

  it("every <img> has a non-empty alt attribute", () => {
    const imgs = findAllTags(html, "img");
    expect(imgs.length).toBeGreaterThan(0);
    for (const img of imgs) {
      const alt = attr(img, "alt");
      expect(alt, `img missing alt: ${img}`).not.toBeNull();
      expect(alt!.trim().length, `img has empty alt: ${img}`).toBeGreaterThan(0);
    }
  });

  it("every <img> declares loading + decoding + intrinsic dimensions", () => {
    for (const img of findAllTags(html, "img")) {
      expect(attr(img, "loading"), `img missing loading: ${img}`).toMatch(/lazy|eager/);
      expect(attr(img, "decoding"), `img missing decoding: ${img}`).toBe("async");
      expect(attr(img, "width"), `img missing width: ${img}`).toBeTruthy();
      expect(attr(img, "height"), `img missing height: ${img}`).toBeTruthy();
    }
  });

  it("every <a> has an href and an accessible name (text or aria-label)", () => {
    const anchors = findAllTags(html, "a");
    expect(anchors.length).toBeGreaterThan(0);
    for (const a of anchors) {
      expect(attr(a, "href"), `anchor missing href: ${a}`).toBeTruthy();
      const aria = attr(a, "aria-label");
      const text = innerTextOf(html, a, "a");
      expect(
        (aria && aria.trim().length > 0) || text.length > 0,
        `anchor has no accessible name: ${a}`,
      ).toBe(true);
    }
  });

  it("every <button> has an accessible name", () => {
    for (const btn of findAllTags(html, "button")) {
      const aria = attr(btn, "aria-label");
      const text = innerTextOf(html, btn, "button");
      expect(
        (aria && aria.trim().length > 0) || text.length > 0,
        `button has no accessible name: ${btn}`,
      ).toBe(true);
    }
  });

  it("filter chips expose aria-pressed state", () => {
    const chips = findAllTags(html, "button");
    expect(chips.length).toBeGreaterThan(0);
    for (const c of chips) {
      expect(attr(c, "aria-pressed"), `chip missing aria-pressed: ${c}`).toMatch(/true|false/);
    }
  });

  it("uses design-system colour tokens (no forbidden Tailwind colours)", () => {
    for (const re of FORBIDDEN_CLASSES) {
      expect(html, `forbidden class matched ${re}`).not.toMatch(re);
    }
  });

  it("renders an image only for the real-photo fixture", () => {
    expect(html).toContain("https://images.example.com/floriade.jpg");
    expect(html).not.toContain("canberra-fallback-tile");
  });

  it("image links carry aria-label naming the event", () => {
    const anchors = findAllTags(html, "a").filter((a) =>
      /\/event\/with-photo/.test(attr(a, "href") ?? ""),
    );
    const labelled = anchors.filter((a) => {
      const label = attr(a, "aria-label");
      return label && /Floriade Opening Night/.test(label);
    });
    expect(labelled.length).toBeGreaterThan(0);
  });
});
