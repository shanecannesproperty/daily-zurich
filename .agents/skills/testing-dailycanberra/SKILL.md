---
name: testing-dailycanberra
description: Test the Daily Canberra site end-to-end. Use when verifying image loading, event card navigation, SPA transitions, page rendering, component state management, or podcast subscribe features.
---

# Testing The Daily Canberra

## Quick Start

```bash
cd /home/ubuntu/repos/daily-canberra-site
bun install
bun run dev  # Starts on http://localhost:8080 or 8082
```

## Stack

- TanStack Start (file-based routing with SSR via Nitro)
- React 19, Tailwind v4, Vite 8
- Supabase for event + article data (city-guard enforces `city='canberra'`)
- Package manager: `bun`

## Key Testing Areas

### Article Hero Images (Background Acquisition)

The article image pipeline (`src/lib/article-images.server.ts`) auto-acquires hero images for articles with null `hero_image`:

- **Trigger:** Background fire-and-forget on every homepage load via `getHomepage()` in `src/lib/data.functions.ts`
- **Sources:** Openverse API (CC-licensed photos) + Wikimedia Commons
- **Query strategy:** Filters stopwords from title, builds progressive queries, falls back to category-specific queries
- **Write path:** Requires `SUPABASE_SERVICE_ROLE_KEY` env var. Without it, acquisition silently skips (safe for local dev)
- **Admin endpoint:** `POST /api/admin/acquire-article-images` (auth: shane@spexperts.com.au only)

**How to test article images:**

1. **Search logic (no DB write needed):** Create a test script importing `buildQueries`/`searchOpenverse`/`searchWikimedia` from `article-images.server.ts` and verify candidates are found for article titles
2. **Dev server integrity:** Start dev server, navigate to homepage, verify no crashes in console from the article-images module
3. **Admin endpoint:** POST to `/api/admin/acquire-article-images` — expect 401 (auth gate), not 404 (endpoint missing)
4. **Database state:** Query Supabase via MCP: `SELECT id, title, hero_image FROM articles WHERE city='canberra' ORDER BY published_at DESC LIMIT 15;`
5. **Live site visual:** Check https://dailycanberra.com.au — articles with null `hero_image` render text-only; articles with populated `hero_image` show images

**Category fallback queries** (when title keywords return nothing):
- finance: "money finance budget", "property house australia"
- community: "people community neighbourhood", "canberra suburb street"
- news: "newspaper headlines press", "canberra parliament house"
- sport: "sports stadium field", "australian sport athlete"
- business: "shopfront office modern", "business meeting workspace"

**Important:** The background acquisition on Cloudflare Workers may not always complete (fire-and-forget promise not registered with `ctx.waitUntil()`). The admin endpoint runs synchronously and is the reliable path for batch runs.

### EventImage Component (SSR Hydration + SPA Navigation)

The `EventImage` component (`src/components/EventImage.tsx`) handles image loading with:

