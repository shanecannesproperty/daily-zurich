// Admin-only Supabase client. Persists the session in localStorage so that
// /admin pages can authenticate as a real Supabase user. Imported ONLY by
// files under src/routes/admin.* and src/lib/admin-db.ts.
// NEVER import this from a public route or component.
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config";
import { withCityGuard } from "@/lib/city-guard";

const rawAdminSupabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "tdc-admin-auth",
  },
});

export const adminSupabase = withCityGuard(rawAdminSupabase);
// Escape hatch for legitimate cross-city reads (e.g. the /admin/network
// scoreboard which aggregates site_events_daily across every city). Use
// sparingly and never for write paths.
export const adminSupabaseUnscoped = rawAdminSupabase;

