// Browser-side admin data access for syndicated stories. Uses adminSupabase
// (authenticated session). All writes are also re-checked server-side by RLS
// (admin role required).
import { adminSupabase } from "@/integrations/supabase/admin-client";
import type { SyndicatedStatus } from "@/lib/syndication";

const SELECT =
  "id,source_id,guid,title,dek,link,source_published_at,fetched_at,status,commentary,commentary_draft,commentary_status,commentary_updated_at,reviewed_at,slug,source:syndication_sources(id,name,homepage_url)";

export function adminListSyndicated(status: SyndicatedStatus | "all" = "all", limit = 100) {
  let q = adminSupabase
    .from("syndicated_stories")
    .select(SELECT)
    .order("fetched_at", { ascending: false })
    .limit(limit);
  if (status !== "all") q = q.eq("status", status);
  return q;
}

export function adminListPendingCommentary(limit = 100) {
  return adminSupabase
    .from("syndicated_stories")
    .select(SELECT)
    .eq("commentary_status", "pending")
    .order("commentary_updated_at", { ascending: false })
    .limit(limit);
}

export function adminSetStoryStatus(id: string, status: SyndicatedStatus) {
  return adminSupabase
    .from("syndicated_stories")
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
}

// Saves an editor commentary draft. Marks it 'pending' so it isn't shown
// to readers until another admin approves it.
export function adminSaveCommentaryDraft(id: string, draft: string | null) {
  const trimmed = draft && draft.trim() ? draft.trim() : null;
  return adminSupabase
    .from("syndicated_stories")
    .update({
      commentary_draft: trimmed,
      commentary_status: trimmed ? "pending" : "none",
      commentary_updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();
}

// Publishes a pending draft. Copies draft -> commentary (public field) and
// clears the draft. Stamps reviewed_at so the audit trail shows approval.
export function adminApproveCommentary(id: string, draft: string) {
  return adminSupabase
    .from("syndicated_stories")
    .update({
      commentary: draft,
      commentary_draft: null,
      commentary_status: "published",
      commentary_updated_at: new Date().toISOString(),
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();
}

// Rejects a pending draft. Clears the draft, leaves the live commentary
// (if any) untouched, and resets status.
export function adminRejectCommentary(id: string) {
  return adminSupabase
    .from("syndicated_stories")
    .update({
      commentary_draft: null,
      commentary_status: "none",
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();
}

export function adminListSources() {
  return adminSupabase
    .from("syndication_sources")
    .select("*")
    .order("name", { ascending: true });
}

export function adminToggleSource(id: string, active: boolean) {
  return adminSupabase
    .from("syndication_sources")
    .update({ active })
    .eq("id", id)
    .select()
    .single();
}
