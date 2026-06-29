import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTrendingNow } from "@/lib/articles.functions";
import { CATEGORY_LABELS } from "@/lib/schema";

export function TrendingNow() {
  const fetcher = useServerFn(getTrendingNow);
  const { data } = useQuery({
    queryKey: ["trending-now"],
    queryFn: () => fetcher(),
    staleTime: 5 * 60_000,
  });
  const articles = data?.articles ?? [];
  if (articles.length === 0) return null;

  return (
    <section className="border-t border-[var(--ink)] pt-5">
      <h2 className="kicker mb-4">🔥 Trending Now</h2>
      <ol className="space-y-4">
        {articles.map((a, i) => {
          const label =
            a.category && a.category in CATEGORY_LABELS
              ? CATEGORY_LABELS[a.category as keyof typeof CATEGORY_LABELS]
              : a.category;
          return (
            <li key={a.id}>
              <a
                href={`/article/${a.slug}`}
                className="group flex items-start gap-4 no-underline text-[var(--ink)]"
              >
                <span
                  className="serif text-3xl leading-none shrink-0 w-8 text-right"
                  style={{ color: "var(--ink-muted)" }}
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="serif text-base leading-snug line-clamp-2 block transition-colors group-hover:text-[var(--ink-red)]">
                    {a.title}
                  </span>
                  {label && (
                    <span
                      className="mt-1 inline-block text-[10px] uppercase tracking-[0.14em] font-semibold"
                      style={{ color: "var(--ink-red)" }}
                    >
                      {label}
                    </span>
                  )}
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
