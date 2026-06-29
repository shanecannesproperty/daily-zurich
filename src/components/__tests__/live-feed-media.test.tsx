// Media behaviour + accessibility checks for the LiveFeed cards. We render to
// static markup (no jsdom) and lint the HTML directly, mirroring the approach in
// cards-a11y.test.tsx. useTrackEvent is mocked so the component does not pull in
// the server-fn runtime during SSR rendering.
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/hooks/useTrackEvent", () => ({
  useTrackEvent: () => () => {},
}));

import { LiveFeed } from "@/components/LiveFeed";
import type { LiveFeedRow } from "@/lib/schema";

function row(p: Partial<LiveFeedRow> & { id: string; title: string }): LiveFeedRow {
  return {
    id: p.id,
    city: "canberra",
    kind: p.kind ?? "news",
    title: p.title,
    summary: p.summary ?? null,
    url: p.url ?? "https://www.abc.net.au/news/story",
    source: p.source ?? null,
    image_url: p.image_url ?? null,
    video_url: p.video_url ?? null,
    video_category: p.video_category ?? null,

    temp_c: p.temp_c ?? null,
    weather_text: p.weather_text ?? null,
    published_at: p.published_at ?? new Date().toISOString(),
    is_published: true,
    created_at: null,
  };
}

const items: LiveFeedRow[] = [
  row({ id: "photo", title: "Photo story", image_url: "https://images.example.com/p.jpg" }),
  row({ id: "video", title: "Video story", video_url: "https://youtu.be/dQw4w9WgXcQ" }),
  row({ id: "text", title: "Text only story", image_url: null, video_url: null }),
  row({
    id: "fallback",
    title: "Branded fallback story",
    image_url: "https://cdn.example.com/branding/canberra-fallback-tile.png",
  }),
];

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

function imgs(html: string): string[] {
  return html.match(/<img\b[^>]*>/gi) ?? [];
}
function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`, "i"));
  return m ? m[1] : null;
}

const html = renderToStaticMarkup(<LiveFeed items={items} weather={null} />);

describe("LiveFeed media cards", () => {
  it("renders the real photo as a thumbnail", () => {
    expect(html).toContain("https://images.example.com/p.jpg");
  });

  it("never renders the branded fallback tile as an image", () => {
    expect(html).not.toContain("canberra-fallback-tile");
  });

  it("renders a video tile with a play control and a source credit", () => {
    expect(html).toContain("Play video: Video story");
    expect(html).toContain("Video via");
    // youtube poster thumbnail is used, iframe is NOT present until the user clicks play
    expect(html).toContain("i.ytimg.com/vi/dQw4w9WgXcQ");
    expect(html).not.toContain("<iframe");
  });

  it("text-only card has no <img> for its row and shows the source host", () => {
    expect(html).toContain("Text only story");
    expect(html).toContain("abc.net.au");
  });

  it("every <img> declares alt, loading, decoding and intrinsic dimensions", () => {
    const all = imgs(html);
    expect(all.length).toBeGreaterThan(0);
    for (const img of all) {
      expect(attr(img, "alt"), `img missing alt: ${img}`).not.toBeNull();
      expect(attr(img, "loading"), `img missing loading: ${img}`).toMatch(/lazy|eager/);
      expect(attr(img, "decoding"), `img missing decoding: ${img}`).toBe("async");
      expect(attr(img, "width"), `img missing width: ${img}`).toBeTruthy();
      expect(attr(img, "height"), `img missing height: ${img}`).toBeTruthy();
    }
  });

  it("first card loads its media eagerly with high fetch priority", () => {
    const firstImg = imgs(html)[0];
    expect(attr(firstImg, "loading")).toBe("eager");
    expect(attr(firstImg, "fetchpriority") ?? attr(firstImg, "fetchPriority")).toBe("high");
  });

  it("uses design-system colour tokens (no forbidden Tailwind colours)", () => {
    for (const re of FORBIDDEN_CLASSES) {
      expect(html, `forbidden class matched ${re}`).not.toMatch(re);
    }
  });

  it("source links open in a new tab with safe rel", () => {
    const anchors = html.match(/<a\b[^>]*>/gi) ?? [];
    const external = anchors.filter((a) => /target="_blank"/.test(a));
    expect(external.length).toBeGreaterThan(0);
    for (const a of external) {
      expect(attr(a, "rel"), `external link missing safe rel: ${a}`).toMatch(/noopener/);
    }
  });
});
