// Locks down the What's On Canberra cross-link feed parsing. The upstream
// endpoint does not exist yet and its exact shape may shift, so the parser must
// be lenient on field names and ALWAYS degrade to an empty list on anything
// unusable. These tests guard that contract, plus the outbound-links-only
// invariants (every event keeps a real http(s) url, junk is dropped, the list
// is capped).
import { describe, it, expect } from "vitest";
import { normaliseWhatsOnEvent, parseWhatsOnFeed } from "@/lib/whatson.functions";

describe("normaliseWhatsOnEvent", () => {
  it("normalises a well-formed entry", () => {
    const ev = normaliseWhatsOnEvent({
      id: "evt-1",
      title: "Floriade Opening Night",
      date: "2026-09-12T18:00:00+10:00",
      venue: "Commonwealth Park",
      url: "https://whatsoncanberra.com.au/event/floriade-opening",
      thumbnail: "https://whatsoncanberra.com.au/img/floriade.jpg",
    });
    expect(ev).toEqual({
      id: "evt-1",
      title: "Floriade Opening Night",
      date: "2026-09-12T18:00:00+10:00",
      venue: "Commonwealth Park",
      url: "https://whatsoncanberra.com.au/event/floriade-opening",
      thumbnail: "https://whatsoncanberra.com.au/img/floriade.jpg",
    });
  });

  it("accepts alternate field names (name/link/location/image/start)", () => {
    const ev = normaliseWhatsOnEvent({
      name: "Night Markets",
      link: "https://whatsoncanberra.com.au/event/night-markets",
      location: "Civic",
      image: "https://whatsoncanberra.com.au/img/markets.jpg",
      start: "2026-07-05",
    });
    expect(ev?.title).toBe("Night Markets");
    expect(ev?.url).toBe("https://whatsoncanberra.com.au/event/night-markets");
    expect(ev?.venue).toBe("Civic");
    expect(ev?.thumbnail).toBe("https://whatsoncanberra.com.au/img/markets.jpg");
    expect(ev?.date).toBe("2026-07-05");
  });

  it("derives an id from the url when none is given", () => {
    const ev = normaliseWhatsOnEvent({
      title: "No Id Event",
      url: "https://whatsoncanberra.com.au/event/no-id",
    });
    expect(ev?.id).toBe("https://whatsoncanberra.com.au/event/no-id");
  });

  it("drops entries with no usable outbound url", () => {
    expect(normaliseWhatsOnEvent({ title: "No link" })).toBeNull();
    expect(normaliseWhatsOnEvent({ title: "Relative", url: "/event/x" })).toBeNull();
    expect(normaliseWhatsOnEvent({ title: "Bad scheme", url: "javascript:alert(1)" })).toBeNull();
  });

  it("drops entries with no title", () => {
    expect(normaliseWhatsOnEvent({ url: "https://whatsoncanberra.com.au/event/x" })).toBeNull();
    expect(
      normaliseWhatsOnEvent({ title: "   ", url: "https://whatsoncanberra.com.au/event/x" }),
    ).toBeNull();
  });

  it("nulls out non-http thumbnails and missing optional fields", () => {
    const ev = normaliseWhatsOnEvent({
      title: "Minimal",
      url: "https://whatsoncanberra.com.au/event/minimal",
      thumbnail: "data:image/png;base64,xxxx",
    });
    expect(ev?.thumbnail).toBeNull();
    expect(ev?.venue).toBeNull();
    expect(ev?.date).toBeNull();
  });

  it("returns null for non-object input", () => {
    expect(normaliseWhatsOnEvent(null)).toBeNull();
    expect(normaliseWhatsOnEvent("nope")).toBeNull();
    expect(normaliseWhatsOnEvent(42)).toBeNull();
  });
});

describe("parseWhatsOnFeed", () => {
  const good = {
    title: "Event",
    url: "https://whatsoncanberra.com.au/event/a",
  };

  it("parses a bare array", () => {
    const out = parseWhatsOnFeed([good]);
    expect(out).toHaveLength(1);
    expect(out[0].url).toBe("https://whatsoncanberra.com.au/event/a");
  });

  it("parses an object wrapping the array under events/items/data/results", () => {
    expect(parseWhatsOnFeed({ events: [good] })).toHaveLength(1);
    expect(parseWhatsOnFeed({ items: [good] })).toHaveLength(1);
    expect(parseWhatsOnFeed({ data: [good] })).toHaveLength(1);
    expect(parseWhatsOnFeed({ results: [good] })).toHaveLength(1);
  });

  it("filters out unusable entries but keeps the good ones", () => {
    const out = parseWhatsOnFeed([
      good,
      { title: "no url" },
      { url: "https://whatsoncanberra.com.au/event/no-title" },
      null,
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe("Event");
  });

  it("caps the list at 6 events", () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      title: `Event ${i}`,
      url: `https://whatsoncanberra.com.au/event/${i}`,
    }));
    expect(parseWhatsOnFeed(many)).toHaveLength(6);
  });

  it("returns an empty array for empty, null, or malformed payloads", () => {
    expect(parseWhatsOnFeed([])).toEqual([]);
    expect(parseWhatsOnFeed(null)).toEqual([]);
    expect(parseWhatsOnFeed(undefined)).toEqual([]);
    expect(parseWhatsOnFeed("string")).toEqual([]);
    expect(parseWhatsOnFeed({ unexpected: true })).toEqual([]);
    expect(parseWhatsOnFeed({ events: "not an array" })).toEqual([]);
  });
});
