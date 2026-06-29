import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { AdminShell } from "@/components/AdminShell";
import { AdminDebugOverlay } from "@/components/AdminDebugOverlay";
import { useAdminSession } from "@/hooks/useAdminSession";
import { adminSupabase } from "@/integrations/supabase/admin-client";
import { citySlug, siteName } from "@/lib/city";
import { formatDateTime } from "@/lib/date";
import { tracked } from "@/lib/debug-store";
import { reportSupabaseFailure } from "@/lib/supabase-logger";

const ADMIN_EMAIL = "shane@spexperts.com.au";
const HUNG_RUN_MS = 15 * 60 * 1000;

export const Route = createFileRoute("/admin/agents")({
  ssr: false,
  head: () => ({
    meta: [
      { title: `AI Agents | Admin | ${siteName()}` },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AgentsPage,
});

type AgentConfigRow = {
  agent: string;
  city: string;
  enabled: boolean;
  cron: string | null;
  run_now_requested_at: string | null;
  last_run_at: string | null;
  config: unknown;
};

type AgentRunRow = {
  id: string;
  agent: string;
  city: string;
  status: string;
  items_written: number | null;
  items_skipped: number | null;
  llm_calls: number | null;
  cost_cents: number | null;
  started_at: string | null;
  finished_at: string | null;
  error: string | null;
  stack_trace: string | null;
  prompt_payload: unknown;
};

type AuditRow = {
  id: string;
  created_at: string;
  city: string;
  source: string;
  actor_email: string | null;
  secret_hash: string | null;
  ip: string | null;
  user_agent: string | null;
  agents_queued: number;
  ok: boolean;
  error: string | null;
};

type AgentProgress = "idle" | "queued" | "running" | "retrying" | "done";

type SourceRow = {
  id: string;
  city: string;
  kind: string;
  url: string;
  is_active: boolean;
};

function AgentsPage() {
  const { email, loading } = useAdminSession();
  const [tab, setTab] = useState<"agents" | "sources">("agents");

  if (loading) {
    return (
      <div className="container-news py-24 text-center">
        <p className="meta uppercase tracking-widest">Loading</p>
      </div>
    );
  }
  if (!email) return null;
  if (email !== ADMIN_EMAIL) {
    return (
      <AdminShell title="AI Agents" email={email} activePath="/admin/agents">
        <div className="border border-[var(--hairline)] p-8 bg-[var(--surface)]">
          <p className="meta uppercase tracking-widest mb-2">Access denied</p>
          <p>This control panel is restricted to the platform owner.</p>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="AI Agents" email={email} activePath="/admin/agents">
      <nav
        aria-label="Agents sections"
        className="mb-6 border-b border-[var(--hairline)] flex gap-6"
      >
        {(["agents", "sources"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            data-active={tab === t}
            className="nav-link py-2"
          >
            {t === "agents" ? "Agents" : "Sources"}
          </button>
        ))}
      </nav>
      {tab === "agents" ? <AgentsTab /> : <SourcesTab />}
      <AdminDebugOverlay />
    </AdminShell>
  );
}

function AgentsTab() {
  const [configs, setConfigs] = useState<AgentConfigRow[] | null>(null);
  const [runs, setRuns] = useState<AgentRunRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setErr(null);
    const cfg = await tracked(
      "agent_config",
      `select where city=${citySlug()} order by agent`,
      adminSupabase
        .from("agent_config")
        .select("agent,city,enabled,cron,run_now_requested_at,last_run_at,config")
        .eq("city", citySlug())
        .order("agent", { ascending: true }),
    );
    if (cfg.error) {
      setErr(cfg.error.message);
      reportSupabaseFailure({
        context: `agent_config select where city=${citySlug()}`,
        error: cfg.error,
        retry: () => load(),
      });
      setConfigs([]);
      return;
    }
    setConfigs((cfg.data ?? []) as AgentConfigRow[]);
    const runsRes = await tracked(
      "agent_runs",
      `select where city=${citySlug()} order by started_at desc limit 500`,
      adminSupabase
        .from("agent_runs")
        .select(
          "id,agent,city,status,items_written,items_skipped,llm_calls,cost_cents,started_at,finished_at,error,stack_trace,prompt_payload",
        )
        .eq("city", citySlug())
        .order("started_at", { ascending: false })
        .limit(500),
    );
    if (runsRes.error) {
      setErr(runsRes.error.message);
      reportSupabaseFailure({
        context: `agent_runs select where city=${citySlug()}`,
        error: runsRes.error,
        retry: () => load(),
      });
      return;
    }
    setRuns((runsRes.data ?? []) as AgentRunRow[]);
    const auditRes = await tracked(
      "agent_trigger_audit",
      `select where city=${citySlug()} order by created_at desc limit 50`,
      adminSupabase
        .from("agent_trigger_audit")
        .select(
          "id,created_at,city,source,actor_email,secret_hash,ip,user_agent,agents_queued,ok,error",
        )
        .eq("city", citySlug())
        .order("created_at", { ascending: false })
        .limit(50),
    );
    if (!auditRes.error) setAudit((auditRes.data ?? []) as AuditRow[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runsByAgent = useMemo(() => {
    const map = new Map<string, AgentRunRow[]>();
    for (const r of runs) {
      const arr = map.get(r.agent) ?? [];
      arr.push(r);
      map.set(r.agent, arr);
    }
    return map;
  }, [runs]);

  const progressByAgent = useMemo(() => {
    const map = new Map<string, AgentProgress>();
    if (!configs) return map;
    const now = Date.now();
    for (const c of configs) {
      const list = runsByAgent.get(c.agent) ?? [];
      const latest = list[0];
      const queuedAt = c.run_now_requested_at ? new Date(c.run_now_requested_at).getTime() : 0;
      const latestStart = latest?.started_at ? new Date(latest.started_at).getTime() : 0;
      const runningFresh =
        latest?.status === "running" && latestStart && now - latestStart <= HUNG_RUN_MS;
      if (runningFresh) {
        map.set(c.agent, "running");
        continue;
      }
      if (queuedAt && queuedAt > latestStart) {
        map.set(c.agent, "queued");
        continue;
      }
      const prev = list[1];
      const recentFailures =
        latest &&
        prev &&
        (latest.status === "error" || latest.status === "partial") &&
        (prev.status === "error" || prev.status === "partial") &&
        latestStart &&
        now - latestStart <= 30 * 60 * 1000;
      if (recentFailures) {
        map.set(c.agent, "retrying");
        continue;
      }
      if (latest && ["ok", "partial", "skipped", "error"].includes(latest.status)) {
        map.set(c.agent, "done");
        continue;
      }
      map.set(c.agent, "idle");
    }
    return map;
  }, [configs, runsByAgent]);

  const anyActive = useMemo(() => {
    for (const p of progressByAgent.values()) {
      if (p === "queued" || p === "running" || p === "retrying") return true;
    }
    return false;
  }, [progressByAgent]);

  useEffect(() => {
    if (!anyActive) return;
    const id = window.setInterval(() => {
      void load();
    }, 5000);
    return () => window.clearInterval(id);
  }, [anyActive, load]);

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const alerts = useMemo(() => {
    if (!configs) return [];
    const items: string[] = [];
    const now = Date.now();
    for (const c of configs) {
      const list = runsByAgent.get(c.agent) ?? [];
      const latest = list[0];
      if (!latest) continue;
      if (latest.status === "error") {
        items.push(
          `${c.agent}: latest run errored${latest.error ? ` (${truncate(latest.error, 120)})` : ""}.`,
        );
      }
      if (latest.status === "running" && latest.started_at) {
        const age = now - new Date(latest.started_at).getTime();
        if (age > HUNG_RUN_MS) {
          items.push(
            `${c.agent}: run started ${Math.round(age / 60000)} min ago and is still running.`,
          );
        }
      }
    }
    return items;
  }, [configs, runsByAgent]);

  async function runNow(agent: string) {
    setBusy(`run:${agent}`);
    const { error } = await adminSupabase
      .from("agent_config")
      .update({ run_now_requested_at: new Date().toISOString() })
      .eq("city", citySlug())
      .eq("agent", agent);
    setBusy(null);
    if (error) {
      setErr(error.message);
      return;
    }
    await load();
  }

  async function runAllNow() {
    if (!configs) return;
    setBusy("run:__all__");
    try {
      const { data: sess } = await adminSupabase.auth.getSession();
      const token = sess.session?.access_token ?? "";
      const res = await fetch("/api/admin/run-all-agents", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: "{}",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setErr(body.error ?? `HTTP ${res.status}`);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
      await load();
    }
  }

  async function backfillAll() {
    if (!configs) return;
    const days = window.prompt(
      "Backfill window in days (e.g. 90 means scan content from the last 90 days):",
      "90",
    );
    if (!days) return;
    const n = Number(days);
    if (!Number.isFinite(n) || n <= 0 || n > 365 * 5) {
      setErr("Invalid backfill window.");
      return;
    }
    setBusy("backfill:__all__");
    const now = new Date();
    const from = new Date(now.getTime() - n * 24 * 60 * 60 * 1000).toISOString();
    const nowIso = now.toISOString();
    const { error } = await adminSupabase
      .from("agent_config")
      .update({
        run_now_requested_at: nowIso,
        backfill_from: from,
        backfill_until: nowIso,
        backfill_requested_at: nowIso,
      })
      .eq("city", citySlug())
      .eq("enabled", true);
    setBusy(null);
    if (error) {
      setErr(error.message);
      return;
    }
    await load();
  }

  async function toggle(agent: string, next: boolean) {
    setBusy(`toggle:${agent}`);
    const { error } = await adminSupabase
      .from("agent_config")
      .update({ enabled: next })
      .eq("city", citySlug())
      .eq("agent", agent);
    setBusy(null);
    if (error) {
      setErr(error.message);
      return;
    }
    await load();
  }

  if (!configs) return <p className="meta">Loading</p>;

  return (
    <div>
      {alerts.length > 0 ? (
        <div className="mb-4 border-l-4 border-[var(--ink-red)] bg-[var(--surface)] p-4">
          <p className="kicker mb-1">Alerts</p>
          <ul className="text-sm space-y-1 list-disc pl-5">
            {alerts.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {err ? <p className="text-sm text-[var(--ink-red)] mb-3">{err}</p> : null}

      <div className="flex items-center justify-between mb-3 gap-3">
        <p className="meta">
          {configs.length} agent{configs.length === 1 ? "" : "s"} for {citySlug()}
        </p>
        <div className="flex gap-2 items-center">
          {anyActive ? (
            <span className="meta uppercase tracking-widest text-xs px-2 py-0.5 border border-[var(--hairline)] bg-[var(--surface)]">
              Auto-refreshing 5s
            </span>
          ) : null}
          <button onClick={runAllNow} disabled={busy === "run:__all__"} className="btn-primary">
            {busy === "run:__all__" ? "Triggering." : "Run all enabled now"}
          </button>
          <button
            onClick={backfillAll}
            disabled={busy === "backfill:__all__"}
            className="btn-ghost"
            title="Run all enabled agents in backfill mode over a date window"
          >
            {busy === "backfill:__all__" ? "Backfilling." : "Backfill"}
          </button>
          <button onClick={load} className="btn-ghost">
            Refresh
          </button>
        </div>
      </div>
      <div className="border border-[var(--hairline)] overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--surface)] border-b border-[var(--hairline)]">
            <tr>
              <th className="text-left p-3">Agent</th>
              <th className="text-left p-3">City</th>
              <th className="text-left p-3">Schedule</th>
              <th className="text-left p-3">Latest run</th>
              <th className="text-left p-3">Progress</th>
              <th className="text-left p-3">Output</th>
              <th className="text-left p-3">Last 10</th>
              <th className="text-left p-3">Enabled</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {configs.map((c) => {
              const list = runsByAgent.get(c.agent) ?? [];
              const latest = list[0];
              const last10 = list.slice(0, 10);
              const dollars = ((latest?.cost_cents ?? 0) / 100).toFixed(2);
              return (
                <tr
                  key={`${c.agent}:${c.city}`}
                  className="border-b border-[var(--hairline)] align-top"
                >
                  <td className="p-3 serif">{c.agent}</td>
                  <td className="p-3">{c.city}</td>
                  <td className="p-3 font-mono text-xs">{c.cron ?? "—"}</td>
                  <td className="p-3">
                    {latest?.started_at ? formatDateTime(latest.started_at) : "Never run"}
                  </td>
                  <td className="p-3">
                    <ProgressDots progress={progressByAgent.get(c.agent) ?? "idle"} />
                  </td>
                  <td className="p-3 text-xs">
                    {latest ? (
                      <>
                        <div>
                          written {latest.items_written ?? 0} · skipped {latest.items_skipped ?? 0}
                        </div>
                        <div>
                          llm {latest.llm_calls ?? 0} · ${dollars}
                        </div>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-3">
                    <Sparkline runs={last10} />
                  </td>
                  <td className="p-3">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!c.enabled}
                        disabled={busy === `toggle:${c.agent}`}
                        onChange={(e) => toggle(c.agent, e.target.checked)}
                      />
                      <span className="text-xs">{c.enabled ? "on" : "off"}</span>
                    </label>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => runNow(c.agent)}
                      disabled={busy === `run:${c.agent}`}
                      className="btn-ghost"
                    >
                      {busy === `run:${c.agent}` ? "Queueing" : "Run now"}
                    </button>
                  </td>
                </tr>
              );
            })}
            {configs.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-6 text-center meta">
                  No agents configured
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <section className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="serif text-xl">Recent runs log</h2>
          <p className="meta">Latest {Math.min(runs.length, 50)} runs across all agents</p>
        </div>
        <div className="border border-[var(--hairline)] overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface)] border-b border-[var(--hairline)]">
              <tr>
                <th className="text-left p-3 w-8"></th>
                <th className="text-left p-3">Agent</th>
                <th className="text-left p-3">Started</th>
                <th className="text-left p-3">Finished</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3">Written</th>
                <th className="text-right p-3">Skipped</th>
                <th className="text-right p-3">LLM</th>
                <th className="text-right p-3">Cost</th>
                <th className="text-left p-3">Error</th>
              </tr>
            </thead>
            <tbody>
              {runs.slice(0, 50).map((r) => {
                const dur =
                  r.started_at && r.finished_at
                    ? `${Math.max(
                        0,
                        Math.round(
                          (new Date(r.finished_at).getTime() - new Date(r.started_at).getTime()) /
                            1000,
                        ),
                      )}s`
                    : "";
                const isOpen = expanded.has(r.id);
                const hasDetail = !!(r.error || r.stack_trace || r.prompt_payload);
                const payloadStr = (() => {
                  try {
                    return r.prompt_payload ? JSON.stringify(r.prompt_payload, null, 2) : "";
                  } catch {
                    return String(r.prompt_payload);
                  }
                })();
                return (
                  <Fragment key={r.id}>
                    <tr className="border-b border-[var(--hairline)] align-top">
                      <td className="p-3">
                        <button
                          onClick={() => toggleExpanded(r.id)}
                          aria-expanded={isOpen}
                          aria-label={isOpen ? "Collapse details" : "Expand details"}
                          className="btn-ghost px-2 py-0.5 text-xs"
                        >
                          {isOpen ? "−" : "+"}
                        </button>
                      </td>
                      <td className="p-3 serif whitespace-nowrap">{r.agent}</td>
                      <td className="p-3 whitespace-nowrap">
                        {r.started_at ? formatDateTime(r.started_at) : "—"}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {r.finished_at ? `${formatDateTime(r.finished_at)} (${dur})` : "—"}
                      </td>
                      <td className="p-3">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="p-3 text-right">{r.items_written ?? 0}</td>
                      <td className="p-3 text-right">{r.items_skipped ?? 0}</td>
                      <td className="p-3 text-right">{r.llm_calls ?? 0}</td>
                      <td className="p-3 text-right">${((r.cost_cents ?? 0) / 100).toFixed(2)}</td>
                      <td className="p-3 text-xs text-[var(--ink-red)] whitespace-pre-wrap break-words max-w-md">
                        {r.error ? truncate(r.error, 160) : ""}
                      </td>
                    </tr>
                    {isOpen ? (
                      <tr className="border-b border-[var(--hairline)] bg-[var(--surface)]">
                        <td colSpan={10} className="p-4">
                          {hasDetail ? (
                            <div className="grid gap-4">
                              <div>
                                <p className="meta uppercase tracking-widest text-xs mb-1">
                                  Run id
                                </p>
                                <p className="font-mono text-xs break-all">{r.id}</p>
                              </div>
                              {r.error ? (
                                <div>
                                  <p className="meta uppercase tracking-widest text-xs mb-1">
                                    Error
                                  </p>
                                  <pre className="text-xs whitespace-pre-wrap break-words text-[var(--ink-red)]">
                                    {r.error}
                                  </pre>
                                </div>
                              ) : null}
                              {r.stack_trace ? (
                                <div>
                                  <p className="meta uppercase tracking-widest text-xs mb-1">
                                    Stack trace
                                  </p>
                                  <pre className="text-xs whitespace-pre-wrap break-words font-mono border border-[var(--hairline)] p-2 bg-background overflow-x-auto">
                                    {r.stack_trace}
                                  </pre>
                                </div>
                              ) : (
                                <p className="meta text-xs">
                                  No stack trace recorded. Worker must write agent_runs.stack_trace.
                                </p>
                              )}
                              {payloadStr ? (
                                <div>
                                  <p className="meta uppercase tracking-widest text-xs mb-1">
                                    Prompt / input payload
                                  </p>
                                  <pre className="text-xs whitespace-pre-wrap break-words font-mono border border-[var(--hairline)] p-2 bg-background overflow-x-auto">
                                    {payloadStr}
                                  </pre>
                                </div>
                              ) : (
                                <p className="meta text-xs">
                                  No prompt payload recorded. Worker must write
                                  agent_runs.prompt_payload.
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="meta text-xs">No additional detail.</p>
                          )}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
              {runs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-6 text-center meta">
                    No runs recorded yet
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="serif text-xl">Trigger audit</h2>
          <p className="meta">Latest {audit.length} Run All attempts</p>
        </div>
        <div className="border border-[var(--hairline)] overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface)] border-b border-[var(--hairline)]">
              <tr>
                <th className="text-left p-3">When</th>
                <th className="text-left p-3">Source</th>
                <th className="text-left p-3">Actor</th>
                <th className="text-left p-3">IP</th>
                <th className="text-right p-3">Queued</th>
                <th className="text-left p-3">Result</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((a) => (
                <tr key={a.id} className="border-b border-[var(--hairline)] align-top">
                  <td className="p-3 whitespace-nowrap">{formatDateTime(a.created_at)}</td>
                  <td className="p-3">{a.source}</td>
                  <td className="p-3 font-mono text-xs break-all">
                    {a.actor_email ??
                      (a.secret_hash ? `secret:${a.secret_hash.slice(0, 10)}…` : "—")}
                  </td>
                  <td className="p-3 font-mono text-xs">{a.ip ?? "—"}</td>
                  <td className="p-3 text-right">{a.agents_queued}</td>
                  <td className="p-3">
                    {a.ok ? (
                      <span className="text-[var(--ink)]">ok</span>
                    ) : (
                      <span className="text-[var(--ink-red)]">{a.error ?? "failed"}</span>
                    )}
                  </td>
                </tr>
              ))}
              {audit.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center meta">
                    No trigger attempts recorded yet
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function statusColor(s: string | null | undefined): { bg: string; fg: string; label: string } {
  switch (s) {
    case "ok":
      return { bg: "bg-[var(--ink)]", fg: "text-white", label: "ok" };
    case "skipped":
      return { bg: "bg-[var(--hairline)]", fg: "text-[var(--ink)]", label: "skipped" };
    case "partial":
      return {
        bg: "bg-[var(--surface)] border border-[var(--ink)]",
        fg: "text-[var(--ink)]",
        label: "partial",
      };
    case "error":
      return { bg: "bg-[var(--ink-red)]", fg: "text-white", label: "error" };
    case "running":
      return {
        bg: "bg-[var(--surface)] border border-[var(--ink-red)]",
        fg: "text-[var(--ink-red)]",
        label: "running",
      };
    case null:
    case undefined:
      return { bg: "bg-[var(--hairline)]", fg: "text-[var(--ink)]", label: "never run" };
    default:
      return { bg: "bg-[var(--hairline)]", fg: "text-[var(--ink)]", label: s ?? "—" };
  }
}

function StatusBadge({ status }: { status: string | null }) {
  const s = statusColor(status);
  return (
    <span
      className={`inline-block px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${s.bg} ${s.fg}`}
    >
      {s.label}
    </span>
  );
}

function Sparkline({ runs }: { runs: AgentRunRow[] }) {
  const ordered = [...runs].reverse();
  const slots = Array.from({ length: 10 }, (_, i) => ordered[i] ?? null);
  return (
    <div className="flex items-center gap-1">
      {slots.map((r, i) => {
        const c = statusColor(r?.status ?? null);
        return (
          <span
            key={i}
            title={
              r ? `${r.status} · ${r.started_at ? formatDateTime(r.started_at) : ""}` : "no run"
            }
            className={`inline-block w-2 h-4 ${r ? c.bg : "bg-[var(--hairline)]"}`}
          />
        );
      })}
    </div>
  );
}

function ProgressDots({ progress }: { progress: AgentProgress }) {
  const steps: Array<{ key: AgentProgress; label: string }> = [
    { key: "queued", label: "Queued" },
    { key: "running", label: "Running" },
    { key: "retrying", label: "Retrying" },
    { key: "done", label: "Done" },
  ];
  const activeIndex = steps.findIndex((s) => s.key === progress);
  return (
    <div className="flex items-center gap-2" aria-label={`Progress: ${progress}`}>
      {steps.map((s, i) => {
        const active = i === activeIndex;
        const passed = activeIndex >= 0 && i < activeIndex && progress === "done";
        const fill = active
          ? "bg-[var(--ink)]"
          : passed
            ? "bg-[var(--ink)]/40"
            : "bg-[var(--hairline)]";
        return (
          <span
            key={s.key}
            title={s.label}
            className={`inline-block w-2.5 h-2.5 rounded-full ${fill}`}
            aria-current={active ? "step" : undefined}
          />
        );
      })}
      <span className="meta text-xs ml-1 uppercase tracking-wider">
        {progress === "idle" ? "idle" : (steps[activeIndex]?.label.toLowerCase() ?? progress)}
      </span>
    </div>
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

function SourcesTab() {
  const [rows, setRows] = useState<SourceRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({ kind: "", url: "", is_active: true });
  const [editing, setEditing] = useState<Record<string, { kind: string; url: string }>>({});

  const load = useCallback(async () => {
    setErr(null);
    const { data, error } = await adminSupabase
      .from("sources")
      .select("id,city,kind,url,is_active")
      .eq("city", citySlug())
      .order("kind", { ascending: true });
    if (error) {
      setErr(error.message);
      setRows([]);
      return;
    }
    setRows((data ?? []) as SourceRow[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!draft.kind.trim() || !draft.url.trim()) return;
    setBusy(true);
    const { error } = await adminSupabase
      .from("sources")
      .insert([
        { city: citySlug(), kind: draft.kind.trim(), url: draft.url.trim(), is_active: draft.is_active },
      ]);
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setDraft({ kind: "", url: "", is_active: true });
    await load();
  }

  async function toggle(id: string, next: boolean) {
    const { error } = await adminSupabase
      .from("sources")
      .update({ is_active: next })
      .eq("city", citySlug())
      .eq("id", id);
    if (error) {
      setErr(error.message);
      return;
    }
    await load();
  }

  async function save(id: string) {
    const e = editing[id];
    if (!e) return;
    const { error } = await adminSupabase
      .from("sources")
      .update({ kind: e.kind.trim(), url: e.url.trim() })
      .eq("city", citySlug())
      .eq("id", id);
    if (error) {
      setErr(error.message);
      return;
    }
    setEditing((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    await load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this source?")) return;
    const { error } = await adminSupabase.from("sources").delete().eq("city", citySlug()).eq("id", id);
    if (error) {
      setErr(error.message);
      return;
    }
    await load();
  }

  if (!rows) return <p className="meta">Loading</p>;

  return (
    <div>
      {err ? <p className="text-sm text-[var(--ink-red)] mb-3">{err}</p> : null}
      <form
        onSubmit={add}
        className="border border-[var(--hairline)] p-4 mb-6 grid sm:grid-cols-[160px_1fr_auto_auto] gap-3 items-end bg-[var(--surface)]"
      >
        <label className="block">
          <span className="meta uppercase tracking-widest text-xs">Kind</span>
          <input
            value={draft.kind}
            onChange={(e) => setDraft((d) => ({ ...d, kind: e.target.value }))}
            placeholder="rss, sitemap, html"
            className="mt-1 w-full border border-[var(--hairline)] p-2 bg-background"
          />
        </label>
        <label className="block">
          <span className="meta uppercase tracking-widest text-xs">URL</span>
          <input
            value={draft.url}
            onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))}
            placeholder="https://example.com/feed.xml"
            className="mt-1 w-full border border-[var(--hairline)] p-2 bg-background font-mono text-xs"
          />
        </label>
        <label className="inline-flex items-center gap-2 pb-2">
          <input
            type="checkbox"
            checked={draft.is_active}
            onChange={(e) => setDraft((d) => ({ ...d, is_active: e.target.checked }))}
          />
          <span className="text-sm">Active</span>
        </label>
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? "Adding" : "Add source"}
        </button>
      </form>

      <div className="border border-[var(--hairline)] overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--surface)] border-b border-[var(--hairline)]">
            <tr>
              <th className="text-left p-3">Kind</th>
              <th className="text-left p-3">URL</th>
              <th className="text-left p-3">Active</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const e = editing[r.id];
              return (
                <tr key={r.id} className="border-b border-[var(--hairline)] align-top">
                  <td className="p-3">
                    {e ? (
                      <input
                        value={e.kind}
                        onChange={(ev) =>
                          setEditing((p) => ({ ...p, [r.id]: { ...e, kind: ev.target.value } }))
                        }
                        className="w-full border border-[var(--hairline)] p-1 bg-background"
                      />
                    ) : (
                      r.kind
                    )}
                  </td>
                  <td className="p-3 font-mono text-xs break-all">
                    {e ? (
                      <input
                        value={e.url}
                        onChange={(ev) =>
                          setEditing((p) => ({ ...p, [r.id]: { ...e, url: ev.target.value } }))
                        }
                        className="w-full border border-[var(--hairline)] p-1 bg-background"
                      />
                    ) : (
                      r.url
                    )}
                  </td>
                  <td className="p-3">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={r.is_active}
                        onChange={(ev) => toggle(r.id, ev.target.checked)}
                      />
                      <span className="text-xs">{r.is_active ? "on" : "off"}</span>
                    </label>
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    {e ? (
                      <>
                        <button onClick={() => save(r.id)} className="btn-ghost mr-2">
                          Save
                        </button>
                        <button
                          onClick={() =>
                            setEditing((p) => {
                              const n = { ...p };
                              delete n[r.id];
                              return n;
                            })
                          }
                          className="btn-ghost mr-2"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() =>
                          setEditing((p) => ({ ...p, [r.id]: { kind: r.kind, url: r.url } }))
                        }
                        className="btn-ghost mr-2"
                      >
                        Edit
                      </button>
                    )}
                    <button onClick={() => remove(r.id)} className="btn-ghost">
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-6 text-center meta">
                  No sources yet
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
