# Search & social distribution

Automatically notifies search engines about new articles and posts them to
Facebook + Instagram. Runs on a schedule via `pg_cron`, the same mechanism the
photo/RSS crons already use.

## What runs

`pg_cron` → `POST /api/public/hooks/distribute` (shared-secret) →
`src/lib/distribution.server.ts`, which for each article published in the last
72h, per channel, **skips anything already done** and otherwise:

| Channel | Action | Requires |
| --- | --- | --- |
| `indexnow` | Submits the URL to IndexNow (Bing, Yandex, Seznam, Naver) | nothing — key file already served at `/<INDEXNOW_KEY>.txt` |
| `google` | Calls the Google Indexing API (`URL_UPDATED`) | `GOOGLE_INDEXING_SA_KEY` |
| `facebook` | Link post to the Page feed | `FB_PAGE_ID`, `FB_PAGE_ACCESS_TOKEN` |
| `instagram` | Image post (needs an absolute `hero_image`) | `IG_USER_ID`, `FB_PAGE_ACCESS_TOKEN` |

Any channel whose env vars are missing is a **no-op** — nothing breaks, the
channel is just skipped and reported as `skipped` in the run summary. Sponsored
articles are never auto-posted to social.

De-duplication is the `content_distribution_log` table (unique on
`city, slug, channel`): search URLs are never needlessly resubmitted and socials
are never double-posted.

## Already in place (no action needed)

- **GA4**: `gtag` injected in `src/routes/__root.tsx`; per-city Measurement ID
  via `getGA4Id()` in `src/lib/analytics.ts`.
- **Google Search Console**: two `google-site-verification` meta tags in
  `src/routes/__root.tsx`.
- **Sitemaps / robots**: generated on every request — `sitemap.xml`,
  `sitemap-index.xml`, `news-sitemap.xml` (last 48h), `feed.xml`, `podcast.rss`,
  `robots.txt`. No build step or cron needed for these.

## Environment variables

Set these as deploy / Supabase function secrets (server-side only — never `VITE_`):

```
AGENTS_WEBHOOK_SECRET   # already configured; gates the hook
INDEXNOW_KEY            # optional; defaults to the key already served
GOOGLE_INDEXING_SA_KEY  # optional; full service-account JSON (one line)
FB_PAGE_ID              # Facebook Page numeric ID
FB_PAGE_ACCESS_TOKEN    # long-lived Page token (also used for Instagram)
IG_USER_ID              # Instagram Business account ID linked to the Page
META_GRAPH_VERSION      # optional; defaults to v21.0
```

### Getting the Meta (Facebook + Instagram) tokens

1. Create a **Business**-type app at <https://developers.facebook.com>.
2. Add products: **Facebook Login**, **Instagram Graph API**.
3. Connect your Facebook **Page** and the **Instagram Business** account linked
   to it (IG must be a Business/Creator account linked to the Page).
4. In Graph API Explorer, grant `pages_manage_posts`, `pages_read_engagement`,
   `instagram_basic`, `instagram_content_publish`.
5. Generate a Page token, then exchange it for a **long-lived** token
   (`/oauth/access_token?grant_type=fb_exchange_token`). Store as
   `FB_PAGE_ACCESS_TOKEN`.
6. `FB_PAGE_ID` and `IG_USER_ID`: read from
   `GET /me/accounts` and `GET /<page-id>?fields=instagram_business_account`.

### Getting the Google Indexing API key

1. In Google Cloud, create a **service account** and a JSON key.
2. Enable the **Indexing API** for the project.
3. In Search Console, add the service account's email as an **Owner** of the
   property.
4. Paste the JSON (single line) as `GOOGLE_INDEXING_SA_KEY`.

> Note: Google officially supports the Indexing API only for `JobPosting` /
> `BroadcastEvent` pages. For general news, the `news-sitemap.xml` + IndexNow are
> the primary signals; this channel is wired for completeness and is safe to
> leave unconfigured.

## Apply

1. **Table** — apply `supabase/migrations/20260628120000_content_distribution_log.sql`
   (runs with the normal migration flow).
2. **Cron** — apply `db/manual-migrations/20260628_distribution_cron.sql` once
   against the project DB (needs `pg_cron`, `pg_net`, `vault` — already enabled).
3. Set the env vars above for whichever channels you want live.

## Manual / test run

```bash
SECRET="$AGENTS_WEBHOOK_SECRET"
curl -X POST https://daily-canberra-site.lovable.app/api/public/hooks/distribute \
  -H "content-type: application/json" \
  -H "x-hook-secret: $SECRET" \
  -d '{"city":"canberra","limit":5,"channels":["indexnow"]}'
```

The response reports per-channel `{ done, skipped, failed }` so you can verify a
channel is configured before enabling the rest.
