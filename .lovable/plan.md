# Analytics truth-checking + bot tuning

Four related pieces, all on `/admin/analytics` (Canberra-scoped) plus a small backend change.

## 1. Configurable bot list

Move the hard-coded `BOT_PATTERNS` out of `src/lib/analytics.functions.ts` into a new `app_settings` row keyed `bot_ua_patterns`, with a typed shape:

```json
{
  "googlebot":  ["googlebot", "google-inspectiontool"],
  "bingbot":    ["bingbot", "msnbot"],
  "social":     ["facebookexternalhit", "twitterbot", "linkedinbot", "whatsapp", "slackbot", "discordbot"],
  "seo":        ["semrushbot", "ahrefsbot", "mj12bot", "dotbot", "rogerbot"],
  "headless":   ["headlesschrome", "phantomjs", "lighthouse", "pagespeed", "playwright", "puppeteer"],
  "monitor":    ["pingdom", "uptimerobot", "statuscake", "gtmetrix"],
  "generic":    ["bot", "crawler", "spider", "slurp", "wget", "curl", "python-requests", "go-http-client", "java/", "libwww", "httpclient", "okhttp"]
}
```

- New migration: `app_settings(key text pk, value jsonb, updated_at)`, RLS allows admin read/write, anon read of `bot_ua_patterns` only.
- New server fn `getBotPatterns()` reads it (publishable client, narrow anon SELECT). Cached in-memory for 60 s inside the worker.
- `trackEvent` calls `classifyUa(ua)` which returns `{ isBot, category }` and writes both to a new `ua_category` column on `site_events`.
- Admin edit UI: simple textarea per category on `/admin/analytics` (gated by `has_role`). Save calls a `setBotPatterns` server fn that re-checks admin and writes the JSON. No redeploy needed.

## 2. UA-category breakdown panel (Canberra)

New section on `/admin/analytics` titled "Traffic by source":

- Daily rollup view `site_events_by_category_daily(city, day, ua_category, events, sessions)`.
- Stacked horizontal bar per day (last 30 days), plus a totals table:

```text
Category        Pageviews   Sessions   % of raw
Human                 412        118       46%
Googlebot             190         12       21%
Social unfurlers       95         52       10%
Headless / preview    140          8       15%
SEO crawlers           50          3        5%
Generic bot            25          2        3%
```

- Click a row to see the top 10 raw User-Agent strings in that bucket (last 7 days) so you can audit miscategorisations.

## 3. Platform vs site_events reconciliation

New section "Reconciliation (last 7 days)" on `/admin/analytics`. Server fn pulls:

- Lovable platform analytics via the existing analytics tool's data shape (already wired into the admin reports; if not, we add a `getPlatformTotals()` fn that proxies the same call).
- `site_events` raw and human pageviews for the same window.

Renders a table with deltas and a plain-English diagnosis line per row:

```text
                       Platform   site_events (raw)  site_events (human)   Delta vs platform
Pageviews                   766                612                  287    raw -20% / human -63%
Sessions                    135                ...                   72    human -47%
```

Diagnosis rules (computed, not free text):
- raw < platform by >10% → "client tracker is being blocked or failing for some visitors"
- human << raw → "bot share is high; check Source breakdown above"
- human ≈ platform → "human numbers match, ignore the bot column"

## 4. Blocked-track logging

`PageViewTracker` already calls `trackEvent`. Wrap the call:

```ts
try {
  await trackEvent({ data: ... })
} catch (err) {
  // POST blocked, offline, or 5xx
  navigator.sendBeacon?.(
    "/api/public/track-failure",
    new Blob([JSON.stringify({ path, reason: String(err).slice(0,120) })], { type: "application/json" })
  )
}
```

New server route `app/routes/api/public/track-failure.ts` (no auth, no PII, no UA logging beyond category) increments a counter row in `track_failures(day date, city text, count int)`. Rate-limited per session via the existing anon session id (drop if >20/session/day).

Reconciliation section shows a small "Estimated blocked client events (last 7d): N" line beside the deltas so you can quantify the under-count.

## Technical details

- Schema:
  - `ALTER TABLE site_events ADD COLUMN ua_category text` (nullable, defaults null for old rows).
  - New view `site_events_by_category_daily`.
  - New tables `app_settings`, `track_failures` with GRANTs and RLS per project rules (admin read/write, anon insert-only on track_failures via SECURITY DEFINER rpc to avoid abuse).
- Files:
  - `supabase/migrations/<ts>_bot_categories_and_reconciliation.sql`
  - `src/lib/bot-classify.ts` (pure function, used by both server fn and the panel)
  - `src/lib/analytics.functions.ts` (use `classifyUa`, write `ua_category`)
  - `src/lib/admin-bot-settings.functions.ts` (get/set patterns)
  - `src/lib/admin-reconciliation.functions.ts` (platform vs site_events)
  - `src/routes/api/public/track-failure.ts`
  - `src/components/PageViewTracker.tsx` (wrap + sendBeacon fallback)
  - `src/routes/admin.analytics.tsx` (three new sections)
- Touch nothing else; no changes to ingestion agents, routing, or public site UI.
- Backfill: leave `ua_category=null` historical rows out of the breakdown; show a "Data from <date>" note on the new panel.

## Out of scope

- No changes to Lovable platform analytics, only reading from it.
- No rewrite of the existing bot/human totals at the top of the page; those keep working off the new column once it backfills naturally.
- No alerting or scheduled reports yet.
