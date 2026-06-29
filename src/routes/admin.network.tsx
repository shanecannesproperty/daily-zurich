import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { useAdminSession } from "@/hooks/useAdminSession";
import { adminNetworkStats, adminNetworkSubscribers } from "@/lib/admin-db";
import type { SiteEventName } from "@/lib/schema";

export const Route = createFileRoute("/admin/network")({
  ssr: false,
  component: NetworkDashboard,
});

const WINDOW_DAYS = 30;

function sinceIso(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

// Ordered list of all network cities for display
const CITY_LABELS: Record<string, string> = {
  canberra: "Canberra",
  sydney: "Sydney",
  melbourne: "Melbourne",
  brisbane: "Brisbane",
  perth: "Perth",
  adelaide: "Adelaide",
  gold_coast: "Gold Coast",
  newcastle: "Newcastle",
  hobart: "Hobart",
  darwin: "Darwin",
  cairns: "Cairns",
  wollongong: "Wollongong",
  geelong: "Geelong",
  townsville: "Townsville",
  ballarat: "Ballarat",
  bendigo: "Bendigo",
  albury: "Albury",
  launceston: "Launceston",
  mackay: "Mackay",
};

interface CityRow {
  city: string;
  event_name: SiteEventName;
  events: number;
  sessions: number;
}

interface SubRow {
  city: string;
}

interface CityStats {
  city: string;
  label: string;
  pageviews: number;
  sessions: number;
  articleReads: number;
  subscribers: number;
  score: number;
}

function buildStats(rows: CityRow[], subRows: SubRow[]): CityStats[] {
  const map: Record<string, CityStats> = {};

  for (const r of rows) {
    if (!map[r.city]) {
      map[r.city] = {
        city: r.city,
        label: CITY_LABELS[r.city] ?? r.city,
        pageviews: 0,
        sessions: 0,
        articleReads: 0,
        subscribers: 0,
        score: 0,
      };
    }
    if (r.event_name === "pageview") {
      map[r.city].pageviews += r.events;
      map[r.city].sessions += r.sessions;
    }
    if (r.event_name === "article_read") {
      map[r.city].articleReads += r.events;
    }
  }

  for (const s of subRows) {
    if (!map[s.city]) {
      map[s.city] = {
        city: s.city,
        label: CITY_LABELS[s.city] ?? s.city,
        pageviews: 0,
        sessions: 0,
        articleReads: 0,
        subscribers: 0,
        score: 0,
      };
    }
    map[s.city].subscribers += 1;
  }

  // Composite score: pageviews + (article reads * 3) + (subscribers * 20)
  for (const c of Object.values(map)) {
    c.score = c.pageviews + c.articleReads * 3 + c.subscribers * 20;
  }

  return Object.values(map).sort((a, b) => b.score - a.score);
}

function NetworkDashboard() {
  const { email } = useAdminSession();
  const [rows, setRows] = useState<CityRow[] | null>(null);
  const [subRows, setSubRows] = useState<SubRow[] | null>(null);

  useEffect(() => {
    if (!email) return;
    (async () => {
      const since = sinceIso(WINDOW_DAYS);
      const [evtRes, subRes] = await Promise.all([
        adminNetworkStats(since),
        adminNetworkSubscribers(),
      ]);
      setRows((evtRes.data as CityRow[] | null) ?? []);
      setSubRows((subRes.data as SubRow[] | null) ?? []);
    })();
  }, [email]);

  const stats = useMemo(
    () => (rows && subRows ? buildStats(rows, subRows) : null),
    [rows, subRows],
  );

  const totals = useMemo(() => {
    if (!stats) return null;
    return {
      pageviews: stats.reduce((s, c) => s + c.pageviews, 0),
      sessions: stats.reduce((s, c) => s + c.sessions, 0),
      articleReads: stats.reduce((s, c) => s + c.articleReads, 0),
      subscribers: stats.reduce((s, c) => s + c.subscribers, 0),
      cities: stats.length,
    };
  }, [stats]);

  const loading = !stats || !totals;
  const medalEmoji = ["🥇", "🥈", "🥉"];

  return (
    <AdminShell title="Network" email={email} activePath="/admin/network">
      {loading ? (
        <p className="meta">Loading network data…</p>
      ) : (
        <div className="space-y-10">
          <section>
            <h2 className="kicker mb-1">Daily Network — group totals</h2>
            <p className="meta mb-4">Last {WINDOW_DAYS} days · human traffic only · {totals.cities} cities</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[var(--hairline)] border border-[var(--hairline)]">
              <NetStat label="Total pageviews" value={totals.pageviews} />
              <NetStat label="Total sessions" value={totals.sessions} />
              <NetStat label="Article reads" value={totals.articleReads} />
              <NetStat label="Active subscribers" value={totals.subscribers} />
            </div>
          </section>

          <section>
            <h2 className="kicker mb-3">City scoreboard</h2>
            <p className="meta mb-4">Score = pageviews + (reads × 3) + (subscribers × 20)</p>
            <div className="border border-[var(--hairline)] overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="bg-[var(--surface)] border-b border-[var(--hairline)]">
                  <tr>
                    <th className="text-left p-3 w-10">#</th>
                    <th className="text-left p-3">City</th>
                    <th className="text-right p-3">Pageviews</th>
                    <th className="text-right p-3">Sessions</th>
                    <th className="text-right p-3">Article reads</th>
                    <th className="text-right p-3">Subscribers</th>
                    <th className="text-right p-3 font-semibold">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((c, i) => (
                    <tr key={c.city} className="border-b border-[var(--hairline)] hover:bg-[var(--surface)]">
                      <td className="p-3 text-center">
                        {i < 3 ? (
                          <span title={`#${i + 1}`}>{medalEmoji[i]}</span>
                        ) : (
                          <span className="meta">{i + 1}</span>
                        )}
                      </td>
                      <td className="p-3 font-medium">{c.label}</td>
                      <td className="p-3 text-right">{c.pageviews.toLocaleString("en-AU")}</td>
                      <td className="p-3 text-right">{c.sessions.toLocaleString("en-AU")}</td>
                      <td className="p-3 text-right">{c.articleReads.toLocaleString("en-AU")}</td>
                      <td className="p-3 text-right">{c.subscribers.toLocaleString("en-AU")}</td>
                      <td className="p-3 text-right font-semibold">{c.score.toLocaleString("en-AU")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <p className="meta">
            Data is human-only (bots filtered). Score is a composite engagement index — not tied to revenue. Subscribers weighted 20× pageviews to reflect intent quality.
          </p>
        </div>
      )}
    </AdminShell>
  );
}

function NetStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-background p-6">
      <p className="meta uppercase tracking-widest">{label}</p>
      <p className="serif text-4xl mt-2">{value.toLocaleString("en-AU")}</p>
    </div>
  );
}
