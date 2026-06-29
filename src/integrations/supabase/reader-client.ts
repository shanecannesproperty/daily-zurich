// Reader-only Supabase client for the public "Have Your Say" feature. Persists
// the reader's magic-link session under a DISTINCT storageKey ("tdc-reader-auth")
// so reader and admin sessions can never collide in localStorage — a signed-in
// reader is NOT an admin, and holding a reader session does not satisfy the
// role-based admin gate (a reader has no user_roles row).
//
// All reader WRITES (submit / flag / author-hide) go through SECURITY DEFINER
// rpcs on this client, which carries the reader JWT so the rpc sees auth.uid().
// The rpc is the security boundary. This client is wrapped by withCityGuard, so
// every rpc call must pass { city: citySlug() } (the comments rpcs all take a city arg).
//
// NEVER import this from an admin route or from a server-only module.
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config";
import { withCityGuard } from "@/lib/city-guard";

const rawReaderSupabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "tdc-reader-auth",
  },
});

export const readerSupabase = withCityGuard(rawReaderSupabase);
