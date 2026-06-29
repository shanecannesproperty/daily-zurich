// Homepage "Load more stories" button. Initial articles render server-side
// in index.tsx; this client island appends batches of 10 below them. We pass
// the initial article count so the first paginated request starts at the
// correct offset and never duplicates a story already on the page.
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArticleCard } from "@/components/ArticleCard";
import { getMoreHomepageArticles } from "@/lib/data.functions";
import type { ArticleRow } from "@/lib/schema";

export function LoadMoreStories({ initialCount }: { initialCount: number }) {
  const fetchMore = useServerFn(getMoreHomepageArticles);
  const [rows, setRows] = useState<ArticleRow[]>([]);
  const [offset, setOffset] = useState(initialCount);
  const [busy, setBusy] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadMore() {
    if (busy || !hasMore) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetchMore({ data: { offset } });
      // De-dupe by slug — defensive in case the server returns an article
      // already shown above (e.g. lead story published after initial load).
      const seen = new Set(rows.map((r) => r.slug));
      const fresh = res.rows.filter((r) => !seen.has(r.slug));
      setRows((prev) => [...prev, ...fresh]);
      setOffset(offset + res.perPage);
      setHasMore(res.hasMore);
    } catch (err) {
      console.error("[load-more] failed", err);
      setError("Couldn't load more stories. Try again?");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="container-news py-10 border-t border-[var(--hairline)]">
      {rows.length > 0 && (
        <>
          <h2 className="kicker">More stories</h2>
          <div className="mt-4 grid gap-x-10 gap-y-10 md:grid-cols-3">
            {rows.map((a) => (
              <ArticleCard key={a.id} a={a} />
            ))}
          </div>
        </>
      )}

      <div className="mt-8 flex flex-col items-center gap-3">
        {error && <p className="meta text-[var(--ink-red)]" role="alert">{error}</p>}
        {hasMore ? (
          <button
            type="button"
            onClick={loadMore}
            disabled={busy}
            className="btn-primary inline-flex items-center gap-2 disabled:opacity-60"
          >
            {busy && (
              <span
                aria-hidden
                className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"
              />
            )}
            {busy ? "Loading…" : "Load more stories"}
          </button>
        ) : (
          rows.length > 0 && (
            <p className="meta">You&apos;ve reached the end of today&apos;s briefing.</p>
          )
        )}
      </div>
    </section>
  );
}
