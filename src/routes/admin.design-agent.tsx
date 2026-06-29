import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { useAdminSession } from "@/hooks/useAdminSession";
import { adminSupabase } from "@/integrations/supabase/admin-client";
import { siteName } from "@/lib/city";

export const Route = createFileRoute("/admin/design-agent")({
  ssr: false,
  head: () => ({
    meta: [{ title: `Design Agent | ${siteName()}` }, { name: "robots", content: "noindex" }],
  }),
  component: DesignAgentPage,
});

type Proposal = {
  id: string;
  run_id: string | null;
  area: string;
  page_path: string | null;
  severity: string;
  risk: string;
  issue: string;
  proposed_fix: string;
  benchmark_ref: string | null;
  css_patch: { token_name?: string; new_value?: string } | null;
  status: string;
  created_at: string;
  screenshot_before: string | null;
  screenshot_after: string | null;
};
type Run = {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  findings_count: number;
  applied_count: number;
  pending_count: number;
  benchmark_targets: string[];
  error: string | null;
};
type TokenRow = {
  token_name: string;
  current_value: string;
  default_value: string;
  unit: string | null;
  min_value: string | null;
  max_value: string | null;
  locked: boolean;
  description: string | null;
};
type History = {
  id: string;
  token_name: string;
  old_value: string;
  new_value: string;
  created_at: string;
  reverted_at: string | null;
  run_id: string | null;
};

