import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { cityName, siteDomain, siteName } from "@/lib/city";
import { rssResponse } from "@/lib/rss";

export const Route = createFileRoute("/rss/events.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { cityTable } = await import("@/lib/db.server");
        const nowIso = new Date().toISOString();
        const res = await cityTable("events")
          .eq("is_published", true)
          .not("source_url", "is", null)
          .gte("start_at", nowIso)
          .order("start_at", { ascending: true })
          .limit(50);
        if (res.error) return new Response(res.error.message, { status: 500 });
        const items = (res.data ?? []).map((e) => {
          const ev = e as {
            title: string;
            slug: string;
            venue: string | null;
            start_at: string | null;
          };
          return {
            title: ev.title,
            link: `${siteDomain()}/event/${ev.slug}`,
            description: ev.venue
              ? `${ev.venue}${ev.start_at ? ` on ${new Date(ev.start_at).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short", timeZone: "Australia/Sydney" })}` : ""}`
              : null,
            pubDate: ev.start_at,
          };
        });
        return rssResponse({
          title: `${siteName()}: Events`,
          description: `Upcoming events in ${cityName()}. Verified, source backed.`,
          feedPath: "/rss/events.xml",
          items,
        });
      },
    },
  },
});
