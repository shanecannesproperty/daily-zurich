// Beacon endpoint for client-side tracker failures. Accepts POST with no auth
// (sendBeacon cannot set custom headers). Rate-limited per anon session to 20
// failures per day. Increments track_failures(day, city) via a SECURITY DEFINER
// RPC so anon never holds a direct table grant.
//
// Body (JSON): { path: string; reason: string; anonSessionId?: string }
// No PII is stored or logged.
import { createFileRoute } from "@tanstack/react-router";
import { citySlug } from "@/lib/city";

// Simple in-memory per-session rate limit (resets on worker restart).
// Key: anonSessionId. Value: count for today.
const todayKey = () => new Date().toISOString().slice(0, 10);
const rateLimiter = new Map<string, { day: string; count: number }>();

function isRateLimited(sessionId: string | undefined): boolean {
  if (!sessionId) return false;
  const day = todayKey();
  const entry = rateLimiter.get(sessionId);
  if (!entry || entry.day !== day) {
    rateLimiter.set(sessionId, { day, count: 1 });
    return false;
  }
  if (entry.count >= 20) return true;
  entry.count += 1;
  return false;
}

async function handle(request: Request): Promise<Response> {
  let parsed: { path?: string; reason?: string; anonSessionId?: string } = {};
  try {
    parsed = (await request.json()) as typeof parsed;
  } catch {
    return new Response(null, { status: 204 });
  }

  const sessionId = typeof parsed.anonSessionId === "string"
    ? parsed.anonSessionId.slice(0, 64)
    : undefined;

  if (isRateLimited(sessionId)) {
    return new Response(null, { status: 204 });
  }

  try {
    const { rawSupabase } = await import("@/lib/db.server");
    await rawSupabase.rpc("record_track_failure", { p_city: citySlug() });
  } catch {
    /* best-effort; never surface DB errors */
  }

  return new Response(null, { status: 204 });
}

export const Route = createFileRoute("/api/public/track-failure")({
  server: {
    handlers: {
      POST: ({ request }) => handle(request),
    },
  },
});
