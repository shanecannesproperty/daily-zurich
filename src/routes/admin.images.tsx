// Admin diagnostic: events that need a real cover image, plus the image
// acquisition pipeline trigger with real-time progress and CSV export.
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { useAdminSession } from "@/hooks/useAdminSession";
import { adminSupabase } from "@/integrations/supabase/admin-client";
import { citySlug, siteName } from "@/lib/city";
import { isRealCover } from "@/components/EventImage";
import {
  appendLog,
  failedEventIds as readFailedIds,
  latestByEvent,
  type LogEntry,
} from "@/lib/image-acquisition-log";

const ADMIN_EMAIL = "shane@spexperts.com.au";
const FALLBACK_MARKER = `${citySlug()}-fallback-tile`;

export const Route = createFileRoute("/admin/images")({
  ssr: false,
  head: () => ({
    meta: [
      { title: `Event images | Admin | ${siteName()}` },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ImagesPage,
});

type Row = {
  id: string;
  slug: string;
  title: string;
  start_at: string | null;
  source_url: string | null;
  image_url: string | null;
};

type Bucket = "missing" | "fallback" | "ok";

interface RunResponse {
  processed: number;
  updated: number;
  failed: number;
  remaining_needing: number;
  outcomes: LogEntry[];
}

interface Progress {
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  label: string;
}

function classify(r: Row): Bucket {
  if (!r.image_url || r.image_url.trim() === "") return "missing";
  if (r.image_url.toLowerCase().includes(FALLBACK_MARKER)) return "fallback";
  if (!isRealCover(r.image_url)) return "fallback";
  return "ok";
}

function csvEscape(value: string | null | undefined): string {
  const v = value ?? "";
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function downloadCsv(rows: Row[]) {
  const header = ["bucket", "id", "slug", "title", "start_at", "source_url", "image_url"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        classify(r),
        r.id,
        r.slug,
        csvEscape(r.title),
        r.start_at ?? "",
        csvEscape(r.source_url),
        csvEscape(r.image_url),
      ].join(","),
    );
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  a.href = url;
  a.download = `event-images-${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function ImagesPage() {
  const { email, loading } = useAdminSession();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [runResult, setRunResult] = useState<RunResponse | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [logVersion, setLogVersion] = useState(0);

  const load = useCallback(async () => {
    setErr(null);
    const { data, error } = await adminSupabase
      .from("events")
      .select("id,slug,title,start_at,source_url,image_url")
      .eq("city", citySlug())
      .order("start_at", { ascending: true })
      .limit(1000);
    if (error) {
      setErr(error.message);
      setRows([]);
      return;
    }
    setRows((data ?? []) as Row[]);
  }, []);

  useEffect(() => {
    if (email === ADMIN_EMAIL) load();
  }, [email, load]);

  const logIndex = useMemo(() => latestByEvent(), [logVersion]);

  async function callAcquire(body: Record<string, unknown>): Promise<RunResponse> {
    const { data } = await adminSupabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("No session token");
    const res = await fetch("/api/admin/acquire-images", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await res.json();
    if (!res.ok) throw new Error(payload?.error ?? `HTTP ${res.status}`);
    const r = payload as RunResponse;
    if (r.outcomes?.length) {
      appendLog(r.outcomes);
      setLogVersion((v) => v + 1);
    }
    return r;
  }

  async function runAcquisition() {
    setBusy(true);
    setErr(null);
    setRunResult(null);
    const total = (rows ?? []).filter((r) => classify(r) !== "ok").slice(0, 25).length;
    setProgress({ total, processed: 0, succeeded: 0, failed: 0, label: "Running batch" });
    try {
      const payload = await callAcquire({ limit: 25 });
      setRunResult(payload);
      setProgress({
        total: payload.processed,
        processed: payload.processed,
        succeeded: payload.updated,
        failed: payload.failed,
        label: "Done",
      });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function runAcquisitionAll() {
    setBusy(true);
    setErr(null);
    setRunResult(null);
    const initialTotal = (rows ?? []).filter((r) => classify(r) !== "ok").length;
    let processed = 0,
      succeeded = 0,
      failed = 0;
    const allOutcomes: LogEntry[] = [];
    setProgress({ total: initialTotal, processed: 0, succeeded: 0, failed: 0, label: "Starting" });
    try {
      for (let pass = 1; pass <= 50; pass++) {
        const payload = await callAcquire({ limit: 25 });
        processed += payload.processed;
        succeeded += payload.updated;
        failed += payload.failed;
        allOutcomes.push(...payload.outcomes);
        const total = Math.max(initialTotal, processed + payload.remaining_needing);
        setProgress({
          total,
          processed,
          succeeded,
          failed,
          label: `Pass ${pass}. ${payload.remaining_needing} remaining.`,
        });
        if (payload.processed === 0 || payload.remaining_needing === 0) {
          setRunResult({
            processed,
            updated: succeeded,
            failed,
            remaining_needing: payload.remaining_needing,
            outcomes: allOutcomes,
          });
          setProgress((p) => (p ? { ...p, label: "Done" } : p));
          break;
        }
      }
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function runFailedOnly() {
    const ids = readFailedIds();
    if (ids.length === 0) {
      setErr("No previously failed events in the local log.");
      return;
    }
    setBusy(true);
    setErr(null);
    setRunResult(null);
    setProgress({
      total: ids.length,
      processed: 0,
      succeeded: 0,
      failed: 0,
      label: "Retrying failed",
    });
    let processed = 0,
      succeeded = 0,
      failed = 0;
    const allOutcomes: LogEntry[] = [];
    try {
      const chunkSize = 25;
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const payload = await callAcquire({ event_ids: chunk, limit: chunkSize });
        processed += payload.processed;
        succeeded += payload.updated;
        failed += payload.failed;
        allOutcomes.push(...payload.outcomes);
        setProgress({
          total: ids.length,
          processed,
          succeeded,
          failed,
          label: `Chunk ${Math.floor(i / chunkSize) + 1}`,
        });
      }
      setRunResult({
        processed,
        updated: succeeded,
        failed,
        remaining_needing: 0,
        outcomes: allOutcomes,
      });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function acquireOne(id: string) {
    setBusy(true);
    setErr(null);
    try {
      const payload = await callAcquire({ event_id: id, force: true });
      setRunResult(payload);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

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
      <AdminShell title="Event images" email={email} activePath="/admin/images">
        <div className="border border-[var(--hairline)] p-8 bg-[var(--surface)]">
          <p className="meta uppercase tracking-widest mb-2">Access denied</p>
          <p>This control panel is restricted to the platform owner.</p>
        </div>
      </AdminShell>
    );
  }

  const missing = (rows ?? []).filter((r) => classify(r) === "missing");
  const fallback = (rows ?? []).filter((r) => classify(r) === "fallback");
  const ok = (rows ?? []).filter((r) => classify(r) === "ok");
  const failedInLog = readFailedIds().length;

  const pct =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.processed / progress.total) * 100))
      : 0;

  return (
    <AdminShell title="Event images" email={email} activePath="/admin/images">
      {err ? <p className="text-sm text-red-700 mb-3">{err}</p> : null}

      <div className="grid grid-cols-3 gap-px bg-[var(--hairline)] border border-[var(--hairline)] mb-6">
        <Stat label="Missing or empty" value={missing.length} />
        <Stat label="Branded fallback" value={fallback.length} />
        <Stat label="Has real photo" value={ok.length} />
      </div>

      <div className="flex flex-wrap items-center justify-between mb-4 gap-3">
        <p className="meta">{rows ? `${rows.length} events scanned` : "Loading"}</p>
        <div className="flex flex-wrap gap-2">
          <a href="/admin/image-log" className="btn-ghost">
            View log
          </a>
          <button onClick={() => rows && downloadCsv(rows)} disabled={!rows} className="btn-ghost">
            Export CSV
          </button>
          <button
            onClick={runFailedOnly}
            disabled={busy || failedInLog === 0}
            className="btn-ghost"
          >
            Retry failed ({failedInLog})
          </button>
          <button onClick={runAcquisition} disabled={busy} className="btn-ghost">
            {busy ? "Working" : "Run batch (25)"}
          </button>
          <button onClick={runAcquisitionAll} disabled={busy} className="btn-primary">
            {busy ? "Working" : "Process ALL until done"}
          </button>
          <button onClick={load} disabled={busy} className="btn-ghost">
            Refresh
          </button>
        </div>
      </div>

      {progress ? (
        <div className="mb-6 border border-[var(--hairline)] bg-[var(--surface)] p-4">
          <div className="flex justify-between text-sm mb-2">
            <span>{progress.label}</span>
            <span className="font-mono">
              {progress.processed}/{progress.total} ({pct}%) - {progress.succeeded} ok,{" "}
              {progress.failed} failed
            </span>
          </div>
          <div className="h-2 bg-background border border-[var(--hairline)]" aria-hidden>
            <div className="h-full bg-[var(--ink)] transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      ) : null}

      {runResult ? (
        <div className="mb-6 border border-[var(--hairline)] bg-[var(--surface)] p-4">
          <p className="meta uppercase tracking-widest mb-2">Last run</p>
          <p className="text-sm">
            Processed {runResult.processed}, updated {runResult.updated}, failed {runResult.failed}.
            Still needing covers: {runResult.remaining_needing}.
          </p>
        </div>
      ) : null}

      <Section
        title="Missing or empty image_url"
        rows={missing}
        onAcquire={acquireOne}
        busy={busy}
        logIndex={logIndex}
      />
      <Section
        title="Branded fallback tile"
        rows={fallback}
        onAcquire={acquireOne}
        busy={busy}
        logIndex={logIndex}
      />
      <Section
        title="Has a real photo"
        rows={ok}
        onAcquire={acquireOne}
        busy={busy}
        logIndex={logIndex}
        collapsible
      />
    </AdminShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-background p-4">
      <p className="meta uppercase tracking-widest">{label}</p>
      <p className="serif text-3xl mt-1">{value}</p>
    </div>
  );
}

function Section({
  title,
  rows,
  onAcquire,
  busy,
  logIndex,
  collapsible = false,
}: {
  title: string;
  rows: Row[];
  onAcquire: (id: string) => void | Promise<void>;
  busy: boolean;
  logIndex: Map<string, LogEntry>;
  collapsible?: boolean;
}) {
  const body = (
    <div className="border border-[var(--hairline)] overflow-x-auto mt-2">
      <table className="w-full text-sm">
        <thead className="bg-[var(--surface)] border-b border-[var(--hairline)]">
          <tr>
            <th className="text-left p-3">Title</th>
            <th className="text-left p-3">Start</th>
            <th className="text-left p-3">Source</th>
            <th className="text-left p-3">image_url</th>
            <th className="text-left p-3">Candidates seen</th>
            <th className="p-3"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const log = logIndex.get(r.id);
            return (
              <tr key={r.id} className="border-b border-[var(--hairline)] align-top">
                <td className="p-3">
                  <a href={`/event/${r.slug}`} className="underline">
                    {r.title}
                  </a>
                </td>
                <td className="p-3 text-xs whitespace-nowrap">{r.start_at?.slice(0, 16) ?? "—"}</td>
                <td className="p-3 font-mono text-xs break-all max-w-[20ch]">
                  {r.source_url ? (
                    <a
                      href={r.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      open
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-3 font-mono text-xs break-all max-w-[30ch]">
                  {r.image_url ? (
                    <a
                      href={r.image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      {r.image_url}
                    </a>
                  ) : (
                    <span className="meta">null</span>
                  )}
                </td>
                <td className="p-3 font-mono text-xs break-all max-w-[32ch]">
                  {log && log.candidates.length > 0 ? (
                    <ul className="space-y-1">
                      {log.candidates.map((c, i) => (
                        <li key={i}>
                          <span className="meta mr-1">{c.kind}:</span>
                          <a
                            href={c.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            {c.url.slice(0, 60)}
                            {c.url.length > 60 ? "…" : ""}
                          </a>
                          {c.accepted ? <span className="meta ml-1">[used]</span> : null}
                          {c.reject_reason ? (
                            <span className="meta ml-1">[{c.reject_reason}]</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : log ? (
                    <span className="meta">
                      {log.status}
                      {log.detail ? ` (${log.detail})` : ""}
                    </span>
                  ) : (
                    <span className="meta">—</span>
                  )}
                </td>
                <td className="p-3 text-right whitespace-nowrap">
                  <button
                    onClick={() => onAcquire(r.id)}
                    disabled={busy}
                    className="btn-ghost text-xs"
                  >
                    Acquire
                  </button>
                </td>
              </tr>
            );
          })}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="p-6 text-center meta">
                None
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );

  return (
    <section className="mb-8">
      {collapsible ? (
        <details>
          <summary className="cursor-pointer h2-news text-xl">
            {title} ({rows.length})
          </summary>
          {body}
        </details>
      ) : (
        <>
          <h2 className="h2-news text-xl">
            {title} ({rows.length})
          </h2>
          {body}
        </>
      )}
    </section>
  );
}
