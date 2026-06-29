// Archive index — lists the months that have enough published articles
// (>= 5) to warrant a dedicated archive page. Each one ranks for long-tail
// "[city] news [month] [year]" queries and stays valuable forever.
import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { listArchiveMonths } from "@/lib/data.functions";
import { buildMeta, canonicalLinks } from "@/lib/seo";
import { cityName, siteName } from "@/lib/city";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const archiveQuery = queryOptions({
  queryKey: ["archive-months"],
  queryFn: () => listArchiveMonths(),
  staleTime: 60 * 60 * 1000,
});

export const Route = createFileRoute("/archive")({
  loader: ({ context }) => context.queryClient.ensureQueryData(archiveQuery),
  head: () => ({
    meta: buildMeta({
      title: `News archive — ${siteName()}`,
      description: `Browse the ${siteName()} archive of ${cityName()} news by month.`,
      path: "/archive",
    }),
    links: canonicalLinks("/archive"),
  }),
  component: ArchiveIndexPage,
  errorComponent: ({ error }) => (
    <div className="container-news py-16" role="alert">
      <h1 className="h1-news">Archive unavailable</h1>
      <p className="meta mt-3">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="container-news py-16">No archive yet.</div>
  ),
});

function ArchiveIndexPage() {
  const { data } = useSuspenseQuery(archiveQuery);
  // Group by year for the listing.
  const byYear = new Map<number, { month: number; count: number }[]>();
  for (const m of data.months) {
    if (!byYear.has(m.year)) byYear.set(m.year, []);
    byYear.get(m.year)!.push({ month: m.month, count: m.count });
  }
  const years = [...byYear.keys()].sort((a, b) => b - a);

  return (
    <>
      <SiteHeader activePath="/archive" />
      <main className="container-news py-10">
        <p className="kicker">Archive</p>
        <h1 className="h1-news mt-2">{siteName()} news archive</h1>
        <p className="dek mt-3 max-w-[60ch]">
          Every month of {cityName()} news, in one place. Browse by month
          below.
        </p>
        {years.length === 0 ? (
          <p className="meta mt-10">No months with enough coverage yet — keep reading.</p>
        ) : (
          <div className="mt-8 space-y-10">
            {years.map((year) => (
              <section key={year}>
                <h2 className="serif text-2xl font-semibold">{year}</h2>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {byYear
                    .get(year)!
                    .sort((a, b) => b.month - a.month)
                    .map((m) => (
                      <li key={m.month} className="border-t border-[var(--hairline,#d6d2c9)] pt-2">
                        <Link
                          to="/archive/$year/$month"
                          params={{ year: String(year), month: String(m.month).padStart(2, "0") }}
                          className="serif text-base no-underline hover:underline"
                        >
                          {MONTH_NAMES[m.month - 1]} {year}
                        </Link>
                        <span className="meta ml-2">({m.count})</span>
                      </li>
                    ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
