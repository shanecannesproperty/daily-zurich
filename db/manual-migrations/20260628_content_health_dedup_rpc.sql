-- Dedup accessor for content-health-agent: returns newest published,
-- non-sponsored articles with a hero that have NOT already been judged "keep"
-- in the last 7 days. Doing the exclusion in SQL (NOT EXISTS) avoids re-paying
-- Anthropic for unchanged content every 30 minutes and lets each run advance
-- to fresh/stale articles. Service-role only.

-- Index supporting the NOT EXISTS correlated subquery (lookup by article_id,
-- then decision/recency). Without it the dedup degrades as the log grows.
create index if not exists content_health_log_article
  on public.content_health_log (article_id, decision, created_at desc);
create or replace function public.articles_needing_health_check(p_limit int default 25)
returns table (id uuid, city text, title text, hero_image text)
language sql
stable
as $$
  select a.id, a.city, a.title, a.hero_image
  from public.articles a
  where a.is_published
    and a.hero_image is not null and a.hero_image <> ''
    and a.category::text is distinct from 'sponsored'
    and coalesce(a.is_sponsored, false) = false
    and not exists (
      select 1 from public.content_health_log l
      where l.article_id = a.id
        and l.decision = 'keep'
        and l.created_at > now() - interval '7 days'
    )
  order by a.published_at desc nulls last
  limit greatest(1, least(coalesce(p_limit, 25), 60));
$$;

revoke all on function public.articles_needing_health_check(int) from public;
revoke all on function public.articles_needing_health_check(int) from anon;
revoke all on function public.articles_needing_health_check(int) from authenticated;
grant execute on function public.articles_needing_health_check(int) to service_role;
