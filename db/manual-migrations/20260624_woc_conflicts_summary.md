# WoC port: top conflicts and skip list

Companion to `20260624_woc_port_catalogue.md`. Read this first.

## Hard skips (do not port, ever)

| #   | Source                 | Why skip                                                                                                                               |
| --- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 001 | initial schema         | recreates `articles`, `profiles`, `user_roles`, `has_role`, `handle_new_user` — collides with everything in Daily Canberra             |
| 005 | events + site_settings | recreates this site's `events` table                                                                                                   |
| 016 | email_infra duplicate  | byte-identical to 015; applying twice is an error                                                                                      |
| 031 | agent_runs recreate    | column shape differs from this site's `agent_runs` (`agent_name/summary/created_count` vs `agent/items_written/cost_cents`). Keep ours |

## Must-rewrite before applying (hardcoded source URL + publishable key)

Every one of these contains `https://project--3abb4c9a-...lovable.app`
and key `sb_publishable_-f1gdV105xLMTjqd8tA3Fw_2FRvcxQM`. Replace both
with this project's values, or delete the cron/trigger and rely on
`/api/admin/run-all-agents`.

| #   | What it does                                                                      | Rewrite                                                                          |
| --- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 033 | trigger `notify_new_event_for_processing` and `capture_interaction_demand_signal` | swap URL + key, or drop the trigger and call hook from app code                  |
| 046 | schedules `auto-journalist-daily` cron                                            | swap URL + key, or schedule via app cron instead                                 |
| 085 | `enqueue_wellness_journalist_run` SECURITY DEFINER fn                             | swap URL + key                                                                   |
| 015 | email_infra cron/secret setup                                                     | the SQL is fine; the vault secret + cron URL must be set manually after applying |

## Reconcile schema before applying (existing-table collisions)

| #   | Conflicting table | Action                                                                                                                                                                                                                                         |
| --- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 005 | `events`          | skip CREATE; cherry-pick ALTERs from later migrations                                                                                                                                                                                          |
| 048 | `guides`          | source shape (`topic_id`, `template`, `sections jsonb`, `embedding`, `stale`) differs — decide whether to migrate Daily Canberra's `guides` to source shape or keep ours and skip everything that depends on it (049, 051, 056, 057, 067, 083) |
| 031 | `agent_runs`      | skip; keep this site's shape                                                                                                                                                                                                                   |

## Data-only migrations to defer (Batch D)

These reference UUIDs that exist only in the source project. Don't port
as SQL — copy rows via the data sync batch with mapped IDs, or re-seed
content from scratch.

`013, 035, 036, 037, 038, 064 (seed parts), 065, 071, 073, 077, 079,
080, 082, 086, 088, 093, 095, 118, 119`

## Depends on tables not yet present

| #                            | Missing dep                                                                       | Resolution                                                                        |
| ---------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 051, 074 (venues lines)      | `venues`                                                                          | apply only after porting the venues table from the WoC base schema                |
| 062, 064, 070, 075, 106, 115 | `property_developments`                                                           | port property schema first, or drop the property section                          |
| 063                          | `push_subscriptions`, `property_enquiries`, `wellness_enquiries`, `demand_events` | read 063 line-by-line; comment out clauses for tables not yet present             |
| 094                          | a long list of email fns                                                          | will partially fail if those fns aren't installed — verify or split the migration |

## Apply-order quick rule

1. Run `20260624_woc_dryrun_validator.sql` → must return OK.
2. Apply `20260624_woc_batch0_quickwins.sql`.
3. Re-run validator. Then proceed to Batch 1 in
   `20260624_woc_dependency_order.md`.
