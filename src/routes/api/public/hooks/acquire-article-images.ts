// Public hero-image acquisition hook. The /api/public/* prefix bypasses
// platform auth; every request MUST present a shared-secret header that
// matches AGENTS_WEBHOOK_SECRET. pg_cron sends this header (see
// db/manual-migrations/20260625_article_images_cron.sql); the admin UI
// already calls the authenticated /api/admin/acquire-article-images route.
import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";

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

async function run(request: Request) {
  if (!authorised(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { acquireMissingArticleImages } = await import("@/lib/article-images.server");
  let limit = 20;
  let city: string | null = null;
  try {
    const body = (await request.json()) as { limit?: number; city?: string };
    if (typeof body?.limit === "number") limit = body.limit;
    if (typeof body?.city === "string" && body.city.trim()) city = body.city.trim().toLowerCase();
  } catch {
    /* no body — use default */
  }
  // Allow ?city= as a fallback (e.g. GET pings).
  if (!city) {
    const qp = new URL(request.url).searchParams.get("city");
    if (qp && qp.trim()) city = qp.trim().toLowerCase();
  }

  const exec = () => acquireMissingArticleImages(limit);
  // ONE deploy serves every Daily Network city; acquisition targets citySlug()
  // rows. The cron posts to a single host that resolves to the default city,
  // so without an explicit override only that city ever gets images. Pin the
  // named city for this request. runWithCity validates the slug and safely
  // falls back to the default for an unknown value.
  if (city) {
    const { runWithCity } = await import("@/lib/city-context.server");
    return Response.json(await runWithCity(city, exec));
  }
  return Response.json(await exec());
}

export const Route = createFileRoute("/api/public/hooks/acquire-article-images")({
  server: {
    handlers: {
      GET: async ({ request }) => run(request),
      POST: async ({ request }) => run(request),
    },
  },
});
