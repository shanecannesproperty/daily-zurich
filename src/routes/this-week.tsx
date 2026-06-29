import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { CategoryNav } from "@/components/CategoryNav";
import { getThisWeek } from "@/lib/data.functions";
import { buildMeta, canonicalLinks } from "@/lib/seo";
import { cityName, siteName } from "@/lib/city";

const thisWeekQuery = queryOptions({
  queryKey: ["this-week"],
  queryFn: () => getThisWeek(),
});

export const Route = createFileRoute("/this-week")({
  loader: ({ context }) => context.queryClient.ensureQueryData(thisWeekQuery),
  head: () => ({
    meta: buildMeta({
      title: `This week in ${cityName()} — ${siteName()}`,
      description: `The seven biggest stories in ${cityName()} this week, ranked. The week that was, in one quick read.`,
      path: "/this-week",
    }),
    links: canonicalLinks("/this-week"),
  }),
  component: ThisWeekPage,
});

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-AU", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  } catch {
    return "";
  }
}

function ThisWeekPage() {
  const { rows } = useSuspenseQuery(thisWeekQuery).data;

  return (
    <>
      <SiteHeader />
      <CategoryNav />
      <main className="container-read py-12">
        <p className="kicker">Weekly wrap</p>
        <h1 className="h1-news mt-1">The week that was in {cityName()}</h1>
        <p className="dek mt-3 max-w-[60ch]">
          The seven stories that moved {cityName()} in the past seven days —
          everything you&apos;d want to know if you switched off for a week.
        </p>
        <p className="meta mt-3 italic text-[var(--ink-grey,#6b6b6b)]">
          Updated every Monday.
        </p>

        {rows.length === 0 ? (
          <p className="serif mt-10 text-base">
            No stories published in the past week. Check back soon.
          </p>
        ) : (
          <ol className="mt-10 divide-y divide-[var(--hairline,rgba(0,0,0,0.12))] border-t border-[var(--hairline,rgba(0,0,0,0.12))]">
            {rows.map((a, i) => (
              <li key={a.id} className="flex gap-5 py-6">
                <div
                  aria-hidden
                  className="serif shrink-0 text-4xl font-semibold leading-none text-[var(--ink-red,#A32D2D)]"
                  style={{ minWidth: "2.5rem" }}
                >
                  {i + 1}
                </div>
                <div className="min-w-0">
                  {a.category && (
                    <p className="kicker">{a.category}</p>
                  )}
                  <h2 className="h3-card mt-1">
                    <Link
                      to="/article/$slug"
                      params={{ slug: a.slug }}
                      className="hover:underline"
                    >
                      {a.title}
                    </Link>
                  </h2>
                  <p className="meta mt-1">{formatDate(a.published_at)}</p>
                </div>
              </li>
            ))}
          </ol>
        )}

        <div className="mt-12 border-t border-[var(--ink,#2d2d2d)] pt-6">
          <p className="serif text-base">
            Want the week ahead, too? The {siteName()} morning briefing lands in
            your inbox before 7am.
          </p>
          <Link to="/subscribe" className="btn-primary mt-4 inline-block">
            Subscribe free
          </Link>
        </div>
      </main>
    </>
  );
}
