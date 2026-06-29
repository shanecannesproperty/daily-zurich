import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { useAdminSession } from "@/hooks/useAdminSession";
import { adminList } from "@/lib/admin-db";
import { CATEGORY_LABELS, type ArticleRow } from "@/lib/schema";
import { formatDate } from "@/lib/date";

export const Route = createFileRoute("/admin/articles/")({
  ssr: false,
  component: ArticlesList,
});

function ArticlesList() {
  const { email } = useAdminSession();
  const [rows, setRows] = useState<ArticleRow[] | null>(null);

  useEffect(() => {
    if (!email) return;
    adminList("articles", { col: "created_at", asc: false }).then(({ data }) =>
      setRows(data ?? []),
    );
  }, [email]);

  return (
    <AdminShell title="Articles" email={email} activePath="/admin/articles">
      <div className="flex items-center justify-between mb-4">
        <p className="meta">{rows ? `${rows.length} total` : "Loading"}</p>
        <Link to="/admin/articles/new" className="btn-primary">
          New article
        </Link>
      </div>
      <div className="border border-[var(--hairline)]">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--hairline)] bg-[var(--surface)]">
            <tr>
              <th className="text-left p-3">Title</th>
              <th className="text-left p-3">Section</th>
              <th className="text-left p-3">Author</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Published</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((r) => (
              <tr key={r.id} className="border-b border-[var(--hairline)]">
                <td className="p-3 serif">{r.title}</td>
                <td className="p-3">
                  {CATEGORY_LABELS[r.category as keyof typeof CATEGORY_LABELS] ?? r.category}
                </td>
                <td className="p-3">
                  {r.author ?? <span className="text-[var(--ink-red)]">missing</span>}
                </td>
                <td className="p-3">{r.is_published ? "Published" : "Draft"}</td>
                <td className="p-3">{formatDate(r.published_at)}</td>
                <td className="p-3 text-right">
                  <Link to="/admin/articles/$id" params={{ id: r.id }} className="underline">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {rows && rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center meta">
                  No articles yet
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
