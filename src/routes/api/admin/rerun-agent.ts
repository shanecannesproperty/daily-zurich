// Admin-only: re-run a single named agent. Respects concurrency — refuses
// when that agent already has a queued or running stamp.
import { createFileRoute } from "@tanstack/react-router";
import {
  CITY,
  authoriseAgentRequest,
  getIp,
  writeAudit,
} from "@/lib/agents-admin-auth";

const HUNG_MS = 15 * 60 * 1000;

export const Route = createFileRoute("/api/admin/rerun-agent")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip = getIp(request);
        const ua = request.headers.get("user-agent");
        const stampedAt = new Date().toISOString();

        let body: { agent?: string } = {};
        try { body = await request.json(); } catch { /* ignore */ }
        const agentName = typeof body.agent === "string" ? body.agent.trim() : "";
        if (!agentName) {
          return Response.json({ error: "Missing 'agent' in body", step: "validate" }, { status: 400 });
        }

        const authResult = await authoriseAgentRequest(request);
        if (!authResult.ok) {
          return Response.json({ error: authResult.error, step: authResult.step }, { status: authResult.status });
        }
        const { writeClient, source, actorUserId, actorEmail, secretHash } = authResult.actor;

        // Concurrency: refuse if this agent is queued or actively running.
        const { data: row, error: readErr } = await writeClient
          .from("agent_config")
          .select("agent,enabled,run_now_requested_at,last_run_at")
          .eq("city", CITY).eq("agent", agentName).maybeSingle();
        if (readErr) return Response.json({ error: readErr.message, step: "read" }, { status: 500 });
        if (!row) return Response.json({ error: `Unknown agent '${agentName}'`, step: "read" }, { status: 404 });
        if (!row.enabled) return Response.json({ error: `Agent '${agentName}' is disabled`, step: "read" }, { status: 409 });

        const queued = row.run_now_requested_at ? new Date(row.run_now_requested_at).getTime() : 0;
        const finished = row.last_run_at ? new Date(row.last_run_at).getTime() : 0;
        const now = Date.now();
        const inFlight = queued > finished && now - queued < HUNG_MS;
        if (inFlight) {
          return Response.json({
            error: `Agent '${agentName}' is already queued or running.`,
            step: "concurrency-check",
          }, { status: 409 });
        }

        const { error } = await writeClient
          .from("agent_config")
          .update({ run_now_requested_at: stampedAt, cancel_requested_at: null })
          .eq("city", CITY).eq("agent", agentName);
        if (error) return Response.json({ error: error.message, step: "stamp" }, { status: 500 });

        await writeAudit(writeClient, {
          source, actor_user_id: actorUserId, actor_email: actorEmail,
          secret_hash: secretHash, ip, user_agent: ua,
          agents_queued: 1, ok: true, error: `rerun:${agentName}`,
        });

        return Response.json({ ok: true, agent: agentName, queued_at: stampedAt });
      },
    },
  },
});
