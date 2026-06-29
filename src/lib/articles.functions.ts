import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { citySlug } from "@/lib/city";

export const getRelatedArticles = createServerFn({ method: "GET" })
  .inputValidator((d: { currentSlug: string; limit?: number }) =>
    z
      .object({
        currentSlug: z.string().min(1).max(256),
        limit: z.number().int().min(1).max(12).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { cityTable } = await import("@/lib/db.server");
    const res = await cityTable("articles")
      .select("id, title, slug, hero_image, category, published_at")
      .eq("is_published", true)
      .neq("slug", data.currentSlug)
      .order("published_at", { ascending: false })
      .limit(data.limit ?? 3);
    if (res.error) {
      console.error("[related-articles] failed", res.error.message, { city: citySlug() });
      return { articles: [] as RelatedArticle[] };
    }
    return { articles: (res.data ?? []) as RelatedArticle[] };
  });

export type RelatedArticle = {
  id: string;
  title: string;
  slug: string;
  hero_image: string | null;
  category: string | null;
  published_at: string | null;
};

export type MostReadArticle = {
  id: string;
  title: string;
  slug: string;
  category: string | null;
  published_at: string | null;
  view_count: number;
};

export const trackArticleView = createServerFn({ method: "POST" })
  .inputValidator((d: { slug: string }) =>
    z.object({ slug: z.string().min(1).max(256) }).parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabaseAdmin as any).rpc("increment_article_view", {
        p_slug: data.slug,
        p_city: citySlug(),
      });
      if (error) console.error("[track-view] rpc failed", error.message);
    } catch (err) {
      console.error("[track-view] exception", err);
    }
    return { ok: true as const };
  });


export const getMostRead = createServerFn({ method: "GET" }).handler(async () => {
  const { cityTable } = await import("@/lib/db.server");
  const fallbackToLatest = async (): Promise<{
    articles: MostReadArticle[];
    fallback: boolean;
  }> => {
    const latest = await cityTable("articles")
      .select("id, title, slug, category, published_at")
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .limit(5);
    const rows = (latest.data ?? []) as Array<Omit<MostReadArticle, "view_count">>;
    return {
      articles: rows.map((r) => ({ ...r, view_count: 0 })),
      fallback: true,
    };
  };

  try {
    const { dbInsertClient } = await import("@/lib/db.server");
    const supabase = dbInsertClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: top, error } = await (supabase as any).rpc("get_most_read", {
      p_city: citySlug(),
      p_limit: 5,
    });
    if (error || !Array.isArray(top) || top.length < 3) {
      return fallbackToLatest();
    }
    const slugs = top.map((r: { slug: string }) => r.slug);
    const meta = await cityTable("articles")
      .select("id, title, slug, category, published_at")
      .eq("is_published", true)
      .in("slug", slugs);
    const bySlug = new Map<string, Omit<MostReadArticle, "view_count">>();
    for (const row of (meta.data ?? []) as Array<Omit<MostReadArticle, "view_count">>) {
      bySlug.set(row.slug, row);
    }
    const articles: MostReadArticle[] = [];
    for (const r of top as Array<{ slug: string; view_count: number }>) {
      const m = bySlug.get(r.slug);
      if (m) articles.push({ ...m, view_count: Number(r.view_count) || 0 });
    }
    if (articles.length < 3) return fallbackToLatest();
    return { articles, fallback: false };
  } catch (err) {
    console.error("[most-read] exception", err);
    return fallbackToLatest();
  }
});


// ---- Author profile pages ----
export type AuthorArticle = {
  id: string;
  title: string;
  slug: string;
  dek: string | null;
  hero_image: string | null;
  category: string | null;
  published_at: string | null;
};

