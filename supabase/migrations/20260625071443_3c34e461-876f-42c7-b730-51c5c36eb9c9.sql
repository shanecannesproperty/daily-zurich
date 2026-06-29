do $$
begin
  if exists (select 1 from pg_tables where schemaname='public' and tablename='agent_config') then
    execute 'alter table public.agent_config add column if not exists cancel_requested_at timestamptz';
    execute 'create index if not exists agent_config_city_cancel_idx on public.agent_config (city, cancel_requested_at desc)';
  end if;
end$$;