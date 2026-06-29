// Persistent log of image acquisition attempts (browser-local).
// Records each event's candidate images, accept/reject reasons and timestamps.
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { useAdminSession } from "@/hooks/useAdminSession";
import { clearLog, readLog, type LogEntry } from "@/lib/image-acquisition-log";
import { siteName } from "@/lib/city";

const ADMIN_EMAIL = "shane@spexperts.com.au";

export const Route = createFileRoute("/admin/image-log")({
  ssr: false,
  head: () => ({
    meta: [
      { title: `Image acquisition log | Admin | ${siteName()}` },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LogPage,
});

function csvEscape(v: string | null | undefined) {
  const s = v ?? "";
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportCsv(entries: LogEntry[]) {
  const header = [
    "ts",
    "status",
    "title",
    "slug",
    "source_url",
    "image_url",
    "detail",
    "candidates",
  ];
  const lines = [header.join(",")];
  for (const e of entries) {
    const cands = e.candidates
      .map(
        (c) =>
          `${c.kind}=${c.url}${c.accepted ? "[used]" : c.reject_reason ? `[${c.reject_reason}]` : ""}`,
      )
      .join(" | ");
    lines.push(
      [
        e.ts,
        e.status,
        csvEscape(e.title),
        e.slug,
        csvEscape(e.source_url),
        csvEscape(e.image_url ?? ""),
        csvEscape(e.detail ?? ""),
        csvEscape(cands),
      ].join(","),
    );
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `image-acquisition-log-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function LogPage() {
  const { email, loading } = useAdminSession();
  const [filter, setFilter] = useState<string>("all");
  const [version, setVersion] = useState(0);
  const entries = useMemo(() => readLog(), [version]);

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
      <AdminShell title="Image acquisition log" email={email} activePath="/admin/images">
        <div className="border border-[var(--hairline)] p-8 bg-[var(--surface)]">
          <p className="meta uppercase tracking-widest mb-2">Access denied</p>
        </div>
      </AdminShell>
    );
  }

  const filtered = filter === "all" ? entries : entries.filter((e) => e.status === filter);
  const counts = entries.reduce<Record<string, number>>((acc, e) => {
    acc[e.status] = (acc[e.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <AdminShell title="Image acquisition log" email={email} activePath="/admin/images">
      <p className="meta mb-4">Stored in this browser's local storage. {entries.length} entries.</p>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap gap-2 items-center">
          <label className="meta uppercase tracking-widest">Status</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-[var(--hairline)] bg-background p-1 text-sm"
          >
            <option value="all">all ({entries.length})</option>
            {Object.entries(counts).map(([k, v]) => (
              <option key={k} value={k}>
                {k} ({v})
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <a href="/admin/images" className="btn-ghost">
            Back to images
          </a>
          <button
            onClick={() => exportCsv(filtered)}
            disabled={filtered.length === 0}
            className="btn-ghost"
          >
            Export CSV
          </button>
          <button
            onClick={() => {
              if (confirm("Clear the local log?")) {
                clearLog();
                setVersion((v) => v + 1);
              }
            }}
            className="btn-ghost"
          >
            Clear log
          </button>
        </div>
      </div>

      <div className="border border-[var(--hairline)] overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--surface)] border-b border-[var(--hairline)]">
            <tr>
              <th className="text-left p-3">When</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Event</th>
              <th className="text-left p-3">Source</th>
              <th className="text-left p-3">Accepted image</th>
              <th className="text-left p-3">Candidates</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e, i) => (
              <tr
                key={`${e.id}-${e.ts}-${i}`}
                className="border-b border-[var(--hairline)] align-top"
              >
                <td className="p-3 text-xs whitespace-nowrap">
                  {e.ts.replace("T", " ").slice(0, 19)}
                </td>
                <td className="p-3">
                  <span className="font-mono text-xs">{e.status}</span>
                  {e.detail ? <div className="meta text-xs mt-1">{e.detail}</div> : null}
                </td>
                <td className="p-3">
                  <a href={`/event/${e.slug}`} className="underline">
                    {e.title}
                  </a>
                </td>
                <td className="p-3 font-mono text-xs break-all max-w-[20ch]">
                  {e.source_url ? (
                    <a
                      href={e.source_url}
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
                <td className="p-3 font-mono text-xs break-all max-w-[28ch]">
                  {e.image_url ? (
                    <a
                      href={e.image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      {e.image_url}
                    </a>
                  ) : (
                    <span className="meta">—</span>
                  )}
                </td>
                <td className="p-3 font-mono text-xs break-all max-w-[36ch]">
                  {e.candidates.length === 0 ? (
                    <span className="meta">none</span>
                  ) : (
                    <ul className="space-y-1">
                      {e.candidates.map((c, j) => (
                        <li key={j}>
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
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center meta">
                  No entries
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
