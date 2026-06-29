import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { cityName, siteDomain, siteName } from "@/lib/city";
import { rssResponse } from "@/lib/rss";

export const Route = createFileRoute("/rss/federal.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { cityTable } = await import("@/lib/db.server");
        const res = await cityTable("articles")
          .eq("is_published", true)
          .eq("category", "federal")
          .order("published_at", { ascending: false })
          .limit(50);
        if (res.error) return new Response(res.error.message, { status: 500 });
        const items = (res.data ?? []).map((a) => {
          const ar = a as {
            title: string;
            slug: string;
            dek: string | null;
            published_at: string | null;
          };
          return {
            title: ar.title,
            link: `${siteDomain()}/article/${ar.slug}`,
            description: ar.dek,
            pubDate: ar.published_at,
          };
        });
        return rssResponse({
          title: `${siteName()}: Federal`,
          description: `Federal politics and the public service, covered from ${cityName()}.`,
          feedPath: "/rss/federal.xml",
          items,
        });
      },
    },
  },
});
