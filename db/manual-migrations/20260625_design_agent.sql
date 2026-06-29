-- Design Agent: autonomous design audit + token-level auto-refinement.
-- Tables, RPCs, and pg_cron schedule for the hourly run.

-- One-time setup AFTER applying this migration:
--   1. In Supabase Studio SQL editor, run:
--        select vault.create_secret('<DESIGN_AGENT_SECRET from project env>', 'design_agent_secret');
--      (You can find the value in project secrets. The cron job reads it from vault.)
--   2. Verify pg_cron sees the schedule:
--        select * from cron.job where jobname = 'design-agent-hourly';

create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists pgcrypto;

-- ---------- design_tokens ----------
-- The whitelist of CSS custom properties the agent is allowed to mutate.
-- locked = true means the agent must never touch it (palette, font family,
-- accent rules per house style memory).
create table if not exists public.design_tokens (
  token_name text primary key,
  default_value text not null,
  current_value text not null,
  unit text,
  min_value text,
  max_value text,
  selector text not null default ':root',
  kind text not null default 'length',
  description text,
  locked boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by text
);

grant select on public.design_tokens to anon, authenticated;
grant all on public.design_tokens to service_role;

alter table public.design_tokens enable row level security;

drop policy if exists "design_tokens public read" on public.design_tokens;
create policy "design_tokens public read"
on public.design_tokens
for select
to anon, authenticated
using (true);

-- Seed lever tokens. Only safe levers. Palette and fonts deliberately excluded.
insert into public.design_tokens (token_name, default_value, current_value, unit, min_value, max_value, kind, description) values
  ('--dc-container-max', '1180px', '1180px', 'px', '1080', '1320', 'length', 'Maximum content container width.'),
  ('--dc-container-pad', '20px', '20px', 'px', '16', '32', 'length', 'Container horizontal padding.'),
  ('--dc-section-gap', '40px', '40px', 'px', '24', '72', 'length', 'Vertical rhythm between sections.'),
  ('--dc-h1-size-min', '32px', '32px', 'px', '28', '40', 'length', 'H1 minimum size (mobile).'),
  ('--dc-h1-size-max', '56px', '56px', 'px', '48', '72', 'length', 'H1 maximum size (desktop).'),
  ('--dc-h2-size-min', '22px', '22px', 'px', '20', '28', 'length', 'H2 minimum size.'),
  ('--dc-h2-size-max', '30px', '30px', 'px', '26', '40', 'length', 'H2 maximum size.'),
  ('--dc-h3-size', '21px', '21px', 'px', '18', '26', 'length', 'H3 size.'),
  ('--dc-dek-size', '18px', '18px', 'px', '16', '22', 'length', 'Dek (sub-headline) size.'),
  ('--dc-body-size', '17px', '17px', 'px', '15', '19', 'length', 'Body text base size.'),
  ('--dc-body-line', '1.65', '1.65', '', '1.45', '1.8', 'number', 'Body line-height.'),
  ('--dc-headline-line', '1.02', '1.02', '', '1.0', '1.15', 'number', 'Headline line-height.'),
  ('--dc-kicker-track', '0.12em', '0.12em', 'em', '0.08', '0.18', 'length', 'Kicker letter-spacing.'),
  ('--dc-hairline-weight', '1px', '1px', 'px', '1', '2', 'length', 'Hairline divider weight.'),
  ('--dc-rule-weight', '2px', '2px', 'px', '1', '4', 'length', 'Section rule weight.'),
  ('--dc-card-pad', '0px', '0px', 'px', '0', '24', 'length', 'Optional card internal padding.')
on conflict (token_name) do nothing;

-- Locked sentinel rows so the agent never re-introduces these as tweakable.
insert into public.design_tokens (token_name, default_value, current_value, kind, locked, description) values
  ('--ink-red', '#A32D2D', '#A32D2D', 'color', true, 'LOCKED: house red accent.'),
  ('--background', '#f5f3ee', '#f5f3ee', 'color', true, 'LOCKED: paper background.'),
  ('--ink', '#2d2d2d', '#2d2d2d', 'color', true, 'LOCKED: ink foreground.'),
  ('--font-serif', '"DM Serif Display", Georgia, serif', '"DM Serif Display", Georgia, serif', 'font-family', true, 'LOCKED: display serif.'),
  ('--font-sans', '"Fira Sans", system-ui, sans-serif', '"Fira Sans", system-ui, sans-serif', 'font-family', true, 'LOCKED: UI sans.')
on conflict (token_name) do nothing;

-- ---------- design_runs ----------
create table if not exists public.design_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running',
  error text,
  benchmark_targets text[] not null default '{}',
  pages_audited text[] not null default '{}',
  findings_count int not null default 0,
  applied_count int not null default 0,
  pending_count int not null default 0,
  notes text
);

grant select on public.design_runs to authenticated;
grant all on public.design_runs to service_role;
alter table public.design_runs enable row level security;

drop policy if exists "design_runs admin read" on public.design_runs;
create policy "design_runs admin read"
on public.design_runs
for select
to authenticated
using (true);