- Eager loading (no lazy/opacity gate since PR #27)
- Direct `<img>` tag rendering for events
- State reset on `src` prop change (for SPA navigation)

**Critical test: SPA navigation between events**
TanStack Router reuses the same component instance for `/event/$slug` routes. The `loaded`, `failed`, and `retryCount` states must reset when `src` changes. Without the reset, navigating from Event A to Event B may show stale state.

**How to test:**

1. Navigate to homepage, click Event A, verify hero image visible
2. Press back, click Event B (different event), verify hero image visible
3. Press back, click Event C, verify hero image visible

### Homepage Layout

The homepage has these sections (in order):
1. **Top articles** — 5 article cards (may be text-only if `hero_image` is null)
2. **Live now** — aggregated news feed from external sources
3. **Canberra in 5 minutes** — audio briefing
4. **Continued coverage** — 2 articles with images (older articles with `hero_image` set)
5. **This week in Canberra** — event cards with images from Supabase storage
6. **What's on this weekend** — whatsoncanberra.com.au event cards
7. **Courts** — recent judgments
8. **Newsletter** — subscription form

### Build Verification

```bash
bun run build  # Should complete without errors
```

Note: There are pre-existing Prettier lint errors (formatting debt). These are baseline and not introduced by changes. Focus on build passing, not lint zero.

## Route Structure

Routes are at `src/routes/`. Key routes:

- `src/routes/index.tsx` - Homepage with articles + events
- `src/routes/events.tsx` - All events page
- `src/routes/event.$slug.tsx` - Event detail page (dynamic)
- `src/routes/article.$slug.tsx` - Article detail page
- `src/routes/api/admin/acquire-article-images.ts` - Admin image acquisition endpoint
- `src/routes/api/admin/acquire-images.ts` - Admin event image acquisition endpoint
- `src/routes/rss.podcast[.]xml.ts` - Podcast RSS feed (iTunes-compatible)

## Important Notes

- Never force-push or rewrite published history (Lovable connection).
- The site uses Supabase for event + article data with city-guard (`city='canberra'`).
- Dev server may run on port 8080 or 8082 (check output after `bun run dev`).
- 19 cities pre-configured in DB but only Canberra is live.
- The `src/routeTree.gen.ts` is auto-generated, don't edit manually.
- Live site: https://dailycanberra.com.au
- Supabase project ID: `sjcwxiesvetkblatydrd`

### Podcast RSS Feed + Subscribe Dropdown

The `DailyBriefingCard` component includes a `PodcastSubscribe` dropdown (Radix `DropdownMenu`) next to the audio player, and a `/rss/podcast.xml` route serves an iTunes-compatible feed.

**How to test the RSS feed (shell):**

```bash
curl -s -D /tmp/podcast-headers.txt http://localhost:8080/rss/podcast.xml -o /tmp/podcast-feed.xml
# Check: HTTP 200, Content-Type: application/rss+xml; charset=utf-8
# Check: Cache-Control: public, max-age=900
# Check: <rss version="2.0"> with xmlns:itunes namespace
# Check: <title>The Daily Canberra in 5</title>
# Check: <itunes:email>hello@dailycanberra.com.au</itunes:email>
# Check: At least one <item> with <enclosure type="audio/mpeg" />
# Check: Each item has <itunes:duration> with numeric value > 0
# Check: GUIDs follow pattern tdc-briefing-YYYY-MM-DD
```

**How to test the subscribe button (browser):**

1. Navigate to homepage, scroll to "Canberra in 5 minutes" audio section
2. Verify "Subscribe in podcast app" button visible next to audio player (flex row on desktop)
3. Click button, verify dropdown opens with: "Open in" header, Apple Podcasts, Overcast, Pocket Casts, separator, "Copy RSS feed URL"
4. Click "Copy RSS feed URL", verify button text changes to "Copied!" with checkmark icon
5. Verify button reverts to "Subscribe in podcast app" after ~2 seconds

**Key implementation details:**
- Feed URL is always the production canonical: `https://dailycanberra.com.au/rss/podcast.xml` (from `SITE_DOMAIN` constant)
- Deep links (`podcast://`, `overcast://`, `pktc://`) require native apps installed, cannot be fully tested in dev environment
- The `enclosure length="0"` is intentional (DB does not store file byte sizes); most podcast apps handle this
- Feed query filters `audio_url IS NOT NULL` before applying `LIMIT 60` to avoid counting rows without audio

## Common Issues

### Articles Without Images (null hero_image)

**Symptom:** Article cards on homepage render text-only (no photo).
**Cause:** `hero_image` field is null in the articles table. No image was ever acquired.
**Fix:** PR #29 adds background acquisition (Openverse + Wikimedia search on each homepage load). Requires `SUPABASE_SERVICE_ROLE_KEY` in production env. Admin endpoint available for manual/scheduled batch runs.

### Images Not Loading (SSR Hydration Race) — FIXED

**Symptom:** Images appear in source HTML but are invisible on page (opacity-0 stuck).
**Cause:** `onLoad` fires during SSR before React mounts. State never updates.
**Fix:** PR #27 switched to eager loading and removed opacity-0 gate entirely.

### Images Stuck After SPA Navigation

**Symptom:** Second event page shows no image after navigating from first event.
**Cause:** TanStack Router reuses component instance; `loaded`/`failed`/`retryCount` persist.
**Fix:** `useEffect` with `[src]` dependency resets all state before hydration check runs.

### Irrelevant Article Images

**Symptom:** Article has a cover image but it doesn't match the content.
**Cause:** Openverse/Wikimedia search returned a loosely-related result that passed probe checks.
**Fix:** Use the admin endpoint with `force: true` and a specific `article_id` to re-acquire. Or manually set `hero_image` in Supabase dashboard.

## Devin Secrets Needed

- **Local dev/testing:** None required. Supabase connection is configured in the repo.
- **Production image acquisition:** `SUPABASE_SERVICE_ROLE_KEY` (set in deployment env, not needed locally)
