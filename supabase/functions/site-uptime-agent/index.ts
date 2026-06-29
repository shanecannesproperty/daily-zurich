// site-uptime-agent: an always-on uptime/health agent for the Daily Network.
//
// Runs every minute (pg_cron) and performs TWO sweeps 30s apart, so every
// critical surface is probed roughly every 30 seconds, around the clock. Each
// sweep checks:
//   - the Supabase data API (PostgREST) with a cheap real query,
//   - the published articles read path,
//   - the public sites (canonical domain + Lovable app).
//
// Every probe is written to public.site_health_checks (the audit trail). The
// agent keeps a tiny incident record per target in public.site_health_incidents
// so it can AUTOMATICALLY DEAL WITH outages instead of just logging them:
//   - on N consecutive failures it opens an incident and fires a DOWN alert
//     (Resend email and/or a webhook — Slack/Discord/PagerDuty compatible),
//   - it only alerts once per incident (no minute-by-minute spam),
//   - when the target comes back it closes the incident and fires a RECOVERY
//     alert with the measured downtime.
//
// What counts as "down": a network error/timeout, or any 5xx including the
// Cloudflare gateway codes (520-524) — exactly the 504/522 storm that takes the
// REST API offline during a database resize. A 4xx is treated as UP (the server
// is responding), so query mistakes never page anyone.
//
// Auth: caller must present x-hook-secret == UPTIME_AGENT_SECRET (a dedicated
// secret in Supabase Vault, read by both the cron and this function — same
// pattern as the other Daily Network agents, with its own key so it never
// collides with theirs). Conservative by design: it never mutates site data —
// it observes, records, and notifies.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// Defaults — overridable per-invocation via the POST body. A check is "down"
// only on a network failure/timeout or a 5xx/gateway status.
const DEFAULT_SWEEPS = 2; // probes per invocation
const DEFAULT_INTERVAL_MS = 30_000; // gap between sweeps => ~every 30s
const DEFAULT_TIMEOUT_MS = 15_000; // per-probe timeout
const DEFAULT_ALERT_AFTER = 2; // consecutive failures before paging
const DEFAULT_SLOW_MS = 8_000; // log "degraded" above this (no page)

interface Target {
  key: string;
  url: string;
  withApiKey?: boolean; // attach Supabase anon key (for /rest/* probes)
}

function defaultTargets(): Target[] {
  return [
    // Cheapest real read that exercises PostgREST + Postgres on every page load.
    { key: "supabase_rest", url: `${SUPABASE_URL}/rest/v1/design_tokens?select=token_name&limit=1`, withApiKey: true },
    // The published-article read path the whole site depends on.
    { key: "supabase_articles", url: `${SUPABASE_URL}/rest/v1/articles?select=id&is_published=eq.true&limit=1`, withApiKey: true },
    // The public sites themselves.
    { key: "site_canonical", url: "https://dailycanberra.com.au/" },
    { key: "site_lovable", url: "https://daily-canberra-site.lovable.app/" },
  ];
}

interface ProbeResult {
  key: string;
  url: string;
  ok: boolean;
  degraded: boolean;
  status: number; // 0 = network error / timeout
  latency_ms: number;
  error: string | null;
}

// Read a secret from env first, then Supabase Vault via the service-role
// SECURITY DEFINER accessor (mirrors content-health-agent).
async function getSecret(...names: string[]): Promise<string> {
  for (const n of names) {
    const v = Deno.env.get(n);
    if (v) return v;
  }
  for (const n of names) {
    const { data } = await admin.rpc("get_vault_secret", { p_name: n });
    if (typeof data === "string" && data) return data;
  }
  return "";
}

function classify(status: number): { ok: boolean } {
  // Down: no response (0) or any server/gateway error. 4xx = server responding.
  if (status === 0) return { ok: false };
  if (status >= 500) return { ok: false };
  return { ok: true };
}

