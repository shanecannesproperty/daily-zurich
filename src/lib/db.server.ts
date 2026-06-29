// Server-only data access layer. The *.server.ts extension blocks client imports.
// EVERY public read goes through cityTable() or guideEntries(), which inject the
// city filter (or the guide_id scope for entries) so it is impossible to query a
// table city-blind from anywhere in the app.
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/config";
import { citySlug } from "@/lib/city";
import { withCityGuard } from "@/lib/city-guard";

export const rawSupabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
});
const supabase = withCityGuard(rawSupabase);

type CityScopedTable =
  | "cities"
  | "articles"
  | "events"
  | "guides"
  | "listings"
  | "audio_briefings"
  | "live_feed"
  | "obituaries"
  | "jobs"
  | "daily_editions"
  // REAXML property-listings public views (city-scoped, read-only).
  | "public_available_property_listings"
  | "public_recently_sold";

export function cityTable(table: CityScopedTable) {
  // cities is keyed by slug, not city
  if (table === "cities") {
    return supabase.from("cities").select("*").eq("slug", citySlug());
  }
  return supabase.from(table).select("*").eq("city", citySlug());
}

export function cityTableSelect(table: Exclude<CityScopedTable, "cities">, columns: string) {
  return supabase.from(table).select(columns).eq("city", citySlug());
}

// guide_entries has NO city column. Scope by guide_id (which itself came from
// a city-filtered, published Canberra guide) AND require source_url IS NOT NULL.
export function guideEntries(guideId: string) {
  return supabase
    .from("guide_entries")
    .select("*")
    .eq("guide_id", guideId)
    .not("source_url", "is", null);
}

// court_feed is STATE-scoped, not city-scoped (see src/lib/court-state.ts and
// the UNSCOPED_ALLOWLIST in city-guard). A city reads its own state's judgments
// plus the federal tiers, so this helper filters by .in('state', states) rather
// than by city. It is the only sanctioned entry point for court_feed reads, so
// the data layer never queries court_feed without a state filter.
export function courtFeedByStates(states: readonly string[]) {
  return supabase
    .from("court_feed")
    .select("*")
    .in("state", states as string[])
    .eq("is_published", true);
}

// Efficient server-side count with city filter (head-only, no row transfer).
export function cityCount(table: Exclude<CityScopedTable, "cities">) {
  return supabase.from(table).select("id", { count: "exact", head: true }).eq("city", citySlug());
}

// Cross-city sentinel desk reads. World and national are is_live=false sentinel
// cities that share the DB without being real city deployments. These bypass
// the per-city city guard and filter by the explicit desk slug + is_published=true.
export function deskTable(desk: "world" | "national") {
  return rawSupabase.from("articles").select("*").eq("city", desk).eq("is_published", true);
}

// Cross-city network read — deliberately bypasses the city guard so the /network
// showcase page can pull one headline per city in a single round-trip. Must only
// be used for read-only display purposes, never for city-scoped writes or admin.
export function networkArticlesTable() {
  return rawSupabase.from("articles").select("*").eq("is_published", true);
}

// Same intent as networkArticlesTable() but with a caller-chosen projection.
// Use for cross-city widgets (e.g. /network trending) where we only need a
// few columns. Read-only display only; never for city-scoped writes.
export function networkArticlesSelect(columns: string) {
  return rawSupabase.from("articles").select(columns).eq("is_published", true);
}


// Raw client for INSERTs (subscribers, enquiries). These tables are anon-INSERT only.
export function dbInsertClient() {
  return supabase;
}

// Public "Have Your Say" comment list. There is NO table SELECT for the public
// list: anon holds no table grant on article_comments, so this read goes through
// the list_approved_comments(city, article_id) SECURITY DEFINER rpc, which
// filters city + status='approved' + author_hidden=false in the database. The
// city-guard sees city===citySlug(); the function re-asserts city against the parent
// article. This is the ONLY anon read path for comments.
export function listApprovedCommentsRpc(articleId: string) {
  return supabase.rpc("list_approved_comments", { city: citySlug(), article_id: articleId });
}

// Reads articles where city='national' (shared national desk content).
// Bypasses the city-guard intentionally — national articles are network-wide
// shared content, not tenant-scoped. NEVER use this for city-specific content.
export function nationalArticlesTable() {
  return rawSupabase.from("articles").select("*").eq("city", "national");
}
