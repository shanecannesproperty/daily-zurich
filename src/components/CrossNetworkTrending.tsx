// "Trending across Australia" — surfaces top stories from other cities in
// the Daily Network. Network-effect widget: every additional city makes the
// strip more valuable for every other city's homepage.
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getCrossNetworkTrending } from "@/lib/data.functions";
import { CITY_BRANDING } from "@/lib/city-config";

export function CrossNetworkTrending() {
  const fetchTrending = useServerFn(getCrossNetworkTrending);
  const { data } = useQuery({
    queryKey: ["cross-network-trending"],
    queryFn: () => fetchTrending(),
    staleTime: 10 * 60 * 1000,
  });
  const rows = data ?? [];
  if (rows.length === 0) return null;

  return (
    <aside
      aria-label="Trending across the Daily Network"
      className="border-y border-[var(--hairline,#d6d2c9)] bg-background"
    >
      <div className="container-news py-5">
        <p className="kicker text-[var(--accent,#A32D2D)]">Trending across Australia</p>
        <p className="meta mt-1">
          See what readers in Brisbane and Melbourne are talking about.
        </p>
        <ol className="mt-3 grid gap-3 sm:grid-cols-3">
          {rows.map((r, i) => {
            const brand = CITY_BRANDING[r.city];
            const origin = brand?.domain ?? `https://daily${r.city}.com.au`;
            const href = `${origin}/article/${r.slug}`;

            return (
              <li key={`${r.city}-${r.slug}`} className="border-t border-[var(--hairline,#d6d2c9)] pt-2">
                <p className="kicker text-[var(--ink,#2d2d2d)]/70">
                  {String(i + 1).padStart(2, "0")} · {r.cityLabel}
                </p>
                <h3 className="serif mt-1 text-base font-semibold leading-snug">
                  <a href={href} className="no-underline hover:underline" target="_blank" rel="noopener">
                    {r.title}
                  </a>
                </h3>
              </li>
            );
          })}
        </ol>
      </div>
    </aside>
  );
}
