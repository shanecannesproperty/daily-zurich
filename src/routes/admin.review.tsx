import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { useAdminSession } from "@/hooks/useAdminSession";
import {
  adminListArticlesByReview,
  adminListGuidesByReview,
  adminListObituarySubmissions,
  adminPublishObituary,
  adminRejectObituarySubmission,
  reviewArticle,
  reviewGuide,
} from "@/lib/admin-db";
import { CATEGORY_LABELS, OBITUARY_NOTICE_LABELS, type ArticleRow, type GuideRow } from "@/lib/schema";
import { formatDateTime } from "@/lib/date";

export const Route = createFileRoute("/admin/review")({
  ssr: false,
  component: ReviewQueue,
});

const FILTERS: { key: string; label: string }[] = [
  { key: "held", label: "Held for review" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

const TABS = [
  { key: "articles", label: "Articles & guides" },
  { key: "obituaries", label: "Death notices" },
];

type ReviewItem = {
  kind: "article" | "guide";
  id: string;
  title: string;
  dek: string | null;
  category: string;
  risk_reason: string | null;
  reviewed_by: string | null;
  created_at: string;
};

type ObituarySubmission = {
  id: string;
  city: string;
  full_name: string;
  preferred_name: string | null;
  date_of_death: string | null;
  age: number | null;
  suburb: string | null;
  notice_type: string;
  body_text: string | null;
  service_details: string | null;
  funeral_director: string | null;
  submitter_name: string;
  submitter_email: string;
  submitter_phone: string | null;
  submitter_relationship: string | null;
  status: string;
  admin_notes: string | null;
  linked_obituary_id: string | null;
  created_at: string;
};

function articleToItem(r: ArticleRow): ReviewItem {
  return {
    kind: "article",
    id: r.id,
    title: r.title,
    dek: r.dek,
    category: CATEGORY_LABELS[r.category as keyof typeof CATEGORY_LABELS] ?? r.category,
    risk_reason: r.risk_reason ?? null,
    reviewed_by: r.reviewed_by ?? null,
    created_at: r.created_at,
  };
}

function guideToItem(r: GuideRow): ReviewItem {
  return {
    kind: "guide",
    id: r.id,
    title: r.title,
    dek: r.meta_description,
    category: r.category,
    risk_reason: r.risk_reason ?? null,
    reviewed_by: r.reviewed_by ?? null,
    created_at: r.created_at ?? "",
  };
}

function ArticlesTab() {
  const { email, isAdmin } = useAdminSession();
  const [filter, setFilter] = useState<string>("held");
  const [rows, setRows] = useState<ReviewItem[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setRows(null);
    const [arts, guides] = await Promise.all([
      adminListArticlesByReview(filter),
      adminListGuidesByReview(filter),
    ]);
    const items = [
      ...((arts.data ?? []) as ArticleRow[]).map(articleToItem),
      ...((guides.data ?? []) as GuideRow[]).map(guideToItem),
    ].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    setRows(items);
  }, [isAdmin, filter]);

  useEffect(() => { load(); }, [load]);

  async function act(item: ReviewItem, action: "approve" | "reject") {
    setBusyId(item.id);
    setError(null);
    try {
      const { error: updErr } =
        item.kind === "article"
          ? await reviewArticle(item.id, action, email ?? null)
          : await reviewGuide(item.id, action, email ?? null);
      if (updErr) throw new Error(updErr.message);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update this item.");
    } finally {
      setBusyId(null);
    }
  }

  const isHeld = filter === "held";

  return (
    <>
      <p className="meta mb-4 max-w-2xl">
        Every article and guide passes an automated editorial screen before publishing. Pieces that
        name a person or organisation in a sensitive context are held here until you approve them.
      </p>
      {error && <p className="mb-4 text-sm text-[var(--ink-red)]" role="alert">{error}</p>}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-[var(--hairline)]">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`px-4 py-2 text-sm border-b-2 ${filter === f.key ? "border-[var(--ink-red)]" : "border-transparent"}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="border border-[var(--hairline)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--surface)] border-b border-[var(--hairline)]">
            <tr>
              <th className="text-left p-3">Title</th>
              <th className="text-left p-3">Type</th>
              <th className="text-left p-3">Section</th>
              <th className="text-left p-3">Why held</th>
              <th className="text-left p-3">Created</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((r) => (
              <tr key={`${r.kind}:${r.id}`} className="border-b border-[var(--hairline)] align-top">
                <td className="p-3 serif max-w-sm">
                  {r.kind === "article" ? (
                    <Link to="/admin/articles/$id" params={{ id: r.id }} className="underline">{r.title}</Link>
                  ) : (
                    <Link to="/admin/guides/$id" params={{ id: r.id }} className="underline">{r.title}</Link>
                  )}
                  {r.dek ? <div className="meta mt-1">{r.dek}</div> : null}
                </td>
                <td className="p-3 capitalize whitespace-nowrap">{r.kind}</td>
                <td className="p-3 whitespace-nowrap">{r.category}</td>
                <td className="p-3 max-w-xs">
                  {r.risk_reason ? <span className="text-[var(--ink-red)]">{r.risk_reason}</span> : <span className="meta">—</span>}
                  {r.reviewed_by ? <div className="meta mt-1">{filter === "approved" ? "Approved" : "Reviewed"} by {r.reviewed_by}</div> : null}
                </td>
                <td className="p-3 whitespace-nowrap">{r.created_at ? formatDateTime(r.created_at) : "—"}</td>
                <td className="p-3 text-right whitespace-nowrap">
                  {isHeld ? (
                    <span className="inline-flex gap-3">
                      <button className="underline" disabled={busyId === r.id} onClick={() => act(r, "approve")}>Approve &amp; publish</button>
                      <button className="underline text-[var(--ink-red)]" disabled={busyId === r.id} onClick={() => act(r, "reject")}>Reject</button>
                    </span>
                  ) : filter === "rejected" ? (
                    <button className="underline" disabled={busyId === r.id} onClick={() => act(r, "approve")}>Approve &amp; publish</button>
                  ) : (
                    <span className="meta">Published</span>
                  )}
                </td>
              </tr>
            ))}
            {rows && rows.length === 0 ? <tr><td colSpan={6} className="p-6 text-center meta">Nothing {isHeld ? "held for review" : filter}</td></tr> : null}
            {!rows ? <tr><td colSpan={6} className="p-6 text-center meta">Loading</td></tr> : null}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ObituariesTab() {
  const { isAdmin } = useAdminSession();
  const [subs, setSubs] = useState<ObituarySubmission[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setSubs(null);
    const { data, error: err } = await adminListObituarySubmissions();
    if (err) { setError(err.message); return; }
    setSubs((data ?? []) as ObituarySubmission[]);
  }, [isAdmin]);

  useEffect(() => { load(); }, [load]);

  async function approve(sub: ObituarySubmission) {
    setBusyId(sub.id);
    setError(null);
    try {
      const { error: err } = await adminPublishObituary(sub);
      if (err) throw new Error(err.message);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not publish notice.");
    } finally {
      setBusyId(null);
    }
  }

  async function reject(sub: ObituarySubmission) {
    setBusyId(sub.id);
    setError(null);
    try {
      const { error: err } = await adminRejectObituarySubmission(sub.id);
      if (err) throw new Error(err.message);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reject submission.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <p className="meta mb-4 max-w-2xl">
        Death notice submissions from families and funeral directors. Read each notice carefully
        before approving. Publishing creates a public obituary page and is not reversible without
        direct DB access.
      </p>
      {error && <p className="mb-4 text-sm text-[var(--ink-red)]" role="alert">{error}</p>}
      <div className="border border-[var(--hairline)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--surface)] border-b border-[var(--hairline)]">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Type</th>
              <th className="text-left p-3">City</th>
              <th className="text-left p-3">Submitted by</th>
              <th className="text-left p-3">Received</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {(subs ?? []).map((s) => (
              <>
                <tr key={s.id} className="border-b border-[var(--hairline)] align-top">
                  <td className="p-3 serif font-medium">
                    <button className="underline text-left" onClick={() => setExpanded(expanded === s.id ? null : s.id)}>
                      {s.full_name}
                      {s.preferred_name ? ` (${s.preferred_name})` : ""}
                    </button>
                    <div className="meta mt-1">
                      {s.age != null ? `Aged ${s.age}` : ""}
                      {s.age != null && s.suburb ? " · " : ""}
                      {s.suburb ?? ""}
                      {(s.age != null || s.suburb) && s.date_of_death ? " · " : ""}
                      {s.date_of_death ? `Died ${s.date_of_death}` : ""}
                    </div>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {OBITUARY_NOTICE_LABELS[s.notice_type as keyof typeof OBITUARY_NOTICE_LABELS] ?? s.notice_type}
                  </td>
                  <td className="p-3 capitalize whitespace-nowrap">{s.city}</td>
                  <td className="p-3">
                    <div>{s.submitter_name}</div>
                    <div className="meta">{s.submitter_email}</div>
                    {s.submitter_phone && <div className="meta">{s.submitter_phone}</div>}
                    {s.submitter_relationship && <div className="meta italic">{s.submitter_relationship}</div>}
                  </td>
                  <td className="p-3 whitespace-nowrap">{formatDateTime(s.created_at)}</td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <span className="inline-flex gap-3">
                      <button
                        className="underline"
                        disabled={busyId === s.id}
                        onClick={() => approve(s)}
                      >
                        Approve &amp; publish
                      </button>
                      <button
                        className="underline text-[var(--ink-red)]"
                        disabled={busyId === s.id}
                        onClick={() => reject(s)}
                      >
                        Reject
                      </button>
                    </span>
                  </td>
                </tr>
                {expanded === s.id && (
                  <tr className="border-b border-[var(--hairline)] bg-[var(--surface)]">
                    <td colSpan={6} className="p-4">
                      {s.body_text && (
                        <div className="mb-3">
                          <p className="kicker mb-1">Notice text</p>
                          <p className="serif whitespace-pre-wrap">{s.body_text}</p>
                        </div>
                      )}
                      {s.service_details && (
                        <div className="mb-3">
                          <p className="kicker mb-1">Service details</p>
                          <p className="serif whitespace-pre-wrap">{s.service_details}</p>
                        </div>
                      )}
                      {s.funeral_director && (
                        <div>
                          <p className="kicker mb-1">Funeral director</p>
                          <p className="serif">{s.funeral_director}</p>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
            {subs && subs.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center meta">No pending death notice submissions</td></tr>
            )}
            {!subs && (
              <tr><td colSpan={6} className="p-6 text-center meta">Loading</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ReviewQueue() {
  const { email } = useAdminSession();
  const [tab, setTab] = useState<string>("articles");

  return (
    <AdminShell title="Editorial review" email={email} activePath="/admin/review">
      <div className="mb-6 flex gap-4 border-b border-[var(--hairline)]">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === t.key ? "border-[var(--ink-red)]" : "border-transparent text-[var(--ink-muted)]"
            }`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "articles" ? <ArticlesTab /> : <ObituariesTab />}
    </AdminShell>
  );
}