-- ---------- design_proposals ----------
create table if not exists public.design_proposals (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.design_runs(id) on delete set null,
  area text not null,
  severity text not null check (severity in ('low','med','high')),
  risk text not null check (risk in ('safe','risky')),
  issue text not null,
  evidence_url text,
  proposed_fix text not null,
  css_patch jsonb,
  status text not null default 'pending_review' check (status in ('pending_review','auto_applied','approved','rejected','reverted')),
  page_path text,
  benchmark_ref text,
  screenshot_before text,
  screenshot_after text,
  created_at timestamptz not null default now(),
  applied_at timestamptz,
  reverted_at timestamptz,
  reviewed_by text
);

create index if not exists design_proposals_status_idx on public.design_proposals (status, created_at desc);
create index if not exists design_proposals_run_idx on public.design_proposals (run_id);

grant select, update on public.design_proposals to authenticated;
grant all on public.design_proposals to service_role;
alter table public.design_proposals enable row level security;

drop policy if exists "design_proposals admin read" on public.design_proposals;
create policy "design_proposals admin read"
on public.design_proposals
for select
to authenticated
using (true);

drop policy if exists "design_proposals admin update" on public.design_proposals;
create policy "design_proposals admin update"
on public.design_proposals
for update
to authenticated
using (true)
with check (true);

-- ---------- design_token_history ----------
create table if not exists public.design_token_history (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.design_runs(id) on delete set null,
  proposal_id uuid references public.design_proposals(id) on delete set null,
  token_name text not null references public.design_tokens(token_name),
  old_value text not null,
  new_value text not null,
  reverted_at timestamptz,
  reverted_by text,
  created_at timestamptz not null default now()
);

create index if not exists design_token_history_token_idx on public.design_token_history (token_name, created_at desc);

grant select on public.design_token_history to authenticated;
grant all on public.design_token_history to service_role;
alter table public.design_token_history enable row level security;

drop policy if exists "design_token_history admin read" on public.design_token_history;
create policy "design_token_history admin read"
on public.design_token_history
for select
to authenticated
using (true);

-- ---------- RPC: apply_design_token ----------
-- Single security-definer entry point. Enforces whitelist, locked flag, daily
-- rate limit, and records history. Called by the agent route via service role.
create or replace function public.apply_design_token(
  _token_name text,
  _new_value text,
  _run_id uuid,
  _proposal_id uuid,
  _actor text default 'agent'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  _row public.design_tokens%rowtype;
  _today_count int;
begin
  select * into _row from public.design_tokens where token_name = _token_name;
  if not found then
    raise exception 'unknown_token: %', _token_name;
  end if;
  if _row.locked then
    raise exception 'token_locked: %', _token_name;
  end if;

  -- Daily cap: 12 token mutations per day across all agent activity.
  select count(*) into _today_count
  from public.design_token_history
  where created_at > now() - interval '24 hours'
    and reverted_by is null;
  if _today_count >= 12 and _actor = 'agent' then
    raise exception 'daily_cap_reached';
  end if;

  insert into public.design_token_history (run_id, proposal_id, token_name, old_value, new_value)
  values (_run_id, _proposal_id, _token_name, _row.current_value, _new_value);

  update public.design_tokens
  set current_value = _new_value, updated_at = now(), updated_by = _actor
  where token_name = _token_name;

  return true;
end;
$$;

grant execute on function public.apply_design_token(text, text, uuid, uuid, text) to service_role;

-- ---------- RPC: revert_design_token ----------
create or replace function public.revert_design_token(
  _history_id uuid,
  _actor text default 'admin'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  _h public.design_token_history%rowtype;
begin
  select * into _h from public.design_token_history where id = _history_id;
  if not found then
    raise exception 'history_not_found';
  end if;
  if _h.reverted_at is not null then
    return true;
  end if;
  update public.design_tokens
  set current_value = _h.old_value, updated_at = now(), updated_by = _actor
  where token_name = _h.token_name;
  update public.design_token_history
  set reverted_at = now(), reverted_by = _actor
  where id = _history_id;
  return true;
end;
$$;

grant execute on function public.revert_design_token(uuid, text) to authenticated, service_role;

-- ---------- pg_cron: hourly trigger ----------
-- Posts to the public agent endpoint with bearer secret read from vault.
-- If the vault entry is missing, the cron call simply 401s and is a no-op.
do $$
declare
  _url text := 'https://daily-canberra-site.lovable.app/api/public/agent/design-refine';
begin
  perform cron.unschedule('design-agent-hourly') from cron.job where jobname = 'design-agent-hourly';
exception when others then null;
end $$;

select cron.schedule(
  'design-agent-hourly',
  '7 * * * *',
  $cron$
    select net.http_post(
      url := 'https://daily-canberra-site.lovable.app/api/public/agent/design-refine',
      headers := jsonb_build_object(
        'content-type', 'application/json',
        'authorization', 'Bearer ' || coalesce(
          (select decrypted_secret from vault.decrypted_secrets where name = 'design_agent_secret' limit 1),
          ''
        )
      ),
      body := jsonb_build_object('source','cron','scheduled_at', now()),
      timeout_milliseconds := 120000
    );
  $cron$
);
