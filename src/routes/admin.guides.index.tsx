import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { useAdminSession } from "@/hooks/useAdminSession";
import { adminList } from "@/lib/admin-db";
import type { GuideRow } from "@/lib/schema";

export const Route = createFileRoute("/admin/guides/")({
  ssr: false,
  component: GuidesList,
});

function GuidesList() {
  const { email } = useAdminSession();
  const [rows, setRows] = useState<GuideRow[] | null>(null);
  useEffect(() => {
    if (!email) return;
    adminList("guides").then(({ data }) => setRows(data ?? []));
  }, [email]);
  return (
    <AdminShell title="Best-of guides" email={email} activePath="/admin/guides">
      <div className="flex items-center justify-between mb-4">
        <p className="meta">{rows ? `${rows.length} total` : "Loading"}</p>
        <Link to="/admin/guides/new" className="btn-primary">
          New guide
        </Link>
      </div>
      <div className="border border-[var(--hairline)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--surface)] border-b border-[var(--hairline)]">
            <tr>
              <th className="text-left p-3">Title</th>
              <th className="text-left p-3">Category</th>
              <th className="text-left p-3">Slug</th>
              <th className="text-left p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((r) => (
              <tr key={r.id} className="border-b border-[var(--hairline)]">
                <td className="p-3 serif">{r.title}</td>
                <td className="p-3">{r.category}</td>
                <td className="p-3">{r.slug}</td>
                <td className="p-3">{r.is_published ? "Published" : "Draft"}</td>
                <td className="p-3 text-right">
                  <Link to="/admin/guides/$id" params={{ id: r.id }} className="underline">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {rows && rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center meta">
                  No guides yet
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
