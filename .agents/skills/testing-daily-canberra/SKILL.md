---
name: testing-daily-canberra
description: Test the Daily Canberra site end-to-end. Use when verifying form submissions, scroll-triggered CTAs, event listings, guide pages, newsletter signup, or Supabase data writes.
---

# Testing Daily Canberra (dailycanberra.com.au)

## Quick Start

```bash
cd /home/ubuntu/repos/daily-canberra-site
bun install
bun run dev   # starts on http://localhost:8080
```

The dev server uses Vite + TanStack Start. Hot reload is enabled.

## Architecture Notes

- **Framework:** TanStack Start (React + Vite + server functions)
- **Database:** Supabase (PostgreSQL with RLS). Project ID: `sjcwxiesvetkblatydrd`
- **City isolation:** All queries filtered by `CITY = "canberra"` via city-guard proxy (`src/lib/city-guard.ts`). The guard wraps the Supabase client and throws if queries lack city scope.
- **Server functions:** `src/lib/forms.functions.ts` handles newsletter subscriptions and enquiries. These use `createServerFn({ method: "POST" })` — they run server-side even in dev.
- **Supabase key format:** The project uses a Lovable-format key (`sb_publishable_...`) rather than a standard JWT anon key (`eyJ...`). This may cause silent failures on DB writes. The server functions always return `{ ok: true }` to avoid leaking errors, so check the DB directly to verify writes.

## Key Test Pages

| Page                 | Content                       | Scrollable?                                  |
| -------------------- | ----------------------------- | -------------------------------------------- |
| `/events`            | 24 published events           | Yes — best page for scroll-trigger tests     |
| `/news`              | 0 articles (empty)            | Barely — footer makes it slightly scrollable |
| `/best`              | 15 guide categories           | Yes                                          |
| `/best/:slug`        | Guide entries (3-9 per guide) | Yes                                          |
| `/directory`         | SponsorCta form               | Short page                                   |
| `/admin`             | Admin panel                   | Excluded from CTA                            |
| `/privacy`, `/terms` | Legal pages                   | Excluded from CTA                            |

## Testing Scroll-Triggered CTA

The `ScrollTriggeredCTA` component (`src/components/ScrollTriggeredCTA.tsx`) shows a newsletter bar after 45% scroll. Key behaviors:

1. **Scroll trigger:** Bar appears when `scrollPct > 0.45`. Use `/events` for reliable testing.
2. **Dismiss persistence:** Clicking X sets `sessionStorage("dc_scroll_cta_dismissed", "1")`. Clear with `sessionStorage.clear()` in DevTools Console between tests.
3. **Honeypot:** Hidden `company` field — bots that fill it get silently discarded.
4. **Timing guard:** Submissions within 2 seconds of component mount are silently discarded (anti-bot).
5. **Route exclusion:** CTA is hidden on `/admin`, `/privacy`, `/terms` prefixes.
6. **Success message:** "You're in. Check your inbox." in gold (#e8d5b5) text, auto-dismisses after 3s.

### Common Pitfalls

- **SessionStorage persistence:** The CTA won't reappear after dismissal or successful submission within the same browser session. Always clear sessionStorage before retesting.
- **Browser scroll restoration:** After page reload, the browser may restore scroll position. Press Home key to go to top before re-testing scroll trigger.
- **Silent DB failures:** The `subscribeNewsletter` function never surfaces errors. Always verify DB writes with a direct Supabase query: `SELECT * FROM subscribers WHERE email = '<test-email>' ORDER BY subscribed_at DESC;`
- **Supabase key issues:** If the Lovable-format `sb_publishable_` key doesn't authenticate with Supabase JS client, all form writes will silently fail. Check if any subscribers/enquiries exist at all to diagnose this.

## Verifying Supabase Data

Use the Supabase MCP tool to query data:

```
mcp_tool -> supabase -> execute_sql
project_id: sjcwxiesvetkblatydrd
query: SELECT * FROM subscribers ORDER BY subscribed_at DESC LIMIT 10;
```

Key tables: `subscribers` (newsletter), `enquiries` (contact forms), `events`, `articles`, `guides`, `guide_entries`.

Note: The Supabase MCP is **read-only** — you cannot INSERT/UPDATE/DELETE via MCP SQL queries.

## Cleanup After Testing

Delete test data after testing to avoid polluting the database. Since MCP is read-only, you may need to use the Supabase dashboard or ask the user to clean up test rows.

## Devin Secrets Needed

No additional secrets required for local dev testing. The Supabase publishable key is hardcoded in `src/integrations/supabase/config.ts`. If the key format needs to be changed to a standard JWT anon key, that would require Supabase dashboard access.

## Lint & Type Checks

```bash
bun run lint      # ESLint
bun run typecheck # TypeScript compiler check
bun run build     # Full production build
```

Always run these before committing. The repo has no CI configured, so local checks are the only gate.
