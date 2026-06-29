import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getBreakingArticle } from "@/lib/articles.functions";

const SESSION_KEY = "dc:breaking-dismissed";
const AUTO_DISMISS_MS = 10_000;

export function BreakingNewsBanner() {
  const fetchBreaking = useServerFn(getBreakingArticle);
  const { data } = useQuery({
    queryKey: ["breaking-article"],
    queryFn: () => fetchBreaking(),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
  const article = data?.article ?? null;
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!article) return;
    try {
      const seen = sessionStorage.getItem(SESSION_KEY);
      if (seen === article.slug) {
        setDismissed(true);
        return;
      }
    } catch { /* ignore */ }
    setDismissed(false);
    const t = window.setTimeout(() => dismiss(article.slug), AUTO_DISMISS_MS);
    return () => window.clearTimeout(t);
  }, [article?.slug]);

  function dismiss(slug?: string) {
    setDismissed(true);
    try {
      if (slug) sessionStorage.setItem(SESSION_KEY, slug);
    } catch { /* ignore */ }
  }

  if (!article || dismissed) return null;
  return (
    <div
      role="alert"
      className="w-full bg-[var(--ink-live)] text-white"
      style={{ background: "var(--ink-live, #c0392b)" }}
    >
      <div className="container-news flex items-center gap-3 py-2 text-sm">
        <span className="rounded-sm bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]">
          Breaking
        </span>
        <span className="flex-1 truncate font-medium">{article.title}</span>
        <a
          href={`/article/${article.slug}`}
          className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-white underline-offset-2 hover:underline"
        >
          Read now →
        </a>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => dismiss(article.slug)}
          className="shrink-0 ml-1 text-white/80 hover:text-white text-lg leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
}
