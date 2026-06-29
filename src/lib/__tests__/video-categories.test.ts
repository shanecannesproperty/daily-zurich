// Covers the presentation-side grouping for the city video section. The category
// itself is assigned in the database (live_feed.video_category); these helpers
// only sort the rows into the fixed running order and default unknowns safely.
import { describe, expect, it } from "vitest";
import type { LiveFeedRow } from "@/lib/schema";
import {
  groupByCategory,
  rowCategory,
  videoCategoryLabel,
  VIDEO_CATEGORY_ORDER,
} from "@/lib/videoCategories";

function vid(id: string, category: string | null): LiveFeedRow {
  return {
    id,
    city: "canberra",
    kind: "video",
    title: `video ${id}`,
    summary: null,
    url: null,
    video_url: `https://www.youtube.com/watch?v=${id.padEnd(11, "0")}`,
    video_category: category,
    source: "Test Channel",
    image_url: null,
    temp_c: null,
    weather_text: null,
    published_at: "2026-06-25T00:00:00.000Z",
    is_published: true,
    created_at: null,
  };
}

describe("rowCategory", () => {
  it("passes through known categories", () => {
    expect(rowCategory(vid("a", "sport"))).toBe("sport");
    expect(rowCategory(vid("b", "news"))).toBe("news");
  });

  it("defaults unknown or missing categories to community", () => {
    expect(rowCategory(vid("c", null))).toBe("community");
    expect(rowCategory(vid("d", "weird"))).toBe("community");
  });
});

describe("videoCategoryLabel", () => {
  it("maps slugs to display labels and falls back to More", () => {
    expect(videoCategoryLabel("arts")).toBe("Arts & Culture");
    expect(videoCategoryLabel(null)).toBe("More");
  });
});

describe("groupByCategory", () => {
  it("returns sections in the fixed running order and drops empty ones", () => {
    const rows = [vid("1", "community"), vid("2", "sport"), vid("3", "news")];
    const groups = groupByCategory(rows);
    expect(groups.map((g) => g.category)).toEqual(["news", "sport", "community"]);
    // No business or arts videos present, so those sections are absent.
    expect(groups.find((g) => g.category === "business")).toBeUndefined();
  });

  it("keeps each section's incoming recency order", () => {
    const rows = [vid("1", "sport"), vid("2", "sport"), vid("3", "sport")];
    const sport = groupByCategory(rows).find((g) => g.category === "sport");
    expect(sport?.videos.map((v) => v.id)).toEqual(["1", "2", "3"]);
  });

  it("order constant lists all five sections", () => {
    expect(VIDEO_CATEGORY_ORDER).toEqual(["news", "sport", "business", "arts", "community"]);
  });
});
