-- Service-role-only accessor so edge functions (e.g. content-health-agent) can
-- read a Vault secret by name. The vault schema is not exposed via PostgREST,
-- so a SECURITY DEFINER function is the supported path. Locked down: anon and
-- authenticated cannot execute it; only service_role can.
create or replace function public.get_vault_secret(p_name text)
returns text
language sql
security definer
set search_path = vault, public
as $$
  select decrypted_secret from vault.decrypted_secrets where name = p_name limit 1;
$$;

revoke all on function public.get_vault_secret(text) from public;
revoke all on function public.get_vault_secret(text) from anon;
revoke all on function public.get_vault_secret(text) from authenticated;
grant execute on function public.get_vault_secret(text) to service_role;
