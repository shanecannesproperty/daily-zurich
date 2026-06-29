import { useCallback, useEffect, useMemo, useState } from "react";
import { adminSupabase } from "@/integrations/supabase/admin-client";
import { citySlug } from "@/lib/city";
import { formatDateTime } from "@/lib/date";
import { AgentRunHistory } from "./AgentRunHistory";

const HUNG_RUN_MS = 15 * 60 * 1000;
const POLL_MS = 5000;

type AgentConfigRow = {
  agent: string;
  enabled: boolean;
  run_now_requested_at: string | null;
  last_run_at: string | null;
  cancel_requested_at: string | null;
};
type AgentRunRow = {
  agent: string;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  error: string | null;
};
type AuditRow = {
  created_at: string;
  ok: boolean;
  agents_queued: number;
  error: string | null;
  actor_email: string | null;
  source: string | null;
  ip: string | null;
};

type Progress = "idle" | "queued" | "running" | "done" | "error" | "cancelled";

type LastFailure = {
  at: string;
  status: number;
  step?: string;
  error: string;
  raw: string;
};

export function AgentsStatusPanel() {
  const [configs, setConfigs] = useState<AgentConfigRow[]>([]);
  const [runs, setRuns] = useState<AgentRunRow[]>([]);
  const [lastAudit, setLastAudit] = useState<AuditRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [lastFailure, setLastFailure] = useState<LastFailure | null>(null);
  const [collapsed, setCollapsed] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [showFailure, setShowFailure] = useState(false);
  const [copied, setCopied] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [rerunBusy, setRerunBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [cfg, rs, au] = await Promise.all([
      adminSupabase
        .from("agent_config")
        .select("agent,enabled,run_now_requested_at,last_run_at,cancel_requested_at")
        .eq("city", citySlug())
        .order("agent"),
      adminSupabase
        .from("agent_runs")
        .select("agent,status,started_at,finished_at,error")
        .eq("city", citySlug())
        .order("started_at", { ascending: false })
        .limit(200),
      adminSupabase
        .from("agent_trigger_audit")
        .select("created_at,ok,agents_queued,error,actor_email,source,ip")
        .eq("city", citySlug())
        .order("created_at", { ascending: false })
        .limit(1),
    ]);
    if (!cfg.error) setConfigs((cfg.data ?? []) as AgentConfigRow[]);
    if (!rs.error) setRuns((rs.data ?? []) as AgentRunRow[]);
    if (!au.error) setLastAudit(((au.data ?? [])[0] as AuditRow) ?? null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const latestByAgent = useMemo(() => {
    const m = new Map<string, AgentRunRow>();
    for (const r of runs) if (!m.has(r.agent)) m.set(r.agent, r);
    return m;
  }, [runs]);

  const progress = useMemo(() => {
    const m = new Map<string, Progress>();
    const now = Date.now();
    for (const c of configs) {
      const latest = latestByAgent.get(c.agent);
      const queuedAt = c.run_now_requested_at ? new Date(c.run_now_requested_at).getTime() : 0;
      const startedAt = latest?.started_at ? new Date(latest.started_at).getTime() : 0;
      const cancelledAt = c.cancel_requested_at ? new Date(c.cancel_requested_at).getTime() : 0;
      if (latest?.status === "cancelled") {
        m.set(c.agent, "cancelled");
      } else if (latest?.status === "running" && startedAt && now - startedAt <= HUNG_RUN_MS) {
        m.set(c.agent, "running");
      } else if (queuedAt && queuedAt > startedAt) {
        // A pending cancel before the worker picks it up still shows as cancelled.
        m.set(c.agent, cancelledAt && cancelledAt >= queuedAt ? "cancelled" : "queued");
      } else if (latest?.status === "error") {
        m.set(c.agent, "error");
      } else if (latest) {
        m.set(c.agent, "done");
      } else {
        m.set(c.agent, "idle");
      }
    }
    return m;
  }, [configs, latestByAgent]);

  const anyActive = useMemo(
    () => [...progress.values()].some((p) => p === "queued" || p === "running"),
    [progress],
  );

  // Auto-refresh while a run is in progress, or while a trigger is mid-flight.
  useEffect(() => {
    if (!anyActive && !busy) return;
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(id);
  }, [anyActive, busy, load]);

  const errorRuns = useMemo(
    () => [...latestByAgent.values()].filter((r) => r.status === "error" && r.error),
    [latestByAgent],
  );

  // Last successful run duration (max finished_at, finished - started).
  const lastDurationMs = useMemo(() => {
    let best: { end: number; start: number } | null = null;
    for (const r of runs) {
      if (!r.finished_at || !r.started_at) continue;
      const end = new Date(r.finished_at).getTime();
      const start = new Date(r.started_at).getTime();
      if (!Number.isFinite(end) || !Number.isFinite(start) || end < start) continue;
      if (!best || end > best.end) best = { end, start };
    }
    return best ? best.end - best.start : null;
  }, [runs]);

  // Disable when our local request is in flight OR backend already running/queued.
  const runDisabled = busy || anyActive;

  async function runAll() {
    if (runDisabled) return;
    setBusy(true);
    setErr(null);
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
      const raw = await res.text();
      let body: Record<string, unknown> = {};
      try {
        body = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        /* keep raw */
      }
      if (!res.ok) {
        const message =
          res.status === 401
            ? "Unauthorised: your account does not have the admin role."
            : ((body.error as string | undefined) ?? `HTTP ${res.status}`);
        setErr(message);
        setLastFailure({
          at: new Date().toISOString(),
          status: res.status,
          step: body.step as string | undefined,
          error: message,
          raw,
        });
        setShowFailure(true);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setErr(message);
      setLastFailure({
        at: new Date().toISOString(),
        status: 0,
        error: message,
        raw: message,
      });
      setShowFailure(true);
    } finally {
      setBusy(false);
      void load();
    }
  }

  async function authHeader(): Promise<Record<string, string>> {
    const { data: sess } = await adminSupabase.auth.getSession();
    const token = sess.session?.access_token ?? "";
    return token ? { authorization: `Bearer ${token}` } : {};
  }

  async function rerunAgent(agent: string) {
    if (rerunBusy) return;
    setRerunBusy(agent);
    setErr(null);
    try {
      const headers = { "content-type": "application/json", ...(await authHeader()) };
      const res = await fetch("/api/admin/rerun-agent", {
        method: "POST", headers, body: JSON.stringify({ agent }),
      });
      const raw = await res.text();
      if (!res.ok) {
        let body: Record<string, unknown> = {};
        try { body = JSON.parse(raw) as Record<string, unknown>; } catch { /* keep raw */ }
        const message = res.status === 401
          ? "Unauthorised: your account does not have the admin role."
          : ((body.error as string | undefined) ?? `HTTP ${res.status}`);
        setErr(`${agent}: ${message}`);
        setLastFailure({
          at: new Date().toISOString(), status: res.status,
          step: body.step as string | undefined, error: message, raw,
        });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setErr(`${agent}: ${message}`);
    } finally {
      setRerunBusy(null);
      void load();
    }
  }

  async function cancelRun() {
    if (cancelBusy || !anyActive) return;
    setCancelBusy(true);
    setErr(null);
    try {
      const headers = { "content-type": "application/json", ...(await authHeader()) };
      const res = await fetch("/api/admin/cancel-agents", { method: "POST", headers, body: "{}" });
      const raw = await res.text();
      if (!res.ok) {
        let body: Record<string, unknown> = {};
        try { body = JSON.parse(raw) as Record<string, unknown>; } catch { /* keep raw */ }
        const message = res.status === 401
          ? "Unauthorised: your account does not have the admin role."
          : ((body.error as string | undefined) ?? `HTTP ${res.status}`);
        setErr(message);
        setLastFailure({
          at: new Date().toISOString(), status: res.status,
          step: body.step as string | undefined, error: message, raw,
        });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setErr(message);
    } finally {
      setCancelBusy(false);
      void load();
    }
  }

  const lastRunIso = useMemo(() => {
    let max = 0;
    for (const r of runs) {
      const t = r.started_at ? new Date(r.started_at).getTime() : 0;
      if (t > max) max = t;
    }
    return max ? new Date(max).toISOString() : null;
  }, [runs]);

  const counts = useMemo(() => {
    const c = { idle: 0, queued: 0, running: 0, done: 0, error: 0, cancelled: 0 } as Record<Progress, number>;
    for (const p of progress.values()) c[p]++;
    return c;
  }, [progress]);

  async function copyFailure() {
    if (!lastFailure) return;
    const text = formatFailureLog(lastFailure);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  function downloadFailure() {
    if (!lastFailure) return;
    const text = formatFailureLog(lastFailure);
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const ts = lastFailure.at.replace(/[:.]/g, "-");
    a.href = url;
    a.download = `run-all-agents-failure-${ts}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const runLabel = busy
    ? "Triggering…"
    : anyActive
      ? `Run in progress (${counts.running + counts.queued})`
      : "Run all agents";

  return (
    <div className="border-y border-[var(--hairline)] bg-[var(--surface)]">
      <div className="container-news py-2 flex flex-wrap items-center gap-3 text-xs">
        <span className="meta uppercase tracking-widest">Agents</span>
        <span>
          <Dot color={counts.running ? "amber" : counts.error ? "red" : "green"} /> running{" "}
          {counts.running} · queued {counts.queued} · errors {counts.error} · cancelled{" "}
          {counts.cancelled} · done {counts.done}
        </span>
        <span className="meta">Last run: {lastRunIso ? formatDateTime(lastRunIso) : "never"}</span>
        <span className="meta">
          Last duration: {lastDurationMs != null ? formatDuration(lastDurationMs) : "—"}
        </span>
        {lastAudit ? (
          <span className="meta">
            Last trigger: {formatDateTime(lastAudit.created_at)}{" "}
            {lastAudit.ok ? "ok" : "failed"} · by{" "}
            {lastAudit.actor_email ?? lastAudit.source ?? "unknown"}
            {lastAudit.ip ? ` (${lastAudit.ip})` : ""} · queued {lastAudit.agents_queued}
            {lastAudit.error ? ` · ${lastAudit.error}` : ""}
          </span>
        ) : null}
        {anyActive ? (
          <span className="meta uppercase tracking-widest px-2 py-0.5 border border-[var(--hairline)] bg-background">
            Auto-refreshing {POLL_MS / 1000}s
          </span>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setCollapsed((v) => !v)} className="btn-ghost text-xs">
            {collapsed ? "Show details" : "Hide details"}
          </button>
          <button onClick={() => setShowHistory((v) => !v)} className="btn-ghost text-xs">
            {showHistory ? "Hide history" : "Run history"}
          </button>
          <button onClick={() => void load()} className="btn-ghost text-xs">
            Refresh
          </button>
          {anyActive ? (
            <button
              onClick={cancelRun}
              disabled={cancelBusy}
              aria-busy={cancelBusy}
              title="Request cancellation of the in-progress run"
              className="btn-ghost text-xs border border-[var(--ink-red)] text-[var(--ink-red)] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {cancelBusy ? <Spinner /> : null}
              {cancelBusy ? "Cancelling…" : "Cancel run"}
            </button>
          ) : null}
          <button
            onClick={runAll}
            disabled={runDisabled}
            aria-busy={busy}
            title={
              anyActive
                ? "A run is already in progress. Wait for it to finish before triggering another."
                : "Trigger every enabled agent now"
            }
            className="btn-primary text-xs disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {busy || anyActive ? <Spinner /> : null}
            {runLabel}
          </button>
        </div>
      </div>
      {err ? (
        <div className="container-news pb-2 flex flex-wrap items-center gap-3">
          <p className="text-xs text-[var(--ink-red)]">{err}</p>
          {lastFailure ? (
            <button
              onClick={() => setShowFailure((v) => !v)}
              className="btn-ghost text-xs"
            >
              {showFailure ? "Hide failure log" : "View failure log"}
            </button>
          ) : null}
        </div>
      ) : null}
      {lastFailure && showFailure ? (
        <div className="container-news pb-3">
          <div className="border border-[var(--ink-red)] bg-background p-3">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="meta uppercase tracking-widest">
                Failure at {formatDateTime(lastFailure.at)}
              </span>
              <span className="meta">HTTP {lastFailure.status || "network"}</span>
              {lastFailure.step ? (
                <span className="meta">step: {lastFailure.step}</span>
              ) : null}
              <div className="ml-auto flex gap-2">
                <button onClick={copyFailure} className="btn-ghost text-xs">
                  {copied ? "Copied" : "Copy"}
                </button>
                <button onClick={downloadFailure} className="btn-ghost text-xs">
                  Download .txt
                </button>
                <button
                  onClick={() => {
                    setLastFailure(null);
                    setShowFailure(false);
                    setErr(null);
                  }}
                  className="btn-ghost text-xs"
                >
                  Dismiss
                </button>
              </div>
            </div>
            <pre className="text-xs font-mono whitespace-pre-wrap break-words max-h-64 overflow-auto">
              {formatFailureLog(lastFailure)}
            </pre>
          </div>
        </div>
      ) : null}
      {!collapsed ? (
        <div className="container-news pb-3">
          <div className="grid gap-1 md:grid-cols-2 lg:grid-cols-3 text-xs">
            {configs.map((c) => {
              const p = progress.get(c.agent) ?? "idle";
              const latest = latestByAgent.get(c.agent);
              const isBusyAgent = p === "queued" || p === "running";
              const isRerunning = rerunBusy === c.agent;
              return (
                <div
                  key={c.agent}
                  className="flex items-center gap-2 border border-[var(--hairline)] bg-background px-2 py-1"
                >
                  <Dot color={dotColor(p)} />
                  <span className="font-mono">{c.agent}</span>
                  <span className="meta ml-auto">{p}</span>
                  <span className="meta">
                    {latest?.started_at ? formatDateTime(latest.started_at) : "—"}
                  </span>
                  <button
                    onClick={() => rerunAgent(c.agent)}
                    disabled={!c.enabled || isBusyAgent || isRerunning || rerunBusy !== null}
                    title={
                      !c.enabled
                        ? "Agent is disabled"
                        : isBusyAgent
                          ? "Agent already queued or running"
                          : "Re-run only this agent"
                    }
                    className="btn-ghost text-[10px] uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1"
                  >
                    {isRerunning ? <Spinner /> : null}
                    {isRerunning ? "…" : "Rerun"}
                  </button>
                </div>
              );
            })}
          </div>
          {errorRuns.length > 0 ? (
            <details className="mt-2">
              <summary className="text-xs cursor-pointer text-[var(--ink-red)]">
                {errorRuns.length} agent{errorRuns.length === 1 ? "" : "s"} with errors
              </summary>
              <ul className="mt-1 space-y-1 text-xs">
                {errorRuns.map((r) => (
                  <li key={r.agent} className="font-mono break-words">
                    <strong>{r.agent}:</strong> {r.error}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}
      {showHistory ? (
        <div className="container-news pb-3">
          <AgentRunHistory />
        </div>
      ) : null}
    </div>
  );
}

function formatFailureLog(f: LastFailure) {
  return [
    `Time: ${f.at}`,
    `HTTP status: ${f.status || "network error"}`,
    f.step ? `Step: ${f.step}` : null,
    `Error: ${f.error}`,
    "",
    "Raw response:",
    f.raw,
  ]
    .filter(Boolean)
    .join("\n");
}

function formatDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 100) / 10;
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = Math.round(s - m * 60);
  return `${m}m ${rs}s`;
}

function dotColor(p: Progress): "green" | "amber" | "red" | "grey" {
  if (p === "running" || p === "queued") return "amber";
  if (p === "error") return "red";
  if (p === "done") return "green";
  return "grey";
}

function Dot({ color }: { color: "green" | "amber" | "red" | "grey" }) {
  const bg =
    color === "green"
      ? "#1a7f3c"
      : color === "amber"
        ? "#b8860b"
        : color === "red"
          ? "var(--ink-red)"
          : "#888";
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: 9999,
        background: bg,
      }}
    />
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: 10,
        height: 10,
        borderRadius: 9999,
        border: "2px solid currentColor",
        borderTopColor: "transparent",
        animation: "spin 0.8s linear infinite",
      }}
    />
  );
}
