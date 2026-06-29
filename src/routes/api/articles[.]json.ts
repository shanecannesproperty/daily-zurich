// Public read-only JSON API: last 10 published articles for this city.
// Stable contract for aggregators, partner sites, and future native apps.
// Open CORS — explicitly public data, no auth required.
import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
  "Cache-Control": "public, max-age=120, s-maxage=300",
} as const;

export const Route = createFileRoute("/api/articles.json")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async () => {
        try {
          const { cityTable } = await import("@/lib/db.server");
          const res = await cityTable("articles")
            .select("slug, title, dek, category, published_at, hero_image")
            .eq("is_published", true)
            .order("published_at", { ascending: false })
            .limit(10);
          if (res.error) throw new Error(res.error.message);
          const items = (res.data ?? []).map((r) => ({
            slug: r.slug as string,
            title: r.title as string,
            excerpt: (r.dek as string | null) ?? "",
            category: r.category as string | null,
            published_at: r.published_at as string | null,
            image_url: (r.hero_image as string | null) ?? null,
          }));
          return new Response(JSON.stringify({ items }, null, 2), {
            status: 200,
            headers: { "Content-Type": "application/json; charset=utf-8", ...CORS },
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json; charset=utf-8", ...CORS },
          });
        }
      },
    },
  },
});
