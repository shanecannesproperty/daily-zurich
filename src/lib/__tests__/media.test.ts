// Unit tests for the source-media helpers: image validation and YouTube/Vimeo
// URL parsing into a safe, no-autoplay embed shape.
import { describe, expect, it } from "vitest";
import { hostOf, isRealImage, isVideoUrl, parseVideoUrl } from "@/lib/media";

describe("isRealImage", () => {
  it("accepts real http(s) photo URLs", () => {
    expect(isRealImage("https://images.example.com/a.jpg")).toBe(true);
    expect(isRealImage("http://cdn.example.com/b.png")).toBe(true);
  });

  it("rejects null, blank, relative and branded-fallback URLs", () => {
    expect(isRealImage(null)).toBe(false);
    expect(isRealImage(undefined)).toBe(false);
    expect(isRealImage("   ")).toBe(false);
    expect(isRealImage("/local/logo.svg")).toBe(false);
    expect(isRealImage("https://cdn.example.com/branding/canberra-fallback-tile.png")).toBe(false);
  });
});

describe("parseVideoUrl: YouTube", () => {
  const cases: Array<[string, string]> = [
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=30s", "dQw4w9WgXcQ"],
  ];
  it.each(cases)("parses %s", (url, id) => {
    const v = parseVideoUrl(url);
    expect(v).not.toBeNull();
    expect(v!.provider).toBe("youtube");
    expect(v!.id).toBe(id);
    expect(v!.embedUrl).toContain("youtube-nocookie.com/embed/");
    expect(v!.embedUrl).not.toContain("autoplay=1"); // never autoplay by default
    expect(v!.watchUrl).toContain(id);
    expect(v!.thumbnailUrl).toContain(id);
  });
});

describe("parseVideoUrl: Vimeo", () => {
  it("parses vimeo.com and player.vimeo.com", () => {
    expect(parseVideoUrl("https://vimeo.com/123456789")?.id).toBe("123456789");
    expect(parseVideoUrl("https://player.vimeo.com/video/123456789")?.id).toBe("123456789");
    const v = parseVideoUrl("https://vimeo.com/123456789");
    expect(v!.embedUrl).toContain("player.vimeo.com/video/123456789");
    expect(v!.embedUrl).not.toContain("autoplay=1");
    expect(v!.thumbnailUrl).toBeNull();
  });
});

describe("parseVideoUrl: rejects non-video and malformed", () => {
  it("returns null for unrelated, relative or empty URLs", () => {
    expect(parseVideoUrl(null)).toBeNull();
    expect(parseVideoUrl("")).toBeNull();
    expect(parseVideoUrl("https://abc.net.au/news/story")).toBeNull();
    expect(parseVideoUrl("not a url")).toBeNull();
    expect(parseVideoUrl("/relative/path")).toBeNull();
  });
  it("isVideoUrl mirrors parseVideoUrl", () => {
    expect(isVideoUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(true);
    expect(isVideoUrl("https://abc.net.au/news")).toBe(false);
  });
});

describe("hostOf", () => {
  it("strips www and returns the hostname", () => {
    expect(hostOf("https://www.abc.net.au/news")).toBe("abc.net.au");
    expect(hostOf("https://canberratimes.com.au/x")).toBe("canberratimes.com.au");
    expect(hostOf(null)).toBeNull();
    expect(hostOf("garbage")).toBeNull();
  });
});
