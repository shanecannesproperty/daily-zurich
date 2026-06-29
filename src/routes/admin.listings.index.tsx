import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { useAdminSession } from "@/hooks/useAdminSession";
import { adminList } from "@/lib/admin-db";
import type { ListingRow } from "@/lib/schema";

export const Route = createFileRoute("/admin/listings/")({
  ssr: false,
  component: ListingsList,
});

function ListingsList() {
  const { email } = useAdminSession();
  const [rows, setRows] = useState<ListingRow[] | null>(null);
  useEffect(() => {
    if (!email) return;
    adminList("listings").then(({ data }) => setRows(data ?? []));
  }, [email]);
  return (
    <AdminShell title="Directory listings" email={email} activePath="/admin/listings">
      <div className="flex items-center justify-between mb-4">
        <p className="meta">{rows ? `${rows.length} total` : "Loading"}</p>
        <Link to="/admin/listings/new" className="btn-primary">
          New listing
        </Link>
      </div>
      <div className="border border-[var(--hairline)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--surface)] border-b border-[var(--hairline)]">
            <tr>
              <th className="text-left p-3">Business</th>
              <th className="text-left p-3">Category</th>
              <th className="text-left p-3">Suburb</th>
              <th className="text-left p-3">Flags</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((r) => (
              <tr key={r.id} className="border-b border-[var(--hairline)]">
                <td className="p-3 serif">{r.business_name}</td>
                <td className="p-3">{r.category ?? ""}</td>
                <td className="p-3">{r.suburb ?? ""}</td>
                <td className="p-3">
                  {r.is_featured ? "Featured " : ""}
                  {r.is_sponsored ? "Sponsored" : ""}
                </td>
                <td className="p-3 text-right">
                  <Link to="/admin/listings/$id" params={{ id: r.id }} className="underline">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {rows && rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center meta">
                  No listings yet
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
