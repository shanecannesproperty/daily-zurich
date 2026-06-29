import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { useAdminSession } from "@/hooks/useAdminSession";
import { siteName } from "@/lib/city";
import { formatDateTime } from "@/lib/date";
import {
  runDomainHealth,
  type DomainHealthResult,
  type HostResult,
} from "@/lib/domain-health.functions";

const ADMIN_EMAIL = "shane@spexperts.com.au";

export const Route = createFileRoute("/admin/domain-health")({
  ssr: false,
  head: () => ({
    meta: [
      { title: `Domain health | Admin | ${siteName()}` },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DomainHealthPage,
});

function DomainHealthPage() {
  const { email, loading } = useAdminSession();
  const [result, setResult] = useState<DomainHealthResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recheck = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const data = await runDomainHealth();
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (email === ADMIN_EMAIL) recheck();
  }, [email, recheck]);

  if (loading) {
    return (
      <AdminShell title="Domain health" email={email} activePath="/admin/domain-health">
        <p className="meta">Loading.</p>
      </AdminShell>
    );
  }

  if (email !== ADMIN_EMAIL) {
    return (
      <AdminShell title="Domain health" email={email} activePath="/admin/domain-health">
        <p className="meta">This page is restricted to the platform owner.</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Domain health" email={email} activePath="/admin/domain-health">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <p className="meta uppercase tracking-widest">Live check</p>
          <p className="text-sm">
            Last checked:{" "}
            {result ? formatDateTime(result.checkedAt) : busy ? "Checking." : "Not run yet."}
          </p>
        </div>
        <button onClick={recheck} disabled={busy} className="btn-primary">
          {busy ? "Checking." : "Recheck now"}
        </button>
      </div>

      {error ? (
        <p className="text-sm text-red-700 mb-4 border border-red-300 bg-red-50 p-3">{error}</p>
      ) : null}

      {result ? (
        <div className="space-y-8">
          {result.hosts.map((h) => (
            <HostBlock key={h.host} host={h} />
          ))}
        </div>
      ) : null}
    </AdminShell>
  );
}

function Badge({ tone, children }: { tone: "ok" | "warn" | "bad"; children: React.ReactNode }) {
  const cls =
    tone === "ok"
      ? "bg-green-100 text-green-900 border-green-300"
      : tone === "warn"
        ? "bg-amber-100 text-amber-900 border-amber-300"
        : "bg-red-100 text-red-900 border-red-300";
  return (
    <span className={`inline-block border px-2 py-0.5 text-xs uppercase tracking-widest ${cls}`}>
      {children}
    </span>
  );
}

function HostBlock({ host }: { host: HostResult }) {
  const certTone: "ok" | "bad" = host.tlsOk ? "ok" : "bad";
  const httpTone: "ok" | "warn" | "bad" = host.ok
    ? "ok"
    : host.finalStatus && host.finalStatus >= 300 && host.finalStatus < 400
      ? "warn"
      : "bad";

  return (
    <section className="border border-[var(--hairline)] p-5 bg-[var(--surface)]">
      <header className="flex flex-wrap items-baseline justify-between gap-3 mb-4">
        <h2 className="serif text-2xl">{host.host}</h2>
        <div className="flex gap-2">
          <Badge tone={certTone}>{host.tlsOk ? "TLS ok" : "TLS failed"}</Badge>
          <Badge tone={httpTone}>HTTP {host.finalStatus ?? "—"}</Badge>
        </div>
      </header>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm mb-4">
        <div>
          <dt className="meta uppercase tracking-widest">Start URL</dt>
          <dd className="break-all">{host.url}</dd>
        </div>
        <div>
          <dt className="meta uppercase tracking-widest">Final URL</dt>
          <dd className="break-all">{host.finalUrl ?? "—"}</dd>
        </div>
        <div>
          <dt className="meta uppercase tracking-widest">Final host</dt>
          <dd>{host.finalHost ?? "—"}</dd>
        </div>
        <div>
          <dt className="meta uppercase tracking-widest">Duration</dt>
          <dd>{host.durationMs} ms</dd>
        </div>
      </dl>

      {host.error ? (
        <p className="text-sm text-red-800 border border-red-300 bg-red-50 p-3 mb-4">
          Error: {host.error}
        </p>
      ) : null}

      <div>
        <p className="meta uppercase tracking-widest mb-2">Redirect chain</p>
        {host.hops.length === 0 ? (
          <p className="text-sm">No hops recorded.</p>
        ) : (
          <ol className="text-sm space-y-1">
            {host.hops.map((hop, i) => (
              <li key={i} className="flex gap-3 border-b border-[var(--hairline)] py-1">
                <span className="meta w-6">{i + 1}.</span>
                <span className="font-mono w-12">{hop.status}</span>
                <span className="break-all flex-1">{hop.url}</span>
                {hop.location ? (
                  <span className="break-all flex-1 meta">→ {hop.location}</span>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