async function probe(t: Target, timeoutMs: number, slowMs: number): Promise<ProbeResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const started = Date.now();
  try {
    const headers: Record<string, string> = { "user-agent": "DailyNetwork-UptimeAgent/1.0" };
    if (t.withApiKey && ANON_KEY) {
      headers["apikey"] = ANON_KEY;
      headers["authorization"] = `Bearer ${ANON_KEY}`;
    }
    const res = await fetch(t.url, { method: "GET", redirect: "follow", signal: ctrl.signal, headers });
    // Drain the body so the connection is released and timing is honest.
    await res.arrayBuffer().catch(() => undefined);
    const latency = Date.now() - started;
    const { ok } = classify(res.status);
    return {
      key: t.key, url: t.url, ok, status: res.status, latency_ms: latency,
      degraded: ok && latency > slowMs,
      error: ok ? null : `HTTP ${res.status}`,
    };
  } catch (err) {
    const latency = Date.now() - started;
    const aborted = (err as Error)?.name === "AbortError";
    return {
      key: t.key, url: t.url, ok: false, degraded: false, status: 0, latency_ms: latency,
      error: aborted ? `timeout after ${timeoutMs}ms` : String(err).slice(0, 200),
    };
  } finally {
    clearTimeout(timer);
  }
}

// Resend email + generic webhook. Both are best-effort and no-op if unconfigured.
async function notify(subject: string, lines: string[]): Promise<void> {
  const text = lines.join("\n");
  const tasks: Promise<unknown>[] = [];

  const webhook = await getSecret("ALERT_WEBHOOK_URL");
  if (webhook) {
    tasks.push(
      fetch(webhook, {
        method: "POST",
        headers: { "content-type": "application/json" },
        // `text` and `content` cover Slack and Discord respectively.
        body: JSON.stringify({ text: `*${subject}*\n${text}`, content: `**${subject}**\n${text}` }),
      }).catch(() => undefined),
    );
  }

  const resendKey = await getSecret("RESEND_API_KEY");
  if (resendKey) {
    const to = (await getSecret("ALERT_EMAIL")) || "shaneapplepc@gmail.com";
    const from = (await getSecret("ALERT_FROM")) || "Daily Network Uptime <alerts@dailycanberra.com.au>";
    tasks.push(
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({ from, to, subject, text }),
      }).catch(() => undefined),
    );
  }

  await Promise.allSettled(tasks);
}

// Apply a probe result to the per-target incident record and page on the
// open/close transitions only. Returns a short note for the run summary.
async function reconcileIncident(p: ProbeResult, alertAfter: number): Promise<string | null> {
  const { data: inc } = await admin
    .from("site_health_incidents")
    .select("*")
    .eq("target", p.key)
    .maybeSingle();

  const now = new Date().toISOString();

  if (!p.ok) {
    const consecutive = ((inc?.consecutive_failures as number) ?? 0) + 1;
    const opened_at = inc?.is_down ? inc.opened_at : now;
    const shouldPage = consecutive >= alertAfter && !(inc?.notified ?? false);
    await admin.from("site_health_incidents").upsert({
      target: p.key, url: p.url, is_down: true, consecutive_failures: consecutive,
      opened_at, notified: inc?.notified || shouldPage, last_status: p.status,
      last_error: p.error, updated_at: now,
    });
    if (shouldPage) {
      await notify(`🔴 DOWN: ${p.key}`, [
        `Target:   ${p.key}`,
        `URL:      ${p.url}`,
        `Status:   ${p.status || "no response"}`,
        `Error:    ${p.error ?? "unknown"}`,
        `Failures: ${consecutive} consecutive`,
        `Since:    ${opened_at}`,
      ]);
      return `paged DOWN ${p.key}`;
    }
    return `failing ${p.key} (${consecutive})`;
  }

  // Recovered: close the incident and page only if we had paged it down.
  if (inc?.is_down) {
    const downMs = Date.parse(now) - Date.parse((inc.opened_at as string) ?? now);
    const mins = Math.max(1, Math.round(downMs / 60000));
    await admin.from("site_health_incidents").upsert({
      target: p.key, url: p.url, is_down: false, consecutive_failures: 0,
      opened_at: null, notified: false, last_status: p.status, last_error: null, updated_at: now,
    });
    if (inc.notified) {
      await notify(`🟢 RECOVERED: ${p.key}`, [
        `Target:   ${p.key}`,
        `URL:      ${p.url}`,
        `Status:   ${p.status}`,
        `Latency:  ${p.latency_ms}ms`,
        `Downtime: ~${mins} min`,
      ]);
      return `recovered ${p.key} (~${mins}m)`;
    }
  }
  return null;
}

