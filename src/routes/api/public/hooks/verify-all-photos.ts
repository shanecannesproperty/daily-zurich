// Public photo verification hook. Called by pg_cron every 5 minutes during
// active remediation, then daily for maintenance. Runs the autonomous photo
// verification agent across all articles and events:
//   - Probes every existing hero image for liveness
//   - Vision LLM editorial accuracy check (Gemini 2.5 Flash, 0–10 rubric)
//   - Prunes broken / irrelevant images and immediately replaces them
//   - Acquires images for articles/events that have none
//
// Auth: shared-secret header (x-hook-secret = AGENTS_WEBHOOK_SECRET)
// Same auth pattern as /api/public/hooks/acquire-article-images.
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

  let articleLimit = 40;
  let eventLimit = 30;
  let city: string | null = null;
  try {
    const body = (await request.json()) as {
      article_limit?: number;
      event_limit?: number;
      limit?: number;
      city?: string;
    };
    if (typeof body?.article_limit === "number") articleLimit = body.article_limit;
    if (typeof body?.event_limit === "number") eventLimit = body.event_limit;
    if (typeof body?.limit === "number") {
      articleLimit = body.limit;
      eventLimit = Math.floor(body.limit * 0.75);
    }
    if (typeof body?.city === "string" && body.city.trim()) city = body.city.trim().toLowerCase();
  } catch {
    /* no body — use defaults */
  }
  // Allow ?city= as a fallback (e.g. GET pings).
  if (!city) {
    const qp = new URL(request.url).searchParams.get("city");
    if (qp && qp.trim()) city = qp.trim().toLowerCase();
  }

  const { runPhotoVerification } = await import("@/lib/photo-verification.server");
  const exec = () => runPhotoVerification(articleLimit, eventLimit);
  // ONE deploy serves every Daily Network city and the agent targets
  // citySlug() rows. The cron posts to a single host, which resolves to the
  // default city (canberra) — so without an explicit override every other
  // city's photos are never verified. When a city is named, pin it for this
  // request so the agent processes that city. runWithCity validates the slug
  // and safely falls back to the default for an unknown value.
  if (city) {
    const { runWithCity } = await import("@/lib/city-context.server");
    return Response.json(await runWithCity(city, exec));
  }
  return Response.json(await exec());
}

export const Route = createFileRoute("/api/public/hooks/verify-all-photos")({
  server: {
    handlers: {
      GET: async ({ request }) => run(request),
      POST: async ({ request }) => run(request),
    },
  },
});
