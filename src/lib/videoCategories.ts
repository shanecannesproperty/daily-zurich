// Shared metadata for the city video section.
//
// The category itself is assigned in the database by the dn_video_category()
// rule (stored on live_feed.video_category), so every Daily city site groups
// videos identically. This module is presentation only: it maps the stored slug
// to a display label, a stable running order, a plain-English "why it sits here"
// blurb, and the grouping helpers the /watch page and homepage rail use.

import type { LiveFeedRow } from "@/lib/schema";

export type VideoCategory = "news" | "sport" | "business" | "arts" | "community";

// Fixed running order, like a newsroom bulletin: hard news, sport, money,
// culture, then community life.
export const VIDEO_CATEGORY_ORDER: VideoCategory[] = [
  "news",
  "sport",
  "business",
  "arts",
  "community",
];

export const VIDEO_CATEGORY_LABELS: Record<VideoCategory, string> = {
  news: "News",
  sport: "Sport",
  business: "Business",
  arts: "Arts & Culture",
  community: "Community",
};

// One line explaining what lands in each section, shown on /watch so the sorting
// rule is transparent to the reader.
export const VIDEO_CATEGORY_BLURBS: Record<VideoCategory, string> = {
  news: "Local news, politics and council decisions from the city's own outlets.",
  sport: "Clubs, teams and codes from across the city.",
  business: "Housing, jobs, property and the local economy.",
  arts: "Galleries, museums, theatres, music and festivals.",
  community: "Universities, councils, tourism and everyday local life.",
};

export function isVideoCategory(v: string | null | undefined): v is VideoCategory {
  return v === "news" || v === "sport" || v === "business" || v === "arts" || v === "community";
}

// Display label for a stored category slug. Unknown or empty falls back to "More".
export function videoCategoryLabel(v: string | null | undefined): string {
  return isVideoCategory(v) ? VIDEO_CATEGORY_LABELS[v] : "More";
}

// Normalise a row's stored category to a known section, defaulting anything
// unknown or missing to "community" so a tile is never orphaned.
export function rowCategory(row: LiveFeedRow): VideoCategory {
  return isVideoCategory(row.video_category) ? row.video_category : "community";
}

export interface CategoryGroup {
  category: VideoCategory;
  label: string;
  videos: LiveFeedRow[];
}

// Group videos into the fixed category order, keeping each section's incoming
// (recency) order and dropping empty sections.
export function groupByCategory(videos: LiveFeedRow[]): CategoryGroup[] {
  const buckets = new Map<VideoCategory, LiveFeedRow[]>();
  for (const v of videos) {
    const c = rowCategory(v);
    const arr = buckets.get(c) ?? [];
    arr.push(v);
    buckets.set(c, arr);
  }
  return VIDEO_CATEGORY_ORDER.filter((c) => (buckets.get(c)?.length ?? 0) > 0).map((c) => ({
    category: c,
    label: VIDEO_CATEGORY_LABELS[c],
    videos: buckets.get(c) ?? [],
  }));
}
