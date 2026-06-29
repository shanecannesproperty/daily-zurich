import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { useAdminSession } from "@/hooks/useAdminSession";
import {
  adminSubscriberCount,
  adminEventDaily,
  adminTopContent,
  adminCategoryDaily,
  adminTrackFailures,
  adminGetSetting,
  adminUpsertSetting,
} from "@/lib/admin-db";
import { cityName } from "@/lib/city";
import { CATEGORY_LABELS, type BotCategory, type BotPatterns, FALLBACK_PATTERNS } from "@/lib/bot-classify";
import type { SiteEventName } from "@/lib/schema";

export const Route = createFileRoute("/admin/analytics")({
  ssr: false,
  component: Analytics,
});

interface DailyRow {
  event_name: SiteEventName;
  day: string;
  events: number;
  sessions: number;
}

interface TopRow {
  path_ref: string;
  reads: number;
}

interface SubCounts {
  total: number;
  active: number;
  pending: number;
}

interface CategoryRow {
  day: string;
  ua_category: string;
  events: number;
  sessions: number;
}

interface FailureRow {
  day: string;
  count: number;
}

const WINDOW_DAYS = 30;
const RECON_DAYS = 7;

function sinceIso(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function sumBy(rows: DailyRow[], name: SiteEventName, key: "events" | "sessions"): number {
  return rows.filter((r) => r.event_name === name).reduce((acc, r) => acc + (r[key] ?? 0), 0);
}

function Analytics() {
  const { email } = useAdminSession();
  const [subs, setSubs] = useState<SubCounts | null>(null);
  const [daily, setDaily] = useState<DailyRow[] | null>(null);
  const [dailyRaw, setDailyRaw] = useState<DailyRow[] | null>(null);
  const [top, setTop] = useState<TopRow[] | null>(null);
  const [categoryRows, setCategoryRows] = useState<CategoryRow[] | null>(null);
  const [failures, setFailures] = useState<FailureRow[] | null>(null);
  const [botPatterns, setBotPatterns] = useState<BotPatterns | null>(null);
  const [patternSaving, setPatternSaving] = useState(false);
  const [patternMsg, setPatternMsg] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  useEffect(() => {
    if (!email) return;
    (async () => {
      const since30 = sinceIso(WINDOW_DAYS);
      const since7 = sinceIso(RECON_DAYS);
      const [total, active, pending, dailyRes, dailyRawRes, topRes, catRes, failRes, settingRes] =
        await Promise.all([
          adminSubscriberCount(),
          adminSubscriberCount("active"),
          adminSubscriberCount("pending"),
          adminEventDaily(since30, true),
          adminEventDaily(since30, false),
          adminTopContent(10),
          adminCategoryDaily(since30),
          adminTrackFailures(since7),
          adminGetSetting("bot_ua_patterns"),
        ]);
      setSubs({
        total: total.count ?? 0,
        active: active.count ?? 0,
        pending: pending.count ?? 0,
      });
      setDaily((dailyRes.data as DailyRow[] | null) ?? []);
      setDailyRaw((dailyRawRes.data as DailyRow[] | null) ?? []);
      setTop((topRes.data as TopRow[] | null) ?? []);
      setCategoryRows((catRes.data as CategoryRow[] | null) ?? []);
      setFailures((failRes.data as FailureRow[] | null) ?? []);
      setBotPatterns((settingRes.data?.value as BotPatterns | null) ?? FALLBACK_PATTERNS);
    })();
  }, [email]);

  const totals = useMemo(() => {
    const rows = daily ?? [];
    const raw = dailyRaw ?? [];
    const rawPageviews = sumBy(raw, "pageview", "events");
    const humanPageviews = sumBy(rows, "pageview", "events");
    const botPageviews = rawPageviews - humanPageviews;
    const botPct = rawPageviews > 0 ? Math.round((botPageviews / rawPageviews) * 100) : 0;
    return {
      pageviews: humanPageviews,
      rawPageviews,
      botPageviews,
      botPct,
      sessions: sumBy(rows, "pageview", "sessions"),
      signups: sumBy(rows, "newsletter_signup", "events"),
      confirmed: sumBy(rows, "newsletter_confirmed", "events"),
      articleReads: sumBy(rows, "article_read", "events"),
      audioPlays: sumBy(rows, "audio_play", "events"),
      liveClicks: sumBy(rows, "live_feed_click", "events"),
    };
  }, [daily, dailyRaw]);

  // Signups over time: one bar per day from the newsletter_signup rollup.
  const signupSeries = useMemo(() => {
    const rows = (daily ?? []).filter((r) => r.event_name === "newsletter_signup");
    rows.sort((a, b) => a.day.localeCompare(b.day));
    const max = rows.reduce((m, r) => Math.max(m, r.events), 0) || 1;
    return { rows, max };
  }, [daily]);

  const loading = !subs || !daily || !dailyRaw || !top || !categoryRows;

  // Reconciliation totals (last 7 days from the 30-day daily rollup)
  const recon = useMemo(() => {
    const cutoff = sinceIso(RECON_DAYS);
    const raw = (dailyRaw ?? []).filter((r) => r.day >= cutoff && r.event_name === "pageview");
    const human = (daily ?? []).filter((r) => r.day >= cutoff && r.event_name === "pageview");
    const rawPv = raw.reduce((s, r) => s + r.events, 0);
    const humanPv = human.reduce((s, r) => s + r.events, 0);
    const rawSess = raw.reduce((s, r) => s + r.sessions, 0);
    const humanSess = human.reduce((s, r) => s + r.sessions, 0);
    const botPv = rawPv - humanPv;
    const botPct = rawPv > 0 ? Math.round((botPv / rawPv) * 100) : 0;
    const blockedTotal = (failures ?? []).reduce((s, r) => s + r.count, 0);

    let diagnosis = "";
    if (botPct > 40) diagnosis = "Bot share is very high — check Source breakdown above.";
    else if (botPct > 20) diagnosis = "Bot share is elevated; raw numbers include significant crawler traffic.";
    else diagnosis = "Bot share is in normal range.";
    if (blockedTotal > 0) diagnosis += ` ~${blockedTotal.toLocaleString("en-AU")} client events were blocked in the last 7 days.`;

    return { rawPv, humanPv, rawSess, humanSess, botPct, blockedTotal, diagnosis };
  }, [daily, dailyRaw, failures]);

  // Category totals (last 30 days)
  const categoryTotals = useMemo(() => {
    const map = new Map<string, { events: number; sessions: number }>();
    for (const r of categoryRows ?? []) {
      const existing = map.get(r.ua_category) ?? { events: 0, sessions: 0 };
      map.set(r.ua_category, {
        events: existing.events + r.events,
        sessions: existing.sessions + r.sessions,
      });
    }
    const totalEvents = [...map.values()].reduce((s, v) => s + v.events, 0) || 1;
    return [...map.entries()]
      .map(([cat, v]) => ({ cat, ...v, pct: Math.round((v.events / totalEvents) * 100) }))
      .sort((a, b) => b.events - a.events);
  }, [categoryRows]);

  async function savePatterns(patterns: BotPatterns) {
    setPatternSaving(true);
    setPatternMsg("");
    try {
      const { error } = await adminUpsertSetting("bot_ua_patterns", patterns);
      if (error) throw new Error(error.message);
      setBotPatterns(patterns);
      setPatternMsg("Saved.");
    } catch (err) {
      setPatternMsg(`Error: ${String(err)}`);
    } finally {
      setPatternSaving(false);
    }
  }

  return (
    <AdminShell title="Analytics" email={email} activePath="/admin/analytics">
      {loading ? (
        <p className="meta">Loading analytics</p>
      ) : (
        <div className="space-y-10">
          <section>
            <h2 className="kicker mb-3">Subscribers ({cityName()})</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-[var(--hairline)] border border-[var(--hairline)]">
              <Stat label="Total" value={subs.total} />
              <Stat label="Confirmed (active)" value={subs.active} />
              <Stat label="Pending confirm" value={subs.pending} />
            </div>
          </section>

          <section>
            <h2 className="kicker mb-3">Last {WINDOW_DAYS} days — human traffic</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-[var(--hairline)] border border-[var(--hairline)]">
              <Stat label="Pageviews (human)" value={totals.pageviews} />
              <Stat label="Sessions" value={totals.sessions} />
              <Stat label="Signups" value={totals.signups} />
              <Stat label="Confirmed" value={totals.confirmed} />
              <Stat label="Article reads" value={totals.articleReads} />
              <Stat label="Audio plays" value={totals.audioPlays} />
              <Stat label="Live feed clicks" value={totals.liveClicks} />
            </div>
          </section>

          <section>
            <h2 className="kicker mb-3">Bot traffic</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-[var(--hairline)] border border-[var(--hairline)]">
              <Stat label="Total pageviews (incl. bots)" value={totals.rawPageviews} />
              <Stat label="Bot pageviews" value={totals.botPageviews} />
              <Stat label="Bot %" value={totals.botPct} suffix="%" />
            </div>
            <p className="meta mt-2">Bots are detected by User-Agent. Crawlers (Google, Bing, Ahrefs, etc.) are useful for indexing but excluded from human metrics above.</p>
          </section>

          <section>
            <h2 className="kicker mb-3">Signups over time</h2>
            {signupSeries.rows.length === 0 ? (
              <p className="meta">No signups recorded yet.</p>
            ) : (
              <div className="border border-[var(--hairline)] p-4">
                <ul className="space-y-1">
                  {signupSeries.rows.map((r) => (
                    <li key={r.day} className="flex items-center gap-3 text-sm">
                      <span className="meta w-24 shrink-0">{r.day}</span>
                      <span
                        className="inline-block h-3 bg-[var(--ink-red)]"
                        style={{ width: `${Math.max(4, (r.events / signupSeries.max) * 100)}%` }}
                        aria-hidden
                      />
                      <span className="meta w-10 text-right">{r.events}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section>
            <h2 className="kicker mb-3">Top content (most read)</h2>
            {top && top.length > 0 ? (
              <div className="border border-[var(--hairline)]">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--surface)] border-b border-[var(--hairline)]">
                    <tr>
                      <th className="text-left p-3">Article</th>
                      <th className="text-right p-3 w-24">Reads</th>
                    </tr>
                  </thead>
                  <tbody>
                    {top.map((r) => (
                      <tr key={r.path_ref} className="border-b border-[var(--hairline)]">
                        <td className="p-3">
                          <a href={`/article/${r.path_ref}`} className="underline">
                            {r.path_ref}
                          </a>
                        </td>
                        <td className="p-3 text-right">{r.reads}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="meta">No article reads recorded yet.</p>
            )}
          </section>

          {/* ── Section 2: Traffic by source (UA-category breakdown) ── */}
          <section>
            <h2 className="kicker mb-3">Traffic by source (last {WINDOW_DAYS} days)</h2>
            {categoryTotals.length === 0 ? (
              <p className="meta">No categorised events yet. Data appears for events tracked after the migration.</p>
            ) : (
              <div className="border border-[var(--hairline)]">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--surface)] border-b border-[var(--hairline)]">
                    <tr>
                      <th className="text-left p-3">Category</th>
                      <th className="text-right p-3 w-28">Pageviews</th>
                      <th className="text-right p-3 w-28">Sessions</th>
                      <th className="text-right p-3 w-20">% of raw</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryTotals.map(({ cat, events, sessions, pct }) => {
                      const label =
                        CATEGORY_LABELS[cat as BotCategory] ?? cat;
                      const isExpanded = expandedCategory === cat;
                      const dayRows = (categoryRows ?? [])
                        .filter((r) => r.ua_category === cat)
                        .slice(-7);
                      return (
                        <Fragment key={cat}>
                          <tr
                            className="border-b border-[var(--hairline)] cursor-pointer hover:bg-[var(--surface)]"
                            onClick={() => setExpandedCategory(isExpanded ? null : cat)}
                          >
                            <td className="p-3 flex items-center gap-2">
                              <span
                                className="inline-block w-2 h-2 rounded-full shrink-0"
                                style={{
                                  background: cat === "human" ? "var(--ink-red)" : "var(--ink-grey)",
                                }}
                                aria-hidden
                              />
                              {label}
                              <span className="meta text-[11px]">{isExpanded ? "▲" : "▼"}</span>
                            </td>
                            <td className="p-3 text-right">{events.toLocaleString("en-AU")}</td>
                            <td className="p-3 text-right">{sessions.toLocaleString("en-AU")}</td>
                            <td className="p-3 text-right">{pct}%</td>
                          </tr>
                          {isExpanded && (
                            <tr className="border-b border-[var(--hairline)] bg-[var(--surface)]">
                              <td colSpan={4} className="p-4">
                                <p className="kicker mb-2 text-[11px]">Daily trend (last 7 days)</p>
                                <ul className="space-y-1">
                                  {dayRows.length === 0 ? (
                                    <li className="meta">No data for last 7 days.</li>
                                  ) : (
                                    dayRows.map((r) => (
                                      <li key={r.day} className="flex items-center gap-3 text-sm">
                                        <span className="meta w-24 shrink-0">{r.day}</span>
                                        <span className="meta w-20 text-right">{r.events.toLocaleString("en-AU")} events</span>
                                      </li>
                                    ))
                                  )}
                                </ul>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <p className="meta mt-2">Data from events tracked after the ua_category migration. Historical rows show as "unknown".</p>
          </section>

          {/* ── Section 3: Reconciliation (last 7 days) ── */}
          <section>
            <h2 className="kicker mb-3">Reconciliation (last {RECON_DAYS} days)</h2>
            <div className="border border-[var(--hairline)]">
              <table className="w-full text-sm">
                <thead className="bg-[var(--surface)] border-b border-[var(--hairline)]">
                  <tr>
                    <th className="text-left p-3"> </th>
                    <th className="text-right p-3 w-36">site_events (raw)</th>
                    <th className="text-right p-3 w-36">site_events (human)</th>
                    <th className="text-right p-3 w-20">Bot %</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[var(--hairline)]">
                    <td className="p-3">Pageviews</td>
                    <td className="p-3 text-right">{recon.rawPv.toLocaleString("en-AU")}</td>
                    <td className="p-3 text-right">{recon.humanPv.toLocaleString("en-AU")}</td>
                    <td className="p-3 text-right">{recon.botPct}%</td>
                  </tr>
                  <tr className="border-b border-[var(--hairline)]">
                    <td className="p-3">Sessions</td>
                    <td className="p-3 text-right">{recon.rawSess.toLocaleString("en-AU")}</td>
                    <td className="p-3 text-right">{recon.humanSess.toLocaleString("en-AU")}</td>
                    <td className="p-3 text-right">—</td>
                  </tr>
                  <tr>
                    <td className="p-3">Blocked (est.)</td>
                    <td className="p-3 text-right" colSpan={3}>
                      {recon.blockedTotal > 0
                        ? `~${recon.blockedTotal.toLocaleString("en-AU")} events blocked by client`
                        : "None recorded"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="meta mt-2">{recon.diagnosis}</p>
          </section>

          {/* ── Section 4: Bot pattern editor ── */}
          {botPatterns && (
            <section>
              <h2 className="kicker mb-3">Bot UA pattern editor</h2>
              <p className="meta mb-4">
                Edit the UA substrings (case-insensitive) used to classify events. One pattern per line per category.
                Changes take effect within 60 s (server cache TTL).
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(Object.keys(FALLBACK_PATTERNS) as Exclude<BotCategory, "human">[]).map((cat) => (
                  <div key={cat} className="border border-[var(--hairline)] p-4">
                    <label className="kicker text-[11px] block mb-2">{CATEGORY_LABELS[cat]}</label>
                    <textarea
                      className="w-full text-sm font-mono border border-[var(--hairline)] p-2 resize-y bg-background"
                      rows={4}
                      defaultValue={(botPatterns[cat] ?? []).join("\n")}
                      onBlur={(e) => {
                        const updated: BotPatterns = {
                          ...botPatterns,
                          [cat]: e.target.value
                            .split("\n")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        };
                        void savePatterns(updated);
                      }}
                    />
                  </div>
                ))}
              </div>
              {patternMsg && (
                <p className={`meta mt-2 ${patternSaving ? "" : "text-[var(--ink-red)]"}`}>
                  {patternSaving ? "Saving…" : patternMsg}
                </p>
              )}
            </section>
          )}

          <p className="meta">
            First-party events are privacy-light: no personal data is stored, only an anonymous
            session id. GA4 runs alongside this for cross-checking.
          </p>
        </div>
      )}
    </AdminShell>
  );
}

function Stat({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="bg-background p-6">
      <p className="meta uppercase tracking-widest">{label}</p>
      <p className="serif text-4xl mt-2">{value.toLocaleString("en-AU")}{suffix ?? ""}</p>
    </div>
  );
}
