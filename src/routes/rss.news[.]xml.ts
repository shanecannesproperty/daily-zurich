import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { cityName, siteDomain, siteName } from "@/lib/city";
import { rssResponse } from "@/lib/rss";

export const Route = createFileRoute("/rss/news.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { cityTable } = await import("@/lib/db.server");
        const res = await cityTable("articles")
          .eq("is_published", true)
          .order("published_at", { ascending: false })
          .limit(50);
        if (res.error) return new Response(res.error.message, { status: 500 });
        const items = (res.data ?? []).map((a) => ({
          title: (a as { title: string }).title,
          link: `${siteDomain()}/article/${(a as { slug: string }).slug}`,
          description: (a as { dek: string | null }).dek ?? null,
          pubDate: (a as { published_at: string | null }).published_at,
        }));
        return rssResponse({
          title: `${siteName()}: News`,
          description: `Latest ${cityName()} news from ${siteName()} newsroom.`,
          feedPath: "/rss/news.xml",
          items,
        });
      },
    },
  },
});
