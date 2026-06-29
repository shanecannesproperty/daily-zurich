import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { useAdminSession } from "@/hooks/useAdminSession";
import { adminListComments, moderateComment, type CommentFilter } from "@/lib/admin-db";
import { formatDateTime } from "@/lib/date";

export const Route = createFileRoute("/admin/comments/")({
  ssr: false,
  component: CommentsModeration,
});

// Full admin row (admin reads select('*'), so all moderation columns are present).
// body + author_name are rendered as PLAIN TEXT only — NEVER dangerouslySetInnerHTML.
interface AdminCommentRow {
  id: string;
  city: string;
  article_id: string;
  author_name: string | null;
  body: string;
  status: string;
  author_hidden: boolean;
  flag_count: number;
  created_at: string;
}

const FILTERS: { key: CommentFilter; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "flagged", label: "Flagged" },
  { key: "approved", label: "Approved" },
  { key: "hidden", label: "Hidden" },
  { key: "rejected", label: "Rejected" },
];

function CommentsModeration() {
  const { email, isAdmin } = useAdminSession();
  const [filter, setFilter] = useState<CommentFilter>("pending");
  const [rows, setRows] = useState<AdminCommentRow[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setRows(null);
    const { data } = await adminListComments(filter);
    setRows((data ?? []) as AdminCommentRow[]);
  }, [isAdmin, filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(id: string, action: "approve" | "hide" | "reject" | "restore") {
    setBusyId(id);
    setError(null);
    try {
      const { error: rpcError } = await moderateComment(id, action);
      if (rpcError) throw new Error(rpcError.message);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not moderate this comment.");
    } finally {
      setBusyId(null);
    }
  }

  const showRestore = filter === "hidden" || filter === "rejected";

  return (
    <AdminShell title="Comments" email={email} activePath="/admin/comments">
      {error ? (
        <p className="mb-4 text-sm text-[var(--ink-red)]" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-[var(--hairline)]">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`px-4 py-2 text-sm border-b-2 ${
              filter === f.key ? "border-[var(--ink-red)]" : "border-transparent"
            }`}
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
              <th className="text-left p-3">Comment</th>
              <th className="text-left p-3">Author</th>
              <th className="text-left p-3">Article</th>
              <th className="text-left p-3">Flags</th>
              <th className="text-left p-3">When</th>
              <th className="text-left p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((r) => (
              <tr key={r.id} className="border-b border-[var(--hairline)] align-top">
                <td className="p-3 max-w-md">
                  {/* PLAIN TEXT render — never dangerouslySetInnerHTML */}
                  <div className="whitespace-pre-wrap">{r.body}</div>
                </td>
                <td className="p-3">{r.author_name ?? "Reader"}</td>
                <td className="p-3">
                  <a
                    href={`/article/${r.article_id}`}
                    className="underline"
                    target="_blank"
                    rel="noopener"
                  >
                    View
                  </a>
                </td>
                <td className="p-3">
                  {r.flag_count > 0 ? (
                    <span className="inline-block rounded bg-[var(--ink-red)] px-2 py-0.5 text-xs text-white">
                      {r.flag_count}
                    </span>
                  ) : (
                    <span className="meta">0</span>
                  )}
                </td>
                <td className="p-3 whitespace-nowrap">{formatDateTime(r.created_at)}</td>
                <td className="p-3">{r.status}</td>
                <td className="p-3 text-right whitespace-nowrap">
                  {showRestore ? (
                    <button
                      className="underline"
                      disabled={busyId === r.id}
                      onClick={() => act(r.id, "restore")}
                    >
                      Restore
                    </button>
                  ) : (
                    <span className="inline-flex gap-3">
                      <button
                        className="underline"
                        disabled={busyId === r.id}
                        onClick={() => act(r.id, "approve")}
                      >
                        Approve
                      </button>
                      <button
                        className="underline"
                        disabled={busyId === r.id}
                        onClick={() => act(r.id, "hide")}
                      >
                        Hide
                      </button>
                      <button
                        className="underline text-[var(--ink-red)]"
                        disabled={busyId === r.id}
                        onClick={() => act(r.id, "reject")}
                      >
                        Reject
                      </button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {rows && rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center meta">
                  No {filter} comments
                </td>
              </tr>
            ) : null}
            {!rows ? (
              <tr>
                <td colSpan={7} className="p-6 text-center meta">
                  Loading
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
