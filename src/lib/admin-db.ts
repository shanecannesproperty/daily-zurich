// Browser-side admin data access. Every call uses the authenticated session
// (adminSupabase). City is scoped via citySlug() on every read and write
// (except guide_entries, which has no city column and is scoped by guide_id).
import { adminSupabase, adminSupabaseUnscoped } from "@/integrations/supabase/admin-client";
import { citySlug } from "@/lib/city";



type CityTable = "articles" | "events" | "guides" | "listings" | "article_comments";

export function adminList(
  table: CityTable,
  order: { col: string; asc?: boolean } = { col: "created_at", asc: false },
) {
  return adminSupabase
    .from(table)
    .select("*")
    .eq("city", citySlug())
    .order(order.col, { ascending: order.asc ?? false });
}

export function adminGet(table: CityTable, id: string) {
  return adminSupabase.from(table).select("*").eq("city", citySlug()).eq("id", id).maybeSingle();
}

export function adminInsert<T extends Record<string, unknown>>(table: CityTable, row: T) {
  return adminSupabase
    .from(table)
    .insert({ ...row, city: citySlug() })
    .select()
    .single();
}

export function adminUpdate<T extends Record<string, unknown>>(
  table: CityTable,
  id: string,
  patch: T,
) {
  // Strip city from patch to avoid accidental cross-city writes.
  const safe = { ...patch } as Record<string, unknown>;
  delete safe.city;
  return adminSupabase.from(table).update(safe).eq("city", citySlug()).eq("id", id).select().single();
}

export function adminDelete(table: CityTable, id: string) {
  return adminSupabase.from(table).delete().eq("city", citySlug()).eq("id", id);
}

// ---------------------------------------------------------------------------
// Editorial review queue (admin). The screen_article DB trigger sets
// review_status on every article write: low-risk pieces become 'auto_approved'
// and publish; pieces naming a person/org in a sensitive context become 'held'
// and are forced is_published=false until a human approves. Approving sets
// review_status='approved' + is_published=true; the trigger never re-screens a
// row a human has decided. Rejecting keeps it unpublished.
// ---------------------------------------------------------------------------
export function adminListArticlesByReview(status: string) {
  return adminSupabase
    .from("articles")
    .select("*")
    .eq("city", citySlug())
    .eq("review_status", status)
    .order("created_at", { ascending: false })
    .limit(200);
}

export function reviewArticle(id: string, action: "approve" | "reject", reviewer: string | null) {
  const patch =
    action === "approve"
      ? {
          review_status: "approved",
          is_published: true,
          published_at: new Date().toISOString(),
          reviewed_at: new Date().toISOString(),
          reviewed_by: reviewer,
        }
      : {
          review_status: "rejected",
          is_published: false,
          reviewed_at: new Date().toISOString(),
          reviewed_by: reviewer,
        };
  return adminUpdate("articles", id, patch);
}

// Guides go through the same screen (narrow severe-only calibration, since
// advisory guides legitimately use words like "scam"/"dodgy"). Held guides are
// is_published=false until approved. Guides have no published_at column.
export function adminListGuidesByReview(status: string) {
  return adminSupabase
    .from("guides")
    .select("*")
    .eq("city", citySlug())
    .eq("review_status", status)
    .order("created_at", { ascending: false })
    .limit(200);
}

export function reviewGuide(id: string, action: "approve" | "reject", reviewer: string | null) {
  const patch =
    action === "approve"
      ? {
          review_status: "approved",
          is_published: true,
          reviewed_at: new Date().toISOString(),
          reviewed_by: reviewer,
        }
      : {
          review_status: "rejected",
          is_published: false,
          reviewed_at: new Date().toISOString(),
          reviewed_by: reviewer,
        };
  return adminUpdate("guides", id, patch);
}

// guide_entries are scoped by guide_id (no city column).
export function adminListEntries(guideId: string) {
  return adminSupabase
    .from("guide_entries")
    .select("*")
    .eq("guide_id", guideId)
    .order("rank", { ascending: true, nullsFirst: false });
}

export function adminInsertEntry(row: Record<string, unknown>) {
  return adminSupabase.from("guide_entries").insert(row).select().single();
}

export function adminUpdateEntry(id: string, patch: Record<string, unknown>) {
  return adminSupabase.from("guide_entries").update(patch).eq("id", id).select().single();
}

export function adminDeleteEntry(id: string) {
  return adminSupabase.from("guide_entries").delete().eq("id", id);
}

// Inbox: read-only.
export function adminListSubscribers() {
  return adminSupabase
    .from("subscribers")
    .select("*")
    .eq("city", citySlug())
    .order("created_at", { ascending: false })
    .limit(500);
}

export function adminListEnquiries() {
  return adminSupabase
    .from("enquiries")
    .select("*")
    .eq("city", citySlug())
    .order("created_at", { ascending: false })
    .limit(500);
}

export function adminUpdateEnquiry(
  id: string,
  patch: { status?: string; routed_to?: string | null },
) {
  return adminSupabase
    .from("enquiries")
    .update(patch)
    .eq("city", citySlug())
    .eq("id", id)
    .select()
    .single();
}

// Analytics (read-only). Subscriber and event reads are owner-gated by RLS.
export function adminSubscriberCount(status?: string) {
  let q = adminSupabase
    .from("subscribers")
    .select("id", { count: "exact", head: true })
    .eq("city", citySlug());
  if (status) q = q.eq("status", status);
  return q;
}

