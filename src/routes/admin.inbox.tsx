import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { useAdminSession } from "@/hooks/useAdminSession";
import { adminListSubscribers, adminListEnquiries, adminUpdateEnquiry } from "@/lib/admin-db";
import { formatDateTime } from "@/lib/date";
import type { EnquiryRow, SubscriberRow } from "@/lib/schema";

const STATUS_OPTIONS = ["new", "in_progress", "responded", "closed"];

export const Route = createFileRoute("/admin/inbox")({
  ssr: false,
  component: Inbox,
});

function Inbox() {
  const { email } = useAdminSession();
  const [tab, setTab] = useState<"enquiries" | "subscribers">("enquiries");
  const [subs, setSubs] = useState<SubscriberRow[] | null>(null);
  const [enqs, setEnqs] = useState<EnquiryRow[] | null>(null);

  async function loadEnqs() {
    const { data } = await adminListEnquiries();
    setEnqs(data ?? []);
  }
  async function loadSubs() {
    const { data } = await adminListSubscribers();
    setSubs(data ?? []);
  }

  useEffect(() => {
    if (!email) return;
    loadEnqs();
    loadSubs();
  }, [email]);

  async function update(id: string, patch: { status?: string; routed_to?: string | null }) {
    await adminUpdateEnquiry(id, patch);
    loadEnqs();
  }

  return (
    <AdminShell title="Inbox" email={email} activePath="/admin/inbox">
      <div className="flex gap-2 mb-6 border-b border-[var(--hairline)]">
        <button
          className={`px-4 py-2 text-sm border-b-2 ${tab === "enquiries" ? "border-[var(--ink-red)]" : "border-transparent"}`}
          onClick={() => setTab("enquiries")}
        >
          Enquiries {enqs ? `(${enqs.length})` : ""}
        </button>
        <button
          className={`px-4 py-2 text-sm border-b-2 ${tab === "subscribers" ? "border-[var(--ink-red)]" : "border-transparent"}`}
          onClick={() => setTab("subscribers")}
        >
          Subscribers {subs ? `(${subs.length})` : ""}
        </button>
      </div>

      {tab === "enquiries" ? (
        <div className="border border-[var(--hairline)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface)] border-b border-[var(--hairline)]">
              <tr>
                <th className="text-left p-3">Received</th>
                <th className="text-left p-3">Type</th>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Message</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Routed to</th>
              </tr>
            </thead>
            <tbody>
              {(enqs ?? []).map((r) => (
                <tr key={r.id} className="border-b border-[var(--hairline)] align-top">
                  <td className="p-3 whitespace-nowrap">{formatDateTime(r.created_at)}</td>
                  <td className="p-3">{r.enquiry_type ?? r.type ?? ""}</td>
                  <td className="p-3">{r.name ?? ""}</td>
                  <td className="p-3">
                    <a href={`mailto:${r.email}`} className="underline">
                      {r.email}
                    </a>
                  </td>
                  <td className="p-3 max-w-md">
                    <div className="whitespace-pre-wrap">{r.message ?? ""}</div>
                  </td>
                  <td className="p-3">
                    <select
                      className="field text-xs"
                      defaultValue={r.status ?? "new"}
                      onChange={(e) => update(r.id, { status: e.target.value })}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">
                    <input
                      className="field text-xs w-32"
                      defaultValue={r.routed_to ?? ""}
                      onBlur={(e) => update(r.id, { routed_to: e.target.value.trim() || null })}
                    />
                  </td>
                </tr>
              ))}
              {enqs && enqs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center meta">
                    No enquiries
                  </td>
                </tr>
              ) : null}
              {!enqs ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center meta">
                    Loading
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="border border-[var(--hairline)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface)] border-b border-[var(--hairline)]">
              <tr>
                <th className="text-left p-3">Subscribed</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Source</th>
                <th className="text-left p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {(subs ?? []).map((r) => (
                <tr key={r.id} className="border-b border-[var(--hairline)]">
                  <td className="p-3 whitespace-nowrap">{formatDateTime(r.created_at)}</td>
                  <td className="p-3">{r.email}</td>
                  <td className="p-3">{r.source ?? ""}</td>
                  <td className="p-3">{r.status ?? ""}</td>
                </tr>
              ))}
              {subs && subs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center meta">
                    No subscribers
                  </td>
                </tr>
              ) : null}
              {!subs ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center meta">
                    Loading
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
