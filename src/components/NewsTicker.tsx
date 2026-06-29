// Slim auto-scrolling "LATEST" ticker shown below the site nav. Headlines
// come from getTickerHeadlines (5 most recent in last 24h, fallback to most
// recent overall). Animation is pure CSS; we duplicate the list inline so
// the scroll loops seamlessly with no JS work per frame.
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTickerHeadlines } from "@/lib/articles.functions";

export function NewsTicker() {
  const fetchTicker = useServerFn(getTickerHeadlines);
  const { data } = useQuery({
    queryKey: ["ticker-headlines"],
    queryFn: () => fetchTicker(),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
  const items = data?.items ?? [];
  if (items.length === 0) return null;

  // Duplicate the list so the marquee can loop with a -50% translate.
  const loop = [...items, ...items];

  return (
    <div
      className="news-ticker relative flex items-stretch border-b border-[var(--hairline,rgba(0,0,0,0.12))] bg-[var(--paper,#f5f3ee)] print:hidden"
      aria-label="Latest headlines"
    >
      <span
        className="flex shrink-0 items-center gap-2 bg-[var(--ink-red,#A32D2D)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white"
        aria-hidden
      >
        <span
          className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-white"
        />
        Latest
      </span>
      <div className="news-ticker__viewport relative flex-1 overflow-hidden">
        <ul className="news-ticker__track flex whitespace-nowrap py-1.5">
          {loop.map((it, i) => (
            <li
              key={`${it.slug}-${i}`}
              className="flex shrink-0 items-center pl-6 pr-6 text-[13px] leading-tight before:mr-6 before:text-[var(--ink-grey,#6b6b6b)] before:content-['•'] first:before:hidden"
            >
              <a
                href={`/article/${it.slug}`}
                className="text-[var(--ink,#2d2d2d)] no-underline hover:underline"
              >
                {it.title}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
