// Admin-only: request cancellation of any in-progress agent run for CITY.
// Stamps `cancel_requested_at` on enabled rows; the worker is responsible
// for honouring the flag and marking the run as cancelled.
import { createFileRoute } from "@tanstack/react-router";
import {
  CITY,
  authoriseAgentRequest,
  getIp,
  writeAudit,
} from "@/lib/agents-admin-auth";

export const Route = createFileRoute("/api/admin/cancel-agents")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip = getIp(request);
        const ua = request.headers.get("user-agent");
        const stampedAt = new Date().toISOString();

        const authResult = await authoriseAgentRequest(request);
        if (!authResult.ok) {
          return Response.json({ error: authResult.error, step: authResult.step }, { status: authResult.status });
        }
        const { writeClient, source, actorUserId, actorEmail, secretHash } = authResult.actor;

        const { data, error } = await writeClient
          .from("agent_config")
          .update({ cancel_requested_at: stampedAt, run_now_requested_at: null })
          .eq("city", CITY)
          .eq("enabled", true)
          .select("agent");
        if (error) return Response.json({ error: error.message, step: "stamp" }, { status: 500 });

        const agents = ((data ?? []) as Array<{ agent: string }>).map((r) => r.agent).sort();

        await writeAudit(writeClient, {
          source, actor_user_id: actorUserId, actor_email: actorEmail,
          secret_hash: secretHash, ip, user_agent: ua,
          agents_queued: agents.length, ok: true, error: "cancel-requested",
        });

        return Response.json({ ok: true, city: CITY, cancelled_at: stampedAt, count: agents.length, agents });
      },
    },
  },
});