function DesignAgentPage() {
  const { email } = useAdminSession();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [history, setHistory] = useState<History[]>([]);
  const [running, setRunning] = useState(false);
  const [filter, setFilter] = useState<"pending_review" | "auto_applied" | "all">("pending_review");

  async function load() {
    if (!email) return;
    const [p, r, t, h] = await Promise.all([
      adminSupabase
        .from("design_proposals")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      adminSupabase
        .from("design_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(20),
      adminSupabase.from("design_tokens").select("*").order("locked").order("token_name"),
      adminSupabase
        .from("design_token_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    setProposals((p.data as Proposal[]) ?? []);
    setRuns((r.data as Run[]) ?? []);
    setTokens((t.data as TokenRow[]) ?? []);
    setHistory((h.data as History[]) ?? []);
  }

  useEffect(() => {
    void load();
  }, [email]);

  async function triggerNow() {
    setRunning(true);
    try {
      const res = await fetch("/api/public/agent/design-refine", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          // The secret is server-only; for ad-hoc admin triggers we use a
          // separate trigger endpoint or rely on the cron. Here we just nudge
          // by hitting a no-op until the admin trigger route exists.
        },
        body: JSON.stringify({ source: "admin-manual" }),
      });
      if (res.status === 401) {
        alert(
          "Agent runs hourly via cron. Manual trigger requires the secret; check Settings to add one.",
        );
      }
    } finally {
      setRunning(false);
      void load();
    }
  }

  async function setProposalStatus(id: string, status: "approved" | "rejected") {
    await adminSupabase
      .from("design_proposals")
      .update({
        status,
        reviewed_by: email,
        applied_at: status === "approved" ? new Date().toISOString() : null,
      })
      .eq("id", id);
    void load();
  }

  async function revertHistory(historyId: string) {
    await adminSupabase.rpc("revert_design_token", {
      _history_id: historyId,
      _actor: email ?? "admin",
    });
    void load();
  }

  const filteredProposals = proposals.filter((p) =>
    filter === "all" ? true : p.status === filter,
  );

  return (
    <AdminShell title="Design Agent" email={email} activePath="/admin/design-agent">
      <section className="grid gap-4 sm:grid-cols-4 mb-8">
        {[
          { label: "Runs (20)", value: runs.length },
          {
            label: "Pending proposals",
            value: proposals.filter((p) => p.status === "pending_review").length,
          },
          {
            label: "Auto-applied",
            value: proposals.filter((p) => p.status === "auto_applied").length,
          },
          {
            label: "Active token tweaks",
            value: tokens.filter((t) => !t.locked && t.current_value !== t.default_value).length,
          },
        ].map((c) => (
          <div key={c.label} className="border border-[var(--hairline)] p-4">
            <p className="meta uppercase tracking-widest">{c.label}</p>
            <p className="serif text-3xl mt-2">{c.value}</p>
          </div>
        ))}
      </section>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <button className="btn-primary" onClick={triggerNow} disabled={running}>
          {running ? "Triggering" : "Trigger run now"}
        </button>
        <button className="btn-ghost" onClick={() => load()}>
          Refresh
        </button>
        <span className="meta ml-auto">Runs hourly via pg_cron</span>
      </div>

      <h2 className="h2-news mt-6 mb-3">Proposals</h2>
      <div className="flex gap-2 mb-3">
        {(["pending_review", "auto_applied", "all"] as const).map((f) => (
          <button
            key={f}
            data-active={filter === f}
            onClick={() => setFilter(f)}
            className="nav-link"
          >
            {f.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="border border-[var(--hairline)]">
        {filteredProposals.length === 0 ? (
          <p className="meta p-4">No proposals.</p>
        ) : (
          filteredProposals.map((p) => (
            <article key={p.id} className="border-b border-[var(--hairline)] p-4 last:border-b-0">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="kicker">{p.severity}</span>
                <span className="meta">{p.risk}</span>
                <span className="meta">{p.page_path ?? "—"}</span>
                <span className="meta">{p.area}</span>
                <span className="meta ml-auto">
                  {new Date(p.created_at).toLocaleString("en-AU")}
                </span>
              </div>
              <p className="mt-2 font-medium">{p.issue}</p>
              <p className="dek mt-1">{p.proposed_fix}</p>
              {p.benchmark_ref && <p className="meta mt-1">Inspired by: {p.benchmark_ref}</p>}
              {p.css_patch?.token_name && (
                <p className="meta mt-1 font-mono">
                  {p.css_patch.token_name} → {p.css_patch.new_value}
                </p>
              )}
              <div className="mt-3 flex gap-2">
                <span className="meta border border-[var(--hairline)] px-2 py-1">{p.status}</span>
                {p.status === "pending_review" && (
                  <>
                    <button
                      className="btn-ghost"
                      onClick={() => setProposalStatus(p.id, "approved")}
                    >
                      Approve
                    </button>
                    <button
                      className="btn-ghost"
                      onClick={() => setProposalStatus(p.id, "rejected")}
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            </article>
          ))
        )}
      </div>

      <h2 className="h2-news mt-10 mb-3">Active token tweaks</h2>
      <div className="border border-[var(--hairline)] overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--surface)]">
            <tr>
              <th className="text-left p-2">Token</th>
              <th className="text-left p-2">Default</th>
              <th className="text-left p-2">Current</th>
              <th className="text-left p-2">Range</th>
              <th className="text-left p-2">Locked</th>
            </tr>
          </thead>
          <tbody>
            {tokens.map((t) => (
              <tr key={t.token_name} className="border-t border-[var(--hairline)]">
                <td className="p-2 font-mono">{t.token_name}</td>
                <td className="p-2">{t.default_value}</td>
                <td className="p-2 font-medium">{t.current_value}</td>
                <td className="p-2 meta">
                  {t.min_value ?? ""}–{t.max_value ?? ""} {t.unit ?? ""}
                </td>
                <td className="p-2">{t.locked ? "yes" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="h2-news mt-10 mb-3">Token history</h2>
      <div className="border border-[var(--hairline)]">
        {history.length === 0 ? (
          <p className="meta p-4">No changes yet.</p>
        ) : (
          history.map((h) => (
            <div
              key={h.id}
              className="border-b border-[var(--hairline)] p-3 flex flex-wrap items-baseline gap-2 last:border-b-0"
            >
              <span className="meta">{new Date(h.created_at).toLocaleString("en-AU")}</span>
              <span className="font-mono">{h.token_name}</span>
              <span className="meta">
                {h.old_value} → <strong>{h.new_value}</strong>
              </span>
              <span className="ml-auto">
                {h.reverted_at ? (
                  <span className="meta">reverted</span>
                ) : (
                  <button className="btn-ghost" onClick={() => revertHistory(h.id)}>
                    Revert
                  </button>
                )}
              </span>
            </div>
          ))
        )}
      </div>

      <h2 className="h2-news mt-10 mb-3">Recent runs</h2>
      <div className="border border-[var(--hairline)]">
        {runs.map((r) => (
          <div
            key={r.id}
            className="border-b border-[var(--hairline)] p-3 flex flex-wrap items-baseline gap-2 last:border-b-0"
          >
            <span className="meta">{new Date(r.started_at).toLocaleString("en-AU")}</span>
            <span className="meta">{r.status}</span>
            <span className="meta">
              {r.findings_count} findings · {r.applied_count} applied · {r.pending_count} pending
            </span>
            <span className="meta">Benchmarks: {r.benchmark_targets.join(", ")}</span>
            {r.error && <span className="meta text-[var(--ink-red)]">{r.error}</span>}
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
