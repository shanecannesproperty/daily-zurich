// Public webhook to trigger Run All. The /api/public/* prefix bypasses
// auth on published sites, so this handler MUST verify every request itself.
//
// Auth: HMAC-SHA256 of the raw request body using AGENTS_WEBHOOK_SECRET.
// Send `x-signature: sha256=<hex>`; timing-safe compared on the server.
//
// Example:
//   BODY='{"trigger":"manual"}'
//   SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$AGENTS_WEBHOOK_SECRET" | awk '{print $2}')
//   curl -X POST https://<host>/api/public/webhooks/run-agents \
//     -H "content-type: application/json" \
//     -H "x-signature: sha256=$SIG" \
//     -d "$BODY"
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { citySlug } from "@/lib/city";

function sha256Hex(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

function getIp(request: Request) {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null
  );
}

function verifySignature(body: string, header: string | null, secret: string): boolean {
  if (!header || !secret) return false;
  const provided = header.startsWith("sha256=") ? header.slice(7) : header;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const a = Buffer.from(provided, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || a.length === 0) return false;
  return timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/public/webhooks/run-agents")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const CITY = citySlug();
        const url = process.env.SUPABASE_URL!;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const secret = process.env.AGENTS_WEBHOOK_SECRET ?? "";
        const ip = getIp(request);
        const ua = request.headers.get("user-agent");
        const body = await request.text();
        const signature = request.headers.get("x-signature");

        const admin = createClient(url, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
        });

        async function audit(opts: { queued: number; ok: boolean; error?: string }) {
          await admin.from("agent_trigger_audit").insert({
            city: CITY,
            source: "webhook",
            actor_user_id: null,
            actor_email: null,
            secret_hash: secret ? sha256Hex(secret) : null,
            ip,
            user_agent: ua,
            agents_queued: opts.queued,
            ok: opts.ok,
            error: opts.error ?? null,
          });
        }

        if (!verifySignature(body, signature, secret)) {
          await audit({ queued: 0, ok: false, error: "invalid signature" });
          return Response.json({ error: "Invalid signature" }, { status: 401 });
        }

        const stampedAt = new Date().toISOString();
        const { data, error } = await admin
          .from("agent_config")
          .update({ run_now_requested_at: stampedAt })
          .eq("city", CITY)
          .eq("enabled", true)
          .select("agent");
        if (error) {
          await audit({ queued: 0, ok: false, error: error.message });
          return Response.json({ error: error.message }, { status: 500 });
        }
        const agents = (data ?? []).map((r) => r.agent as string).sort();
        await audit({ queued: agents.length, ok: true });
        return Response.json({
          ok: true,
          city: CITY,
          queued_at: stampedAt,
          count: agents.length,
          agents,
        });
      },
    },
  },
});
