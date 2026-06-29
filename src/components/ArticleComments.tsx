// "Have Your Say" comments under an article.
//
// SECURITY (non-negotiable):
//   * body AND author_name are rendered as PLAIN TEXT via JSX interpolation.
//     NEVER use dangerouslySetInnerHTML here. This is the stored-XSS guarantee.
//   * Pre-moderation (Voller): a submitted comment is status='pending' in the DB
//     and is NOT publicly visible. The author sees their own pending row
//     OPTIMISTICALLY, held in COMPONENT-LOCAL state ONLY — it is never written
//     into the shared/public query cache other readers receive.
//   * Reads go through the listArticleComments server fn (rpc, city-asserted);
//     writes go through readerSupabase rpcs ({ city: citySlug() }). No client path can
//     issue a city-blind or cross-city query.
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listArticleComments } from "@/lib/data.functions";
import { readerSubmitComment, readerFlagComment, readerAuthorHideComment } from "@/lib/reader-db";
import { readerSupabase } from "@/integrations/supabase/reader-client";
import { useReaderSession } from "@/hooks/useReaderSession";
import { siteDomain } from "@/lib/city";
import { timeAgo } from "@/lib/date";
import type { CommentRow } from "@/lib/schema";

const MAX = 2000;
const AMBER_AT = 1900;

function commentsQueryKey(articleId: string) {
  return ["article-comments", articleId] as const;
}

// Magic-link sign-in card (signed-out state). emailRedirectTo is a HARDCODED
// canonical-origin constant (siteDomain()) + the article path — never
// window.location.href or a request-derived Host.
function MagicLinkSignIn({ articleSlug }: { articleSlug?: string }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const redirect = `${siteDomain()}${articleSlug ? `/article/${articleSlug}` : "/"}`;
    const { error } = await readerSupabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true, emailRedirectTo: redirect },
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return <p className="meta mt-3">Check your email for a sign-in link.</p>;
  }
  return (
    <form onSubmit={onSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
      <label htmlFor="hys-email" className="sr-only">
        Email
      </label>
      <input
        id="hys-email"
        type="email"
        required
        autoComplete="email"
        placeholder="you@example.com"
        className="field flex-1"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button type="submit" disabled={busy} className="btn-primary">
        {busy ? "Sending…" : "Sign in to comment"}
      </button>
      {error ? <p className="text-sm text-[var(--ink-red)]">{error}</p> : null}
    </form>
  );
}

// A locally-held optimistic pending row (NEVER enters the public query cache).
interface PendingComment extends CommentRow {
  _pending: true;
}