export const listArticlesByAuthor = createServerFn({ method: "GET" })
  .inputValidator((d: { author: string; limit?: number }) =>
    z
      .object({
        author: z.string().min(1).max(200),
        limit: z.number().int().min(1).max(100).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { cityTable } = await import("@/lib/db.server");
    const res = await cityTable("articles")
      .select("id, title, slug, dek, hero_image, category, published_at, author")
      .eq("is_published", true)
      .eq("author", data.author)
      .order("published_at", { ascending: false })
      .limit(data.limit ?? 50);
    if (res.error) {
      console.error("[author-articles] failed", res.error.message);
      return { articles: [] as AuthorArticle[] };
    }
    return { articles: (res.data ?? []) as AuthorArticle[] };
  });

// ---- Breaking news banner ----
export type BreakingArticle = {
  slug: string;
  title: string;
} | null;

export const getBreakingArticle = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { cityTable } = await import("@/lib/db.server");
    // Try `is_breaking` first, then `breaking`. If neither column exists the
    // request errors (PostgREST 42703) and we silently return null.
    for (const col of ["is_breaking", "breaking"] as const) {
      const res = await cityTable("articles")
        .select("slug, title, published_at")
        .eq("is_published", true)
        .eq(col, true)
        .order("published_at", { ascending: false })
        .limit(1);
      if (res.error) continue;
      const row = (res.data ?? [])[0] as { slug: string; title: string } | undefined;
      if (row) return { article: row as BreakingArticle };
    }
    return { article: null as BreakingArticle };
  } catch {
    return { article: null as BreakingArticle };
  }
});

// ---- Trending Now (last 7 days, by view_count) ----
export const getTrendingNow = createServerFn({ method: "GET" }).handler(async () => {
  const { cityTable } = await import("@/lib/db.server");
  const fallback = async (): Promise<{ articles: MostReadArticle[]; fallback: boolean }> => {
    const latest = await cityTable("articles")
      .select("id, title, slug, category, published_at")
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .limit(5);
    const rows = (latest.data ?? []) as Array<Omit<MostReadArticle, "view_count">>;
    return { articles: rows.map((r) => ({ ...r, view_count: 0 })), fallback: true };
  };
  try {
    const { dbInsertClient } = await import("@/lib/db.server");
    const supabase = dbInsertClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: top, error } = await (supabase as any).rpc("get_most_read", {
      p_city: citySlug(),
      p_limit: 5,
    });
    if (error || !Array.isArray(top) || top.length === 0) return fallback();
    const slugs = top.map((r: { slug: string }) => r.slug);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const meta = await cityTable("articles")
      .select("id, title, slug, category, published_at")
      .eq("is_published", true)
      .in("slug", slugs)
      .gte("published_at", sevenDaysAgo);
    const bySlug = new Map<string, Omit<MostReadArticle, "view_count">>();
    for (const row of (meta.data ?? []) as Array<Omit<MostReadArticle, "view_count">>) {
      bySlug.set(row.slug, row);
    }
    const articles: MostReadArticle[] = [];
    for (const r of top as Array<{ slug: string; view_count: number }>) {
      const m = bySlug.get(r.slug);
      if (m) articles.push({ ...m, view_count: Number(r.view_count) || 0 });
    }
    if (articles.length === 0) return fallback();
    return { articles, fallback: false };
  } catch {
    return fallback();
  }
});

// Latest 5 published articles in the last 24h — powers the ticker strip.
// Falls back to the most-recent 5 (any time) when nothing has been published
// in the last day so the ticker never goes empty.
export const getTickerHeadlines = createServerFn({ method: "GET" }).handler(async () => {
  const { cityTable } = await import("@/lib/db.server");
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const recent = await cityTable("articles")
    .select("slug, title, published_at")
    .eq("is_published", true)
    .gte("published_at", since)
    .order("published_at", { ascending: false })
    .limit(5);
  let rows = (recent.data ?? []) as Array<{ slug: string; title: string; published_at: string | null }>;
  if (rows.length < 3) {
    const fallback = await cityTable("articles")
      .select("slug, title, published_at")
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .limit(5);
    rows = (fallback.data ?? []) as typeof rows;
  }
  return { items: rows };
});
