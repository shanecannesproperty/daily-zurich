// Monthly archive — paginated list of articles published in a given
// year/month. Ranks for long-tail "[city] news [month] [year]" search.
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { z } from "zod";
import { SiteHeader } from "@/components/SiteHeader";
import { getArchiveMonth } from "@/lib/data.functions";
import { buildMeta, canonicalLinks } from "@/lib/seo";
import { cityName, siteName } from "@/lib/city";
import { CATEGORY_LABELS } from "@/lib/schema";
import { formatDate } from "@/lib/date";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const searchSchema = z.object({ page: z.coerce.number().int().min(1).max(50).default(1) });

function monthQuery(year: number, month: number, page: number) {
  return queryOptions({
    queryKey: ["archive-month", year, month, page],
    queryFn: () => getArchiveMonth({ data: { year, month, page } }),
    staleTime: 60 * 60 * 1000,
  });
}

export const Route = createFileRoute("/archive/$year/$month")({
  validateSearch: (s) => searchSchema.parse(s),
  loaderDeps: ({ search: { page } }) => ({ page }),
  loader: async ({ params, deps, context }) => {
    const year = Number.parseInt(params.year, 10);
    const month = Number.parseInt(params.month, 10);
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      throw notFound();
    }
    return context.queryClient.ensureQueryData(monthQuery(year, month, deps.page));
  },
  head: ({ params }) => {
    const year = Number.parseInt(params.year, 10);
    const month = Number.parseInt(params.month, 10);
    const monthLabel = Number.isFinite(month) && month >= 1 && month <= 12
      ? MONTH_NAMES[month - 1]
      : "Archive";
    return {
      meta: buildMeta({
        title: `${cityName()} news — ${monthLabel} ${year} | ${siteName()}`,
        description: `Every ${cityName()} story we published in ${monthLabel} ${year}.`,
        path: `/archive/${params.year}/${params.month}`,
      }),
      links: canonicalLinks(`/archive/${params.year}/${params.month}`),
    };
  },
  component: ArchiveMonthPage,
  errorComponent: ({ error }) => (
    <div className="container-news py-16" role="alert">
      <h1 className="h1-news">Archive unavailable</h1>
      <p className="meta mt-3">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="container-news py-16">
      <h1 className="h1-news">Month not found</h1>
      <p className="meta mt-3">
        <Link to="/archive">Browse the archive</Link>
      </p>
    </div>
  ),
});

function ArchiveMonthPage() {
  const params = Route.useParams();
  const { page } = Route.useSearch();
  const year = Number.parseInt(params.year, 10);
  const month = Number.parseInt(params.month, 10);
  const { data } = useSuspenseQuery(monthQuery(year, month, page));
  const monthLabel = MONTH_NAMES[month - 1];

  const hasNext = data.rows.length === data.perPage;
  const hasPrev = page > 1;

  return (
    <>
      <SiteHeader activePath="/archive" />
      <main className="container-news py-10">
        <p className="kicker">
          <Link to="/archive" className="no-underline hover:underline">Archive</Link>
        </p>
        <h1 className="h1-news mt-2">
          {cityName()} news — {monthLabel} {year}
        </h1>
        <p className="dek mt-3">
          Every story we published in {monthLabel} {year}.
        </p>

        {data.rows.length === 0 ? (
          <p className="meta mt-10">No stories published this month.</p>
        ) : (
          <ol className="mt-8 divide-y divide-[var(--hairline,#d6d2c9)] border-y border-[var(--hairline,#d6d2c9)]">
            {data.rows.map((a) => (
              <li key={a.id} className="py-5">
                <p className="kicker">
                  {CATEGORY_LABELS[a.category as keyof typeof CATEGORY_LABELS] ?? a.category}
                  {a.published_at ? <> · {formatDate(a.published_at)}</> : null}
                </p>
                <h2 className="serif mt-1 text-lg font-semibold leading-snug">
                  <Link
                    to="/article/$slug"
                    params={{ slug: a.slug }}
                    className="no-underline hover:underline"
                  >
                    {a.title}
                  </Link>
                </h2>
                {a.dek ? <p className="meta mt-1 line-clamp-2">{a.dek}</p> : null}
              </li>
            ))}
          </ol>
        )}

        <nav aria-label="Pagination" className="mt-8 flex items-center justify-between">
          {hasPrev ? (
            <Link
              to="/archive/$year/$month"
              params={params}
              search={{ page: page - 1 }}
              className="underline"
            >
              ← Previous
            </Link>
          ) : <span />}
          <span className="meta">Page {page}</span>
          {hasNext ? (
            <Link
              to="/archive/$year/$month"
              params={params}
              search={{ page: page + 1 }}
              className="underline"
            >
              Next →
            </Link>
          ) : <span />}
        </nav>
      </main>
    </>
  );
}