export function ArticleComments({
  articleId,
  articleSlug,
}: {
  articleId: string;
  articleSlug?: string;
}) {
  const { userId, loading: sessionLoading } = useReaderSession();
  const queryClient = useQueryClient();

  const approved = useQuery({
    queryKey: commentsQueryKey(articleId),
    queryFn: () => listArticleComments({ data: { articleId } }),
  });

  // Author's own optimistic pending rows — COMPONENT-LOCAL only.
  const [pending, setPending] = useState<PendingComment[]>([]);
  // Reset local pending rows when navigating to a different article so one
  // article's optimistic rows never leak into another's view.
  useEffect(() => {
    setPending([]);
  }, [articleId]);
  // Rows the viewer has flagged (collapsed for the reporter only).
  const [reported, setReported] = useState<Set<string>>(new Set());
  // Rows removed from this viewer's list via author hide (optimistic).
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  // The single most-recently hidden row that still has an active 5s Undo window.
  const [undoable, setUndoable] = useState<string | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [body, setBody] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: async () => {
      const res = await readerSubmitComment({
        articleId,
        body: body.trim(),
        authorName: authorName.trim() || null,
      });
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: (row) => {
      // Optimistic pending row goes into LOCAL state only, never the cache.
      if (row) setPending((p) => [{ ...row, _pending: true }, ...p]);
      setBody("");
      setError(null);
    },
    onError: (e: unknown) => {
      setError(e instanceof Error ? e.message : "Could not post your comment.");
    },
  });

  const flag = useMutation({
    mutationFn: async (commentId: string) => {
      await readerFlagComment(commentId, null);
    },
    onMutate: (commentId: string) => {
      setReported((s) => new Set(s).add(commentId));
    },
    onError: (_e, commentId) => {
      // Roll back the optimistic "Reported" state so the control is retryable.
      setReported((s) => {
        const next = new Set(s);
        next.delete(commentId);
        return next;
      });
    },
  });

  const authorHide = useMutation({
    mutationFn: async (commentId: string) => {
      await readerAuthorHideComment(commentId, true);
    },
    onMutate: (commentId: string) => {
      setHidden((s) => new Set(s).add(commentId));
      // Offer a 5s Undo for the author's own hide (admin hide is not undoable,
      // but this component only ever calls author_hide_comment for the author).
      setUndoable(commentId);
      if (undoTimer.current) clearTimeout(undoTimer.current);
      undoTimer.current = setTimeout(
        () => setUndoable((cur) => (cur === commentId ? null : cur)),
        5000,
      );
    },
    onError: (_e, commentId) => {
      setHidden((s) => {
        const next = new Set(s);
        next.delete(commentId);
        return next;
      });
      setUndoable((cur) => (cur === commentId ? null : cur));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: commentsQueryKey(articleId) });
    },
  });

  // Undo a still-pending author hide: un-hide via the rpc (hidden:false) and
  // restore the row to this viewer's list.
  const undoHide = useMutation({
    mutationFn: async (commentId: string) => {
      await readerAuthorHideComment(commentId, false);
    },
    onMutate: (commentId: string) => {
      setHidden((s) => {
        const next = new Set(s);
        next.delete(commentId);
        return next;
      });
      setUndoable((cur) => (cur === commentId ? null : cur));
      if (undoTimer.current) clearTimeout(undoTimer.current);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: commentsQueryKey(articleId) });
    },
  });

  const approvedRows = useMemo(
    () => (approved.data ?? []).filter((c) => !hidden.has(c.id)),
    [approved.data, hidden],
  );

  const charCount = body.length;
  const overAmber = charCount >= AMBER_AT;
  const canPost = body.trim().length > 0 && !submit.isPending;

  return (
    <div data-comments="true">
      {/* Composer / sign-in */}
      {sessionLoading ? null : userId ? (
        <div className="mb-8">
          <textarea
            rows={4}
            maxLength={MAX}
            className="field w-full"
            placeholder="Share your thoughts…"
            aria-label="Share your thoughts"
            value={body}
            disabled={submit.isPending}
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="mt-1 flex items-center justify-between gap-4">
            <p className="meta">
              Comments are reviewed before they appear (Australian law makes the page operator
              responsible for what is published here).
            </p>
            <span
              className={`meta tabular-nums ${overAmber ? "text-[var(--ink-red)]" : ""}`}
              aria-live="polite"
            >
              {charCount}/{MAX}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <input
              type="text"
              maxLength={80}
              className="field w-48"
              placeholder="Name (optional)"
              aria-label="Name (optional)"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              disabled={submit.isPending}
            />
            <button
              type="button"
              className="btn-primary"
              disabled={!canPost}
              onClick={() => submit.mutate()}
            >
              {submit.isPending ? "Posting…" : "Post comment"}
            </button>
          </div>
          {error ? <p className="mt-2 text-sm text-[var(--ink-red)]">{error}</p> : null}
        </div>
      ) : (
        <div className="mb-8 border border-[var(--hairline)] bg-[var(--surface)] p-4">
          <p className="serif text-lg">Join the conversation</p>
          <p className="meta mt-1">
            Sign in with your email to comment. Comments are reviewed before they appear.
          </p>
          <MagicLinkSignIn articleSlug={articleSlug} />
        </div>
      )}

      {/* Undo bar for a just-hidden row (5s window). */}
      {undoable ? (
        <div
          className="mb-4 flex items-center justify-between border border-[var(--hairline)] bg-[var(--surface)] px-4 py-2"
          data-undo-bar="true"
        >
          <span className="meta">Comment hidden.</span>
          <button
            type="button"
            className="meta underline"
            onClick={() => undoHide.mutate(undoable)}
          >
            Undo
          </button>
        </div>
      ) : null}

      {/* Author's optimistic pending rows (local only) */}
      {pending.map((c) => (
        <article
          key={c.id}
          className="mb-4 border-l-2 border-dashed border-[var(--ink)] pl-4"
          data-pending="true"
        >
          <p className="meta">
            <strong>{c.author_name || "Reader"}</strong> &middot;{" "}
            <span className="uppercase tracking-widest text-[var(--ink-red)]">
              Pending review: only you can see this
            </span>
          </p>
          <p className="serif mt-1 whitespace-pre-wrap">{c.body}</p>
        </article>
      ))}

      {/* Approved list */}
      {approved.isLoading ? (
        <p className="meta">Loading comments…</p>
      ) : approvedRows.length === 0 && pending.length === 0 ? (
        <p className="meta">Be the first to share your thoughts.</p>
      ) : (
        <ul className="divide-y divide-[var(--hairline)]">
          {approvedRows.map((c) => {
            const isReported = reported.has(c.id);
            return (
              <li key={c.id} className="py-4">
                <p className="meta">
                  <strong>{c.author_name || "Reader"}</strong>
                  {c.created_at ? <> &middot; {timeAgo(c.created_at)}</> : null}
                </p>
                <p className="serif mt-1 whitespace-pre-wrap">{c.body}</p>
                {userId ? (
                  <div className="mt-2 flex items-center gap-4">
                    <button
                      type="button"
                      className="meta underline disabled:no-underline disabled:opacity-60"
                      disabled={isReported || flag.isPending}
                      onClick={() => flag.mutate(c.id)}
                    >
                      {isReported ? "Reported" : "Report"}
                    </button>
                    <button
                      type="button"
                      className="meta underline"
                      onClick={() => authorHide.mutate(c.id)}
                    >
                      Hide
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
