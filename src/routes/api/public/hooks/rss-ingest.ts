// Public RSS ingest hook. The /api/public/* prefix bypasses platform auth, so
// every request MUST present a shared-secret header that matches
// AGENTS_WEBHOOK_SECRET. pg_cron is configured to send this header; the admin
// UI calls the authenticated `adminRunRssIngest` server function instead.
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

async function handle(request: Request) {
  if (!authorised(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { runRssIngest } = await import("@/lib/rss-ingest.server");
  return Response.json(await runRssIngest());
}

export const Route = createFileRoute("/api/public/hooks/rss-ingest")({
  server: {
    handlers: {
      GET: async ({ request }) => handle(request),
      POST: async ({ request }) => handle(request),
    },
  },
});
