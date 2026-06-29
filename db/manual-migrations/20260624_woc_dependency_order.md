# WoC port: migration dependency order

Source of truth: `20260624_woc_port_catalogue.md`. This file extracts the
apply-order into batches you can run one at a time. Each batch should be
green (dry-run + applied) before starting the next.

Skip flags repeated here: `[COLLIDES]` = clashes with an existing Daily
Canberra table, must reconcile manually. `[DATA]` = data-only, do in
Batch D. `[REWRITE]` = contains hardcoded source-project URL/key, must
rewrite before applying.

## Prerequisites (manual, no SQL)

Create storage buckets via the Supabase storage tool BEFORE Batch 1:
`article-covers`, `daily-briefings`, `guide-media`, `event-illustrations`.

## Batch 0 — Quick-win security tightenings (no new tables)

Apply first to validate plumbing. All three are guarded against missing
objects so they no-op cleanly on Daily Canberra.

- 072 fix `articles_public_read` to avoid `has_role` for anon
- 103 narrow `weekly_picks` public-read window; lock `match_*` EXECUTE
- 117 hide `webhooks.secret`; comment on `events.submitter_email`

File produced: `20260624_woc_batch0_quickwins.sql`.

## Batch 1 — Foundation: additive tables only, no cross-deps

Order is migration number ascending. Each row is a new table or a column
add that depends only on tables already in Daily Canberra (`articles`,
`profiles`, `user_roles`).

```text
002  grants lockdown + move vector to extensions
004  SECURITY DEFINER lockdowns on has_role/handle_new_user
011  articles.cover_source / credit_name / credit_url
014  ingestion_runs
017  ai_question_log
020  seo_pages
023  content_insights
039  webhook_invalid_payloads
040  page_views
042  page_views indexes
043  competitor_insights
047  webhooks + webhook_deliveries
078  advertising_enquiries
081  articles.meta jsonb
087  articles.cover_source_url + index
```

## Batch 2 — Events extensions

Depends on the existing `events` table. Skip the CREATE-events parts of
005; only ALTER columns this site doesn't have.

```text
009  subscribers, sponsors, weekly_roundups, da_feed_status + events submitter cols
010  column-level anon SELECT on events
012  events.video_url / image_source / credit_*
018  (skip — superseded by 010)
021  events review_status / hold_reason / quality_score / audience_tags
022  events.image_width / image_height
024  events.summary_json + da_commentary + summary_flags
025  tighten summary_flags anon-insert
026  defence-in-depth revokes
027  demand_events / demand_signals / demand_clusters
028  reengagement_preferences / reengagement_sends
029  daily_briefings (requires daily-briefings bucket)
032  events.is_duplicate_of + duplicate_detections
034  re-grant events columns
050  expand summary_flags entity types
055  re-publish events to realtime with column allow-list
059, 060  events grants (idempotent)
061  pull events out of realtime
066, 068  submitter_email revoke churn
069  subscribers.confirmation_token + backfill
074  events source_status etc. (skip the venues clauses)
089  event_cover_history
090  cover_regeneration_runs
094  search_path hardening on email fns (verify fns exist first)
101  restrict daily_briefings public read (hide audio_path)
105  final canonical events GRANT list
117  webhook secret hide (already in Batch 0)
118, 119  [DATA]
```

## Batch 3 — Cross-project URL rewrites (cron + http_post triggers)

Must rewrite hardcoded URLs and keys before applying. Replace
`https://project--3abb4c9a-...lovable.app` with
`https://project--f48acd0e-0703-43c5-a10b-e312730972fa.lovable.app` and
publishable key `sb_publishable_-f1gdV105xLMTjqd8tA3Fw_2FRvcxQM` with this
project's publishable key.

```text
015  email_infra (apply ONCE, 016 is identical duplicate — skip)
033  notify_new_event_for_processing + capture_interaction_demand_signal
044  get_agent_cron_status RPC (depends on pg_cron from 015)
046  auto-journalist-daily cron job
085  enqueue_wellness_journalist_run
```

## Batch 4 — Section schemas (only if section is in scope)

```text
Guides (collides with existing guides table — reconcile shape first):
  048, 049, 051, 056, 057, 058, 067, 083

Wellness:
  084, 091, 092, 097

Property (depends on property_developments from another source migration):
  053, 054, 062, 064 (skip data), 070, 075, 106, 115

Jobs:
  096, 098, 099, 100, 102, 110

DA enrichment:
  053, 054
```

## Batch 5 — Ahrefs admin

```text
111, 112, 113, 114, 116
```

## Batch D — Data backfill (separate sign-off required)

All `[DATA-skip]` rows from the catalogue. Confirm PII handling and the
target rows exist with matching UUIDs (they won't — these are source
project UUIDs). Treat as a manual seed exercise, not a SQL port.

```text
013, 035, 036, 037, 038, 064 (seed parts), 065, 071, 073, 077, 079, 080,
082, 086, 088, 093, 095, 118, 119
```

## Hard skips

```text
001  initial schema — collides with everything
005  recreates events
016  duplicate of 015
031  recreates agent_runs with different column shape
```

## Validator

Run `20260624_woc_dryrun_validator.sql` first against the current
database. It reports collisions and missing deps without writing.
