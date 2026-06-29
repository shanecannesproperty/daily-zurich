// Browser-side reader (public commenter) writes for "Have Your Say". Every call
// uses the authenticated reader session (readerSupabase) and goes through a
// SECURITY DEFINER rpc that is the real security boundary:
//   - submit_comment forces user_id=auth.uid(), status='pending', city=article.city.
//   - flag_comment is idempotent, never changes status, rate-limited.
//   - author_hide_comment only touches the caller's own row.
// readerSupabase is withCityGuard-wrapped, so each rpc passes { city: citySlug() }.
// There is NO reader table grant; these rpcs are the only reader write paths.
import { readerSupabase } from "@/integrations/supabase/reader-client";
import { citySlug } from "@/lib/city";
import type { CommentRow } from "@/lib/schema";

// Returns the freshly-inserted pending row. The caller shows it optimistically in
// COMPONENT-LOCAL state only — it must never be written into the shared/public
// query cache, so other readers never receive a pending comment.
export function readerSubmitComment(input: {
  articleId: string;
  body: string;
  authorName?: string | null;
}) {
  return readerSupabase.rpc("submit_comment", {
    city: citySlug(),
    article_id: input.articleId,
    body: input.body,
    author_name: input.authorName ?? null,
  }) as unknown as Promise<{ data: CommentRow | null; error: { message: string } | null }>;
}

export function readerFlagComment(commentId: string, reason?: string | null) {
  return readerSupabase.rpc("flag_comment", {
    city: citySlug(),
    comment_id: commentId,
    reason: reason ?? null,
  });
}

export function readerAuthorHideComment(commentId: string, hidden: boolean) {
  return readerSupabase.rpc("author_hide_comment", {
    city: citySlug(),
    comment_id: commentId,
    hidden,
  });
}
