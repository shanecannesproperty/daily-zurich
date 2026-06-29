// Admin-only: stamp `run_now_requested_at` on every enabled agent for CITY.
import { createFileRoute } from "@tanstack/react-router";
import {
  CITY,
  authoriseAgentRequest,
  getIp,
  writeAudit,
} from "@/lib/agents-admin-auth";

function jsonError(status: number, payload: Record<string, unknown>) {
  return Response.json(payload, { status });
}

export const Route = createFileRoute("/api/admin/run-all-agents")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const startedAt = Date.now();
        const stampedAt = new Date().toISOString();
        const ip = getIp(request);
        const ua = request.headers.get("user-agent");

        const authResult = await authoriseAgentRequest(request);
        if (!authResult.ok) {
          return jsonError(authResult.status, { error: authResult.error, step: authResult.step });
        }
        const { writeClient, source, actorUserId, actorEmail, secretHash } = authResult.actor;

        // Concurrency protection: refuse if a run is already in-flight for any enabled agent.
        const { data: active } = await writeClient
          .from("agent_config")
          .select("agent,run_now_requested_at,last_run_at")
          .eq("city", CITY)
          .eq("enabled", true);
        const now = Date.now();
        const HUNG_MS = 15 * 60 * 1000;
        const inFlight = ((active ?? []) as Array<{ agent: string; run_now_requested_at: string | null; last_run_at: string | null }>)
          .filter((r) => {
            const queued = r.run_now_requested_at ? new Date(r.run_now_requested_at).getTime() : 0;
            const finished = r.last_run_at ? new Date(r.last_run_at).getTime() : 0;
            return queued > finished && now - queued < HUNG_MS;
          });
        if (inFlight.length > 0) {
          await writeAudit(writeClient, {
            source, actor_user_id: actorUserId, actor_email: actorEmail,
            secret_hash: secretHash, ip, user_agent: ua,
            agents_queued: 0, ok: false, error: "already-running",
          });
          return jsonError(409, {
            error: "A run is already in progress. Wait for it to finish or cancel it.",
            in_flight: inFlight.map((r) => r.agent),
            step: "concurrency-check",
          });
        }

        // Clear any prior cancel request, then stamp run.
        await writeClient.from("agent_config")
          .update({ cancel_requested_at: null })
          .eq("city", CITY).eq("enabled", true);

        const { data, error } = await writeClient
          .from("agent_config")
          .update({ run_now_requested_at: stampedAt })
          .eq("city", CITY)
          .eq("enabled", true)
          .select("agent");
        if (error) {
          await writeAudit(writeClient, {
            source, actor_user_id: actorUserId, actor_email: actorEmail,
            secret_hash: secretHash, ip, user_agent: ua,
            agents_queued: 0, ok: false, error: error.message,
          });
          return jsonError(500, { error: error.message, step: "stamp" });
        }
        const agents = ((data ?? []) as Array<{ agent: string }>).map((r) => r.agent).sort();
        await writeAudit(writeClient, {
          source, actor_user_id: actorUserId, actor_email: actorEmail,
          secret_hash: secretHash, ip, user_agent: ua,
          agents_queued: agents.length, ok: true,
        });
        return Response.json({
          ok: true, city: CITY, queued_at: stampedAt,
          duration_ms: Date.now() - startedAt, count: agents.length, agents,
        });
      },
    },
  },
});
