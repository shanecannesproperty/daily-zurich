import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Flame } from "lucide-react";
import { listTrendingToday } from "@/lib/data.functions";
import { CATEGORY_LABELS } from "@/lib/schema";

export function TrendingToday({ currentSlug }: { currentSlug: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["trending-today", currentSlug],
    queryFn: () => listTrendingToday({ data: { excludeSlug: currentSlug } }),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return null;
  if (!data || data.length === 0) return null;

  return (
    <aside
      className="mt-10 border border-[var(--hairline)] bg-[var(--surface)] p-5 lg:mt-0"
      aria-labelledby="trending-today-h"
    >
      <h2
        id="trending-today-h"
        className="kicker flex items-center gap-2 text-[var(--ink-red)]"
      >
        <Flame size={16} aria-hidden="true" />
        Trending Today
      </h2>
      <ol className="mt-4 space-y-4">
        {data.map((a, i) => {
          const label = CATEGORY_LABELS[a.category as keyof typeof CATEGORY_LABELS] ?? a.category;
          return (
            <li key={a.slug} className="flex gap-3">
              <span
                className="serif text-2xl leading-none text-[var(--ink-red)] tabular-nums w-6 shrink-0"
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <Link
                  to="/article/$slug"
                  params={{ slug: a.slug }}
                  className="serif text-base leading-snug hover:underline block"
                >
                  {a.title}
                </Link>
                <span className="mt-1 inline-block label uppercase tracking-widest text-[10px] text-[var(--ink-muted,#6b6b6b)] border border-[var(--hairline)] px-1.5 py-0.5">
                  {label}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
