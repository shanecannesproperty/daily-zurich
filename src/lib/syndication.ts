// Shared types for syndicated stories (RSS-ingested third-party items).
// Safe to import from both server and client code.

export interface SyndicationSource {
  id: string;
  name: string;
  homepage_url: string | null;
  feed_url: string;
  active: boolean;
  last_fetched_at: string | null;
  last_error: string | null;
  last_fetched_count: number | null;
  last_inserted_count: number | null;
}

export type SyndicatedStatus = "live" | "hidden" | "featured";
export type CommentaryStatus = "none" | "pending" | "published";

export interface SyndicatedStory {
  id: string;
  source_id: string;
  guid: string;
  title: string;
  dek: string | null;
  link: string;
  source_published_at: string | null;
  fetched_at: string;
  status: SyndicatedStatus;
  commentary: string | null;
  commentary_draft: string | null;
  commentary_status: CommentaryStatus;
  commentary_updated_at: string | null;
  reviewed_at: string | null;
  slug: string;
}

export interface SyndicatedStoryWithSource extends SyndicatedStory {
  source: { id: string; name: string; homepage_url: string | null } | null;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function hostOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
