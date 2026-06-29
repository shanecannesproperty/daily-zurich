import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { useAdminSession } from "@/hooks/useAdminSession";
import { adminList } from "@/lib/admin-db";
import type { EventRow } from "@/lib/schema";
import { formatDateTime } from "@/lib/date";

export const Route = createFileRoute("/admin/events/")({
  ssr: false,
  component: EventsList,
});

function EventsList() {
  const { email } = useAdminSession();
  const [rows, setRows] = useState<EventRow[] | null>(null);
  useEffect(() => {
    if (!email) return;
    adminList("events", { col: "start_at", asc: true }).then(({ data }) => setRows(data ?? []));
  }, [email]);
  return (
    <AdminShell title="Events" email={email} activePath="/admin/events">
      <div className="flex items-center justify-between mb-4">
        <p className="meta">{rows ? `${rows.length} total` : "Loading"}</p>
        <Link to="/admin/events/new" className="btn-primary">
          New event
        </Link>
      </div>
      <div className="border border-[var(--hairline)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--surface)] border-b border-[var(--hairline)]">
            <tr>
              <th className="text-left p-3">Title</th>
              <th className="text-left p-3">When</th>
              <th className="text-left p-3">Venue</th>
              <th className="text-left p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((r) => (
              <tr key={r.id} className="border-b border-[var(--hairline)]">
                <td className="p-3 serif">{r.title}</td>
                <td className="p-3">{formatDateTime(r.start_at)}</td>
                <td className="p-3">{r.venue ?? ""}</td>
                <td className="p-3">{r.is_published ? "Published" : "Draft"}</td>
                <td className="p-3 text-right">
                  <Link to="/admin/events/$id" params={{ id: r.id }} className="underline">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {rows && rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center meta">
                  No events yet
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
