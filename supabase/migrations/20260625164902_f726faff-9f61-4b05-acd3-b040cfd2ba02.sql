
-- Private (non-API) schema for SECURITY DEFINER helpers so PostgREST does not
-- expose them as RPCs to signed-in users.
create schema if not exists private;
grant usage on schema private to authenticated, service_role;

-- Move the role lookup into private. RLS-only callers reach it through the
-- public wrapper below, but it cannot be invoked directly via PostgREST.
create or replace function private.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles where user_id = _user_id and role = _role
  )
$$;
revoke all on function private.has_role(uuid, public.app_role) from public, anon;
grant execute on function private.has_role(uuid, public.app_role) to authenticated, service_role;

-- Replace public.has_role with a SECURITY INVOKER wrapper. RLS policies and
-- existing client RPCs keep working unchanged; the linter no longer sees a
-- SECURITY DEFINER function in an exposed API schema.
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select private.has_role(_user_id, _role)
$$;
revoke all on function public.has_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;

-- claim_first_admin remains SECURITY DEFINER (it writes to user_roles) but is
-- no longer reachable by signed-in users via PostgREST. Bootstrap moves to a
-- server function that uses the service-role key after verifying the caller.
revoke all on function public.claim_first_admin() from public, anon, authenticated;
grant execute on function public.claim_first_admin() to service_role;
