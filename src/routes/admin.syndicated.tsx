import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { useAdminSession } from "@/hooks/useAdminSession";
import {
  adminApproveCommentary,
  adminListSources,
  adminListSyndicated,
  adminRejectCommentary,
  adminSaveCommentaryDraft,
  adminSetStoryStatus,
  adminToggleSource,
} from "@/lib/admin-syndication";
import { adminRunRssIngest } from "@/lib/syndication-admin.functions";
import type {
  CommentaryStatus,
  SyndicatedStatus,
  SyndicatedStoryWithSource,
  SyndicationSource,
} from "@/lib/syndication";
import { formatShortDate, timeAgo } from "@/lib/date";

export const Route = createFileRoute("/admin/syndicated")({
  ssr: false,
  component: AdminSyndicated,
});

type Filter = SyndicatedStatus | "all" | "pending";
const FILTERS: Filter[] = ["all", "live", "featured", "hidden", "pending"];

function AdminSyndicated() {
  const { email } = useAdminSession();
  const [filter, setFilter] = useState<Filter>("all");
  const [rows, setRows] = useState<SyndicatedStoryWithSource[] | null>(null);
  const [sources, setSources] = useState<SyndicationSource[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [ingesting, setIngesting] = useState(false);
  const [ingestResult, setIngestResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    setRows(null);
    const [s, src] = await Promise.all([
      filter === "pending"
        ? adminListSyndicated("all", 200)
        : adminListSyndicated(filter as SyndicatedStatus | "all", 200),
      adminListSources(),
    ]);
    let items = (s.data ?? []) as unknown as SyndicatedStoryWithSource[];
    if (filter === "pending") {
      items = items.filter((r) => r.commentary_status === "pending");
    }
    setRows(items);
    setSources((src.data ?? []) as unknown as SyndicationSource[]);
  }, [filter]);

  useEffect(() => {
    if (!email) return;
    load();
  }, [email, load]);

  async function setStatus(id: string, status: SyndicatedStatus) {
    setBusy(id);
    await adminSetStoryStatus(id, status);
    setBusy(null);
    load();
  }

  async function saveDraft(id: string, value: string) {
    setBusy(id);
    await adminSaveCommentaryDraft(id, value);
    setBusy(null);
    load();
  }

  async function approve(id: string, draft: string) {
    setBusy(id);
    await adminApproveCommentary(id, draft);
    setBusy(null);
    load();
  }

  async function reject(id: string) {
    setBusy(id);
    await adminRejectCommentary(id);
    setBusy(null);
    load();
  }

  async function toggleSource(id: string, active: boolean) {
    await adminToggleSource(id, active);
    load();
  }

  async function runIngest() {
    setIngesting(true);
    setIngestResult(null);
    try {
      const json = await adminRunRssIngest();
      const total = (json.results ?? []).reduce(
        (n: number, r: any) => n + (r.inserted ?? 0),
        0,
      );
      setIngestResult(
        `Fetched ${total} new items across ${json.results?.length ?? 0} feeds.`,
      );
      load();
    } catch (e: any) {
      setIngestResult(`Ingest failed: ${e?.message ?? e}`);
    } finally {
      setIngesting(false);
    }
  }

  const pendingCount =
    rows?.filter((r) => r.commentary_status === "pending").length ?? 0;

  return (
    <AdminShell title="Syndicated review queue" email={email} activePath="/admin/syndicated">
      {/* Feed fetch status panel */}
      <section className="mb-8 border border-[var(--hairline)] bg-[var(--surface)] p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <p className="meta uppercase tracking-widest">Feed fetch status</p>
          <button onClick={runIngest} disabled={ingesting} className="btn-primary">
            {ingesting ? "Fetching" : "Fetch feeds now"}
          </button>
        </div>
        {ingestResult && <p className="meta mb-3">{ingestResult}</p>}
        {!sources ? (
          <p className="meta">Loading sources</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-[var(--hairline)]">
                  <th className="py-2 pr-4 meta uppercase tracking-widest font-normal">Source</th>
                  <th className="py-2 pr-4 meta uppercase tracking-widest font-normal">Last fetch</th>
                  <th className="py-2 pr-4 meta uppercase tracking-widest font-normal text-right">Found</th>
                  <th className="py-2 pr-4 meta uppercase tracking-widest font-normal text-right">New</th>
                  <th className="py-2 pr-4 meta uppercase tracking-widest font-normal">Status</th>
                  <th className="py-2 meta uppercase tracking-widest font-normal text-right">Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--hairline)]">
                {sources.map((s) => (
                  <tr key={s.id} className="align-top">
                    <td className="py-3 pr-4">
                      <div className="font-semibold">{s.name}</div>
                      <div className="meta truncate max-w-[18rem]">{s.feed_url}</div>
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      {s.last_fetched_at ? (
                        <>
                          <div>{timeAgo(s.last_fetched_at)}</div>
                          <div className="meta">{formatShortDate(s.last_fetched_at)}</div>
                        </>
                      ) : (
                        <span className="meta">never</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums">
                      {s.last_fetched_count ?? "—"}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums">
                      {s.last_inserted_count ?? "—"}
                    </td>
                    <td className="py-3 pr-4">
                      {s.last_error ? (
                        <span className="text-[var(--ink-red)]">{s.last_error}</span>
                      ) : (
                        <span className="meta">OK</span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={s.active}
                          onChange={(e) => toggleSource(s.id, e.target.checked)}
                        />
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`btn-ghost ${filter === f ? "underline" : ""}`}
          >
            {f}
            {f === "pending" && pendingCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center min-w-[1.25rem] px-1.5 text-xs bg-[var(--ink-red)] text-white">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {!rows ? (
        <p className="meta">Loading stories</p>
      ) : rows.length === 0 ? (
        <p className="meta">No stories match this filter yet.</p>
      ) : (
        <ul className="divide-y divide-[var(--hairline)]">
          {rows.map((r) => (
            <StoryRow
              key={r.id}
              row={r}
              busy={busy === r.id}
              onStatus={(s) => setStatus(r.id, s)}
              onSaveDraft={(v) => saveDraft(r.id, v)}
              onApprove={(d) => approve(r.id, d)}
              onReject={() => reject(r.id)}
            />
          ))}
        </ul>
      )}
    </AdminShell>
  );
}

function statusBadge(s: CommentaryStatus) {
  if (s === "pending")
    return (
      <span className="ml-2 inline-block px-1.5 text-xs bg-[var(--ink-red)] text-white uppercase tracking-widest">
        pending
      </span>
    );
  if (s === "published")
    return <span className="ml-2 meta uppercase tracking-widest">published</span>;
  return null;
}

function StoryRow({
  row,
  busy,
  onStatus,
  onSaveDraft,
  onApprove,
  onReject,
}: {
  row: SyndicatedStoryWithSource;
  busy: boolean;
  onStatus: (s: SyndicatedStatus) => void;
  onSaveDraft: (v: string) => void;
  onApprove: (draft: string) => void;
  onReject: () => void;
}) {
  // Draft input is seeded from the pending draft if any, else the published
  // commentary, so editors can iterate without losing the live copy.
  const initial = row.commentary_draft ?? row.commentary ?? "";
  const [draft, setDraft] = useState(initial);
  const [open, setOpen] = useState(row.commentary_status === "pending");

  return (
    <li className="py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="meta uppercase tracking-widest">
            {row.source?.name ?? "Source"} ·{" "}
            <time>{formatShortDate(row.source_published_at ?? row.fetched_at)}</time> ·{" "}
            <span className="text-[var(--ink-red)]">{row.status}</span>
            {statusBadge(row.commentary_status)}
          </p>
          <h3 className="h3-card mt-1">
            <a href={`/story/${row.slug}`} className="no-underline hover:underline">
              {row.title}
            </a>
          </h3>
          {row.dek && <p className="meta mt-1 line-clamp-2">{row.dek}</p>}
          <p className="meta mt-1">
            <a href={row.link} target="_blank" rel="noopener nofollow" className="underline">
              Original
            </a>
            {" · "}
            <a href={`/story/${row.slug}`} className="underline">
              Our page
            </a>
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            disabled={busy || row.status === "live"}
            onClick={() => onStatus("live")}
            className="btn-ghost"
          >
            Show
          </button>
          <button
            disabled={busy || row.status === "featured"}
            onClick={() => onStatus("featured")}
            className="btn-ghost"
          >
            Feature
          </button>
          <button
            disabled={busy || row.status === "hidden"}
            onClick={() => onStatus("hidden")}
            className="btn-ghost text-[var(--ink-red)]"
          >
            Hide
          </button>
          <button onClick={() => setOpen((v) => !v)} className="btn-ghost">
            {open ? "Close" : "Commentary"}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-3">
          {row.commentary && (
            <div className="mb-3 border-l-2 border-[var(--hairline)] pl-3">
              <p className="meta uppercase tracking-widest">Currently live</p>
              <p className="text-sm whitespace-pre-wrap">{row.commentary}</p>
            </div>
          )}

          <textarea
            className="field w-full"
            rows={4}
            placeholder="Draft commentary on this story. Saving marks it pending for approval before it appears to readers."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />

          <div className="mt-2 flex flex-wrap justify-end gap-2">
            <button
              onClick={() => {
                setDraft(initial);
                setOpen(false);
              }}
              className="btn-ghost"
            >
              Cancel
            </button>
            {row.commentary_status === "pending" && (
              <button onClick={onReject} disabled={busy} className="btn-ghost text-[var(--ink-red)]">
                Reject draft
              </button>
            )}
            <button
              onClick={() => onSaveDraft(draft)}
              disabled={busy || draft.trim() === (row.commentary_draft ?? "").trim()}
              className="btn-ghost"
            >
              {busy ? "Saving" : "Save draft"}
            </button>
            <button
              onClick={() => onApprove(draft.trim())}
              disabled={busy || !draft.trim()}
              className="btn-primary"
            >
              {row.commentary_status === "pending" ? "Approve & publish" : "Publish now"}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