async function sweep(targets: Target[], opts: { timeoutMs: number; slowMs: number; alertAfter: number; source: string }) {
  const results = await Promise.all(targets.map((t) => probe(t, opts.timeoutMs, opts.slowMs)));

  // Persist the raw probes (best-effort; never let logging fail the sweep).
  await admin.from("site_health_checks").insert(
    results.map((r) => ({
      target: r.key, url: r.url, ok: r.ok, degraded: r.degraded,
      status_code: r.status, latency_ms: r.latency_ms, error: r.error, run_source: opts.source,
    })),
  ).then(() => undefined, () => undefined);

  const notes: string[] = [];
  for (const r of results) {
    const note = await reconcileIncident(r, opts.alertAfter).catch(() => null);
    if (note) notes.push(note);
  }
  return { results, notes };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req) => {
  const ranAt = new Date().toISOString();

  const expected = await getSecret("UPTIME_AGENT_SECRET");
  const provided = req.headers.get("x-hook-secret") ?? "";
  if (!expected || provided !== expected) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { "content-type": "application/json" },
    });
  }

  let sweeps = DEFAULT_SWEEPS;
  let intervalMs = DEFAULT_INTERVAL_MS;
  let timeoutMs = DEFAULT_TIMEOUT_MS;
  let alertAfter = DEFAULT_ALERT_AFTER;
  let slowMs = DEFAULT_SLOW_MS;
  let targets = defaultTargets();
  let source = "cron";
  try {
    const body = await req.json();
    if (typeof body?.sweeps === "number") sweeps = Math.max(1, Math.min(10, body.sweeps));
    if (typeof body?.interval_ms === "number") intervalMs = Math.max(0, Math.min(55_000, body.interval_ms));
    if (typeof body?.timeout_ms === "number") timeoutMs = Math.max(1000, Math.min(30_000, body.timeout_ms));
    if (typeof body?.alert_after === "number") alertAfter = Math.max(1, Math.min(10, body.alert_after));
    if (typeof body?.slow_ms === "number") slowMs = Math.max(500, Math.min(30_000, body.slow_ms));
    if (typeof body?.source === "string") source = body.source.slice(0, 40);
    if (Array.isArray(body?.targets) && body.targets.length) {
      targets = body.targets
        .filter((t: { key?: string; url?: string }) => t?.key && t?.url)
        .map((t: { key: string; url: string; withApiKey?: boolean }) => ({ key: t.key, url: t.url, withApiKey: !!t.withApiKey }));
    }
  } catch { /* no body — use defaults */ }

  const sweepSummaries: Array<{ at: string; notes: string[]; down: string[] }> = [];
  for (let i = 0; i < sweeps; i++) {
    if (i > 0 && intervalMs > 0) await sleep(intervalMs);
    const at = new Date().toISOString();
    const { results, notes } = await sweep(targets, { timeoutMs, slowMs, alertAfter, source });
    sweepSummaries.push({ at, notes, down: results.filter((r) => !r.ok).map((r) => `${r.key}:${r.status}`) });
  }

  return new Response(
    JSON.stringify({ ok: true, ran_at: ranAt, sweeps, interval_ms: intervalMs, targets: targets.map((t) => t.key), summaries: sweepSummaries }),
    { headers: { "content-type": "application/json" } },
  );
});