// Per-day rollup of first-party events (city-scoped). Returns one row per
// (event_name, day). The view inherits the table RLS, so this is owner-only.
// human=true excludes rows where is_bot=true so the dashboard shows real traffic.
export function adminEventDaily(sinceIso: string, humanOnly = true) {
  const base = adminSupabase
    .from("site_events_daily")
    .select("event_name,day,events,sessions")
    .eq("city", citySlug())
    .gte("day", sinceIso);
  const filtered = humanOnly ? base.eq("is_bot", false) : base;
  return filtered.order("day", { ascending: true });
}

// Network-wide rollup across all cities. Returns one row per city with
// aggregated pageviews, sessions, article reads, and subscriber count.
// Used by the /admin/network scoreboard.
export function adminNetworkStats(sinceIso: string) {
  return adminSupabaseUnscoped
    .from("site_events_daily")
    .select("city,event_name,events,sessions")
    .gte("day", sinceIso)
    .eq("is_bot", false);
}

export function adminNetworkSubscribers() {
  return adminSupabaseUnscoped
    .from("subscribers")
    .select("city", { count: "exact", head: false })
    .eq("status", "active");
}

// Most-read articles by article_read events (city-scoped).
export function adminTopContent(limit = 10) {
  return adminSupabase
    .from("site_events_top_content")
    .select("path_ref,reads")
    .eq("city", citySlug())
    .order("reads", { ascending: false })
    .limit(limit);
}

// UA-category daily rollup (for Source breakdown panel).
export function adminCategoryDaily(sinceIso: string) {
  return adminSupabase
    .from("site_events_by_category_daily")
    .select("day,ua_category,events,sessions")
    .eq("city", citySlug())
    .gte("day", sinceIso)
    .order("day", { ascending: true });
}

// Track-failure count for the reconciliation panel (last N days).
export function adminTrackFailures(sinceIso: string) {
  return adminSupabase
    .from("track_failures")
    .select("day,count")
    .eq("city", citySlug())
    .gte("day", sinceIso);
}

// app_settings read/write (bot patterns admin).
export function adminGetSetting(key: string) {
  return adminSupabase.from("app_settings").select("value,updated_at").eq("key", key).maybeSingle();
}

export function adminUpsertSetting(key: string, value: unknown) {
  return adminSupabase
    .from("app_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
}

// ---------------------------------------------------------------------------
// Have Your Say moderation (admin). Reads are role-gated by RLS (ac_admin_read_all
// requires has_role(auth.uid(),'admin')) AND forced to .eq('city', citySlug()) here, so
// an admin only ever sees this city's comments. Writes go through the
// moderate_comment SECURITY DEFINER rpc, which re-checks has_role + asserts city.
// ---------------------------------------------------------------------------
export type CommentFilter = "pending" | "flagged" | "approved" | "hidden" | "rejected";

export function adminListComments(filter: CommentFilter) {
  let q = adminSupabase.from("article_comments").select("*").eq("city", citySlug());
  if (filter === "flagged") {
    // Flagged = currently-public rows that have accrued at least one flag.
    q = q.eq("status", "approved").gt("flag_count", 0);
  } else {
    q = q.eq("status", filter);
  }
  return q
    .order("flag_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);
}

export function moderateComment(id: string, action: "approve" | "hide" | "reject" | "restore") {
  return adminSupabase.rpc("moderate_comment", {
    city: citySlug(),
    comment_id: id,
    action,
  });
}

// Validation helpers.
const BANNED_AUTHORS = ["admin", "the team", "team", "editor", "staff"];
export function isValidByline(author: string | null | undefined): boolean {
  if (!author) return false;
  const a = author.trim().toLowerCase();
  if (a.length < 3) return false;
  if (BANNED_AUTHORS.includes(a)) return false;
  // Must have at least two words (first + last name).
  return a.split(/\s+/).filter(Boolean).length >= 2;
}

export function isValidUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Obituary submission review queue
// ---------------------------------------------------------------------------

export function adminListObituarySubmissions() {
  return adminSupabase
    .from("obituary_submissions")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(200);
}

// Approve a submission: create a published obituary row + mark submission done.
export async function adminPublishObituary(sub: {
  id: string;
  city: string;
  full_name: string;
  preferred_name: string | null;
  date_of_death: string | null;
  age: number | null;
  suburb: string | null;
  notice_type: string;
  body_text: string | null;
  service_details: string | null;
  funeral_director: string | null;
}) {
  const now = new Date().toISOString();
  const { data: obit, error: insertErr } = await adminSupabase
    .from("obituaries")
    .insert({
      city: sub.city,
      full_name: sub.full_name,
      preferred_name: sub.preferred_name,
      date_of_death: sub.date_of_death,
      age: sub.age,
      suburb: sub.suburb,
      notice_type: sub.notice_type,
      body_html: sub.body_text ? `<p>${sub.body_text.replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br>")}</p>` : null,
      service_details: sub.service_details,
      funeral_director: sub.funeral_director,
      status: "approved",
      is_published: true,
      published_at: now,
    })
    .select("id")
    .single();
  if (insertErr) return { error: insertErr };

  const { error: updErr } = await adminSupabase
    .from("obituary_submissions")
    .update({ status: "approved", linked_obituary_id: obit.id })
    .eq("id", sub.id);

  return { error: updErr };
}

export function adminRejectObituarySubmission(id: string) {
  return adminSupabase
    .from("obituary_submissions")
    .update({ status: "rejected" })
    .eq("id", id);
}
