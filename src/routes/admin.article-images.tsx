// Admin dashboard: every verified article hero image with status, last
// checked time, and the most recent repair reason. Backed by the immutable
// article_image_audit log (insert-only) plus the current articles row.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { useAdminSession } from "@/hooks/useAdminSession";
import { adminSupabase } from "@/integrations/supabase/admin-client";
import { citySlug, siteName } from "@/lib/city";
import { isRealImage } from "@/lib/media";

export const Route = createFileRoute("/admin/article-images")({
  ssr: false,
  head: () => ({
    meta: [
      { title: `Article hero images | Admin | ${siteName()}` },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Page,
});

type Article = {
  id: string;
  slug: string;
  title: string;
  hero_image: string | null;
  hero_image_source: string | null;
  published_at: string | null;
};

type Audit = {
  id: string;
  article_id: string | null;
  action: string;
  prev_url: string | null;
  new_url: string | null;
  probe_status: number | null;
  probe_content_type: string | null;
  source: string | null;
  reason: string | null;
  visual_check: string | null;
  checked_at: string;
};

type Row = {
  article: Article;
  latest: Audit | null;
  status: "ok" | "missing" | "broken" | "irrelevant" | "unverified";
};

function deriveStatus(a: Article, latest: Audit | null): Row["status"] {
  if (!a.hero_image) return "missing";
  if (!latest) return "unverified";
  if (latest.action === "prune" && latest.reason === "broken") return "broken";
  if (latest.action === "prune" && latest.reason === "irrelevant") return "irrelevant";
  if (latest.action === "probe" && latest.reason && latest.reason !== "probe_ok") return "broken";
  return "ok";
}

function fmt(d: string | null): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return d;
  }
}

const STATUS_COLORS: Record<Row["status"], string> = {
  ok: "text-emerald-700",
  missing: "text-amber-700",
  broken: "text-red-700",
  irrelevant: "text-red-700",
  unverified: "text-muted-foreground",
};

function Page() {
  const { email, loading } = useAdminSession();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [filter, setFilter] = useState<Row["status"] | "all">("all");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!email) return;
    let active = true;
    (async () => {
      const city = citySlug();
      const [articlesRes, auditRes] = await Promise.all([
        adminSupabase
          .from("articles")
          .select("id,slug,title,hero_image,hero_image_source,published_at")
          .eq("city", city)
          .eq("is_published", true)
          .order("published_at", { ascending: false })
          .limit(500),
        adminSupabase
          .from("article_image_audit")
          .select(
            "id,article_id,action,prev_url,new_url,probe_status,probe_content_type,source,reason,visual_check,checked_at",
          )
          .eq("city", city)
          .order("checked_at", { ascending: false })
          .limit(5000),
      ]);
      if (!active) return;
      if (articlesRes.error) {
        setErr(articlesRes.error.message);
        return;
      }
      if (auditRes.error) {
        setErr(auditRes.error.message);
        return;
      }
      const latestByArticle = new Map<string, Audit>();
      for (const a of (auditRes.data ?? []) as Audit[]) {
        if (!a.article_id) continue;
        if (!latestByArticle.has(a.article_id)) latestByArticle.set(a.article_id, a);
      }
      const out: Row[] = ((articlesRes.data ?? []) as Article[]).map((art) => {
        const latest = latestByArticle.get(art.id) ?? null;
        return { article: art, latest, status: deriveStatus(art, latest) };
      });
      setRows(out);
    })();
    return () => {
      active = false;
    };
  }, [email]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: 0, ok: 0, missing: 0, broken: 0, irrelevant: 0, unverified: 0 };
    for (const r of rows ?? []) {
      c.all += 1;
      c[r.status] = (c[r.status] ?? 0) + 1;
    }
    return c;
  }, [rows]);

  const filtered = useMemo(
    () => (filter === "all" ? rows ?? [] : (rows ?? []).filter((r) => r.status === filter)),
    [rows, filter],
  );

  if (loading) {
    return (
      <div className="container-news py-24 text-center">
        <p className="meta uppercase tracking-widest">Loading</p>
      </div>
    );
  }
  if (!email) return null;

  return (
    <AdminShell title="Article hero images" email={email} activePath="/admin/article-images">
      <p className="meta mb-4">
        Verified hero image for every published article. Status comes from the immutable image
        audit log: probes, replacements, and prunes are recorded permanently.
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {(["all", "ok", "broken", "irrelevant", "missing", "unverified"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`btn-ghost text-xs ${filter === k ? "underline" : ""}`}
          >
            {k} ({counts[k] ?? 0})
          </button>
        ))}
      </div>

      {err ? (
        <div className="border border-red-300 bg-red-50 p-3 text-sm text-red-800 mb-4">{err}</div>
      ) : null}

      <div className="border border-[var(--hairline)] overflow-x-auto bg-[var(--surface)]">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--hairline)]">
            <tr className="text-left">
              <th className="p-3 w-20">Thumb</th>
              <th className="p-3">Article</th>
              <th className="p-3">Status</th>
              <th className="p-3">Last checked</th>
              <th className="p-3">Repair reason</th>
              <th className="p-3">Source</th>
            </tr>
          </thead>
          <tbody>
            {rows == null ? (
              <tr>
                <td colSpan={6} className="p-6 text-center meta">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center meta">
                  No rows
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const a = r.article;
                const l = r.latest;
                return (
                  <tr key={a.id} className="border-b border-[var(--hairline)] align-top">
                    <td className="p-3">
                      {isRealImage(a.hero_image) ? (
                        <img
                          src={a.hero_image}
                          alt=""
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                          className="w-16 h-12 object-cover border border-[var(--hairline)]"
                        />
                      ) : (
                        <div className="w-16 h-12 border border-dashed border-[var(--hairline)] grid place-items-center text-[10px] meta">
                          none
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <Link to={`/article/${a.slug}`} className="underline">
                        {a.title}
                      </Link>
                      <div className="meta text-xs mt-1">{fmt(a.published_at)}</div>
                    </td>
                    <td className={`p-3 font-mono text-xs uppercase ${STATUS_COLORS[r.status]}`}>
                      {r.status}
                      {l?.visual_check ? (
                        <div className="meta text-[10px] mt-1">visual: {l.visual_check}</div>
                      ) : null}
                    </td>
                    <td className="p-3 text-xs whitespace-nowrap">{fmt(l?.checked_at ?? null)}</td>
                    <td className="p-3 text-xs">
                      {l ? (
                        <>
                          <span className="font-mono">{l.action}</span>
                          {l.reason ? <span className="meta"> · {l.reason}</span> : null}
                          {l.probe_status != null ? (
                            <div className="meta">HTTP {l.probe_status}</div>
                          ) : null}
                        </>
                      ) : (
                        <span className="meta">no audit yet</span>
                      )}
                    </td>
                    <td className="p-3 text-xs break-all max-w-[20ch]">
                      {a.hero_image_source ? (
                        <a
                          href={a.hero_image_source}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          source
                        </a>
                      ) : (
                        <span className="meta">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
