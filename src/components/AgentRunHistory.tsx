import { useEffect, useState } from "react";
import { adminSupabase } from "@/integrations/supabase/admin-client";
import { citySlug } from "@/lib/city";
import { formatDateTime } from "@/lib/date";

type AuditRow = {
  id: string;
  created_at: string;
  ok: boolean;
  agents_queued: number;
  error: string | null;
  actor_email: string | null;
  source: string | null;
  ip: string | null;
};

type RunRow = {
  agent: string;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  error: string | null;
};

const PAGE_SIZE = 10;

export function AgentRunHistory() {
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [logRows, setLogRows] = useState<RunRow[]>([]);
  const [logBusy, setLogBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const res = await adminSupabase
        .from("agent_trigger_audit")
        .select("id,created_at,ok,agents_queued,error,actor_email,source,ip", { count: "exact" })
        .eq("city", citySlug())
        .order("created_at", { ascending: false })
        .range(from, to);
      if (cancelled) return;
      if (!res.error) {
        setRows((res.data ?? []) as AuditRow[]);
        if (typeof res.count === "number") setCount(res.count);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [page]);

  async function toggleLogs(row: AuditRow) {
    if (openId === row.id) { setOpenId(null); setLogRows([]); return; }
    setOpenId(row.id);
    setLogBusy(true);
    // Fetch runs started within a 5-minute window after the trigger.
    const start = new Date(row.created_at).toISOString();
    const endIso = new Date(new Date(row.created_at).getTime() + 5 * 60 * 1000).toISOString();
    const res = await adminSupabase
      .from("agent_runs")
      .select("agent,status,started_at,finished_at,error")
      .eq("city", citySlug())
      .gte("started_at", start)
      .lte("started_at", endIso)
      .order("started_at", { ascending: true });
    if (!res.error) setLogRows((res.data ?? []) as RunRow[]);
    setLogBusy(false);
  }

  const totalPages = count != null ? Math.max(1, Math.ceil(count / PAGE_SIZE)) : null;

  return (
    <div className="mt-3 border border-[var(--hairline)] bg-background p-3">
      <div className="flex items-center gap-3 mb-2">
        <span className="meta uppercase tracking-widest">Run history</span>
        {count != null ? <span className="meta">{count} total triggers</span> : null}
        <div className="ml-auto flex items-center gap-2 text-xs">
          <button
            className="btn-ghost text-xs"
            disabled={page === 0 || loading}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            ← Prev
          </button>
          <span className="meta">
            Page {page + 1}{totalPages ? ` / ${totalPages}` : ""}
          </span>
          <button
            className="btn-ghost text-xs"
            disabled={loading || (totalPages != null && page + 1 >= totalPages)}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="text-left border-b border-[var(--hairline)]">
              <th className="py-1 pr-3">Start</th>
              <th className="py-1 pr-3">Duration</th>
              <th className="py-1 pr-3">Initiator</th>
              <th className="py-1 pr-3">Queued</th>
              <th className="py-1 pr-3">Status</th>
              <th className="py-1 pr-3">Logs</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading ? (
              <tr><td colSpan={6} className="py-2 meta">No runs recorded.</td></tr>
            ) : null}
            {rows.map((r) => (
              <RowItem key={r.id} row={r} open={openId === r.id} onToggle={() => toggleLogs(r)} />
            ))}
          </tbody>
        </table>
      </div>
      {openId && logBusy ? <p className="meta text-xs mt-2">Loading logs…</p> : null}
      {openId && !logBusy ? (
        <div className="mt-2 border-t border-[var(--hairline)] pt-2">
          <p className="meta text-xs mb-1">
            Per-agent runs within 5 min of trigger ({logRows.length}):
          </p>
          {logRows.length === 0 ? (
            <p className="meta text-xs">No agent_runs rows in that window.</p>
          ) : (
            <ul className="text-xs space-y-1">
              {logRows.map((lr, i) => (
                <li key={i} className="font-mono break-words">
                  <strong>{lr.agent}</strong> [{lr.status}]{" "}
                  {lr.started_at ? formatDateTime(lr.started_at) : "—"}
                  {lr.finished_at ? ` → ${formatDateTime(lr.finished_at)}` : ""}
                  {lr.error ? <span className="text-[var(--ink-red)]"> · {lr.error}</span> : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

function RowItem({ row, open, onToggle }: { row: AuditRow; open: boolean; onToggle: () => void }) {
  // Duration is unknown for the trigger itself (audit only stores creation
  // time). We display "—" and rely on the logs panel for per-agent durations.
  return (
    <tr className="border-b border-[var(--hairline)]/60">
      <td className="py-1 pr-3 whitespace-nowrap">{formatDateTime(row.created_at)}</td>
      <td className="py-1 pr-3">—</td>
      <td className="py-1 pr-3">
        {row.actor_email ?? row.source ?? "unknown"}
        {row.ip ? <span className="meta"> ({row.ip})</span> : null}
      </td>
      <td className="py-1 pr-3">{row.agents_queued}</td>
      <td className="py-1 pr-3">
        {row.ok ? <span style={{ color: "#1a7f3c" }}>ok</span> : (
          <span style={{ color: "var(--ink-red)" }}>{row.error ?? "failed"}</span>
        )}
      </td>
      <td className="py-1 pr-3">
        <button className="btn-ghost text-xs" onClick={onToggle}>
          {open ? "Hide" : "View"}
        </button>
      </td>
    </tr>
  );
}
