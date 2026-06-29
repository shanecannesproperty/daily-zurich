// Locks down the homepage layout mode switch:
// - When at least one published article exists, lead with news.
// - When no articles exist, lead with the events diary.
import { describe, it, expect } from "vitest";
import { homepageMode } from "@/lib/homepage-mode";

describe("homepageMode", () => {
  it("returns 'news' when there is at least one article", () => {
    expect(homepageMode({ articles: [{ id: "a1" }] })).toBe("news");
    expect(homepageMode({ articles: [{ id: "a1" }, { id: "a2" }] })).toBe("news");
  });

  it("returns 'events' when there are no articles", () => {
    expect(homepageMode({ articles: [] })).toBe("events");
  });
});
