// Public read-only JSON API: next 10 upcoming events for this city.
import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
  "Cache-Control": "public, max-age=300, s-maxage=600",
} as const;

export const Route = createFileRoute("/api/events.json")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async () => {
        try {
          const { cityTable } = await import("@/lib/db.server");
          const nowIso = new Date().toISOString();
          const res = await cityTable("events")
            .select("slug, title, venue, suburb, start_at, end_at, category, image_url, booking_url")
            .eq("is_published", true)
            .not("source_url", "is", null)
            .gte("start_at", nowIso)
            .order("start_at", { ascending: true })
            .limit(10);
          if (res.error) throw new Error(res.error.message);
          return new Response(JSON.stringify({ items: res.data ?? [] }, null, 2), {
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
