// Public content-distribution hook. The /api/public/* prefix bypasses platform
// auth; every request MUST present a shared-secret header that matches
// AGENTS_WEBHOOK_SECRET. pg_cron sends this header (see
// db/manual-migrations/20260628_distribution_cron.sql).
//
// Submits recent published articles to search engines (IndexNow + Google
// Indexing API) and posts them to Facebook + Instagram, skipping any channel
// already completed for that article.
//
// Body (all optional):
//   { "city": "sydney", "limit": 25, "lookbackHours": 72,
//     "channels": ["indexnow","google","facebook","instagram"] }
import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";
import type { Channel } from "@/lib/distribution.server";

function authorised(request: Request): boolean {
  const secret = process.env.AGENTS_WEBHOOK_SECRET ?? "";
  if (!secret) return false;
  const provided = request.headers.get("x-hook-secret") ?? "";
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

const VALID_CHANNELS: Channel[] = ["indexnow", "google", "facebook", "instagram"];

async function run(request: Request) {
  if (!authorised(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { runDistribution } = await import("@/lib/distribution.server");

  let limit = 25;
  let lookbackHours = 72;
  let city: string | null = null;
  let channels: Channel[] | undefined;
  try {
    const body = (await request.json()) as {
      limit?: number;
      lookbackHours?: number;
      city?: string;
      channels?: string[];
    };
    if (typeof body?.limit === "number") limit = body.limit;
    if (typeof body?.lookbackHours === "number") lookbackHours = body.lookbackHours;
    if (typeof body?.city === "string" && body.city.trim()) city = body.city.trim().toLowerCase();
    if (Array.isArray(body?.channels)) {
      channels = body.channels
        .map((c) => String(c).toLowerCase())
        .filter((c): c is Channel => (VALID_CHANNELS as string[]).includes(c));
    }
  } catch {
    /* no body — use defaults */
  }
  // Allow query params as a fallback for GET pings.
  const qp = new URL(request.url).searchParams;
  if (!city && qp.get("city")?.trim()) city = qp.get("city")!.trim().toLowerCase();

  const exec = () => runDistribution({ limit, lookbackHours, channels });
  if (city) {
    const { runWithCity } = await import("@/lib/city-context.server");
    return Response.json(await runWithCity(city, exec));
  }
  return Response.json(await exec());
}

export const Route = createFileRoute("/api/public/hooks/distribute")({
  server: {
    handlers: {
      GET: async ({ request }) => run(request),
      POST: async ({ request }) => run(request),
    },
  },
});
