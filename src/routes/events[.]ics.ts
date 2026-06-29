import { createFileRoute } from "@tanstack/react-router";
import { cityName, siteName } from "@/lib/city";
import { buildEventIcs } from "@/lib/ics";

export const Route = createFileRoute("/events.ics")({
  server: {
    handlers: {
      GET: async () => {
        const { cityTable } = await import("@/lib/db.server");
        const nowIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const res = await cityTable("events")
          .eq("is_published", true)
          .not("source_url", "is", null)
          .gte("start_at", nowIso)
          .order("start_at", { ascending: true })
          .limit(500);
        if (res.error) {
          return new Response("error", { status: 500 });
        }
        const rows = (res.data ?? []) as Array<{
          slug: string;
          title: string;
          start_at: string | null;
          end_at: string | null;
          venue: string | null;
          suburb: string | null;
          source_url: string | null;
        }>;
        // Stitch individual VEVENTs into one VCALENDAR.
        const veventBlocks = rows
          .map((e) => {
            const ics = buildEventIcs(e);
            const m = ics.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/);
            return m ? m[0] : "";
          })
          .filter(Boolean)
          .join("\r\n");
        const body = [
          "BEGIN:VCALENDAR",
          "VERSION:2.0",
          `PRODID:-//${siteName()}//Events//EN`,
          `X-WR-CALNAME:${cityName()} events — ${siteName()}`,
          "X-WR-TIMEZONE:Australia/Sydney",
          veventBlocks,
          "END:VCALENDAR",
        ].join("\r\n");
        return new Response(body, {
          status: 200,
          headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Cache-Control": "public, max-age=900",
          },
        });
      },
    },
  },
});
