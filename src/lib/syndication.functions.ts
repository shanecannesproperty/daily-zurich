// Public read access for syndicated stories. Uses the publishable-key server
// client (anon role) so RLS hides 'hidden' rows automatically.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { SyndicatedStoryWithSource } from "@/lib/syndication";

function publicClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

const SELECT =
  "id,source_id,guid,title,dek,link,source_published_at,fetched_at,status,commentary,commentary_draft,commentary_status,commentary_updated_at,reviewed_at,slug,source:syndication_sources(id,name,homepage_url)";

export const listSyndicatedStories = createServerFn({ method: "GET" })
  .inputValidator((input: { limit?: number; offset?: number } | undefined) =>
    z
      .object({
        limit: z.number().int().min(1).max(100).optional(),
        offset: z.number().int().min(0).max(2000).optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    try {
      const sb = publicClient();
      const limit = data.limit ?? 40;
      const offset = data.offset ?? 0;
      const { data: rows, error } = await sb
        .from("syndicated_stories")
        .select(SELECT)
        .order("source_published_at", { ascending: false, nullsFirst: false })
        .order("fetched_at", { ascending: false })
        .range(offset, offset + limit - 1);
      if (error) return { items: [] as SyndicatedStoryWithSource[], error: error.message };
      return { items: (rows ?? []) as unknown as SyndicatedStoryWithSource[], error: null };
    } catch (err) {
      console.error("listSyndicatedStories failed, returning fallback:", err);
      return { items: [] as SyndicatedStoryWithSource[], error: "feed unavailable" };
    }
  });

// Featured stories only (status='featured'), recency-ordered. Drives the
// homepage "Top stories" auto-rotation.
export const listFeaturedSyndicated = createServerFn({ method: "GET" })
  .inputValidator((input: { limit?: number } | undefined) =>
    z.object({ limit: z.number().int().min(1).max(20).optional() }).parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    try {
      const sb = publicClient();
      const { data: rows, error } = await sb
        .from("syndicated_stories")
        .select(SELECT)
        .eq("status", "featured")
        .order("source_published_at", { ascending: false, nullsFirst: false })
        .order("fetched_at", { ascending: false })
        .limit(data.limit ?? 8);
      if (error) return { items: [] as SyndicatedStoryWithSource[], error: error.message };
      return { items: (rows ?? []) as unknown as SyndicatedStoryWithSource[], error: null };
    } catch (err) {
      console.error("listFeaturedSyndicated failed, returning fallback:", err);
      return { items: [] as SyndicatedStoryWithSource[], error: "feed unavailable" };
    }
  });

export const getSyndicatedStoryBySlug = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => z.object({ slug: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    try {
      const sb = publicClient();
      const { data: row, error } = await sb
        .from("syndicated_stories")
        .select(SELECT)
        .eq("slug", data.slug)
        .maybeSingle();
      if (error || !row) return { story: null as SyndicatedStoryWithSource | null };
      return { story: row as unknown as SyndicatedStoryWithSource };
    } catch (err) {
      console.error("getSyndicatedStoryBySlug failed, returning fallback:", err);
      return { story: null as SyndicatedStoryWithSource | null };
    }
  });

// Keyword-filtered syndicated stories for vertical hub pages (e.g. /wellness,
// /longevity). Stories come from the Lovable-managed syndicated_stories table
// and are filtered by topic keywords on title/dek.
const WELLNESS_KEYWORDS = [
  "wellness",
  "health",
  "fitness",
  "yoga",
  "pilates",
  "gym",
  "sauna",
  "parkrun",
  "running",
  "mindfulness",
  "meditation",
  "nutrition",
  "recovery",
];

const LONGEVITY_KEYWORDS = [
  "longevity",
  "metabolic",
  "sleep",
  "glp-1",
  "ozempic",
  "aging",
  "vo2",
  "biohack",
  "healthspan",
];

const TOPIC_KEYWORDS: Record<string, string[]> = {
  wellness: WELLNESS_KEYWORDS,
  longevity: LONGEVITY_KEYWORDS,
};

export const listSyndicatedByTopic = createServerFn({ method: "GET" })
  .inputValidator((input: { topic: "wellness" | "longevity"; limit?: number }) =>
    z
      .object({
        topic: z.enum(["wellness", "longevity"]),
        limit: z.number().int().min(1).max(60).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    try {
      const sb = publicClient();
      const keywords = TOPIC_KEYWORDS[data.topic] ?? [];
      const orExpr = keywords
        .flatMap((kw) => [`title.ilike.%${kw}%`, `dek.ilike.%${kw}%`])
        .join(",");
      const { data: rows, error } = await sb
        .from("syndicated_stories")
        .select(SELECT)
        .or(orExpr)
        .order("source_published_at", { ascending: false, nullsFirst: false })
        .order("fetched_at", { ascending: false })
        .limit(data.limit ?? 30);
      if (error) return { items: [] as SyndicatedStoryWithSource[], error: error.message };
      return { items: (rows ?? []) as unknown as SyndicatedStoryWithSource[], error: null };
    } catch (err) {
      console.error("listSyndicatedByTopic failed, returning fallback:", err);
      return { items: [] as SyndicatedStoryWithSource[], error: "feed unavailable" };
    }
  });
