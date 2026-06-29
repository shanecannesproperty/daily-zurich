import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getAllArticles } from "@/lib/data.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { ArticleCard } from "@/components/ArticleCard";
import { JsonLd } from "@/components/JsonLd";
import { buildMeta, canonicalLinks, absUrl } from "@/lib/seo";
import { cityName, siteName } from "@/lib/city";


const searchSchema = z.object({ page: z.coerce.number().int().min(1).max(500).default(1) });

function allNewsQuery(page: number) {
  return queryOptions({
    queryKey: ["allNews", page],
    queryFn: () => getAllArticles({ data: { page } }),
  });
}

export const Route = createFileRoute("/news")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(allNewsQuery(deps.page)),
  head: () => ({
    meta: buildMeta({
      title: `News | ${siteName()}`,
      description: `Latest news from ${cityName()}, published by ${siteName()}.`,
      path: `/news`,
    }),
    links: canonicalLinks(`/news`),
  }),
  component: Page,
});

function Page() {
  const { page } = Route.useSearch();
  const { data } = useSuspenseQuery(allNewsQuery(page));
  return (
    <>
      <SiteHeader activePath="/news" />
      <main className="container-news py-10">
        <nav className="meta mb-4" aria-label="Breadcrumb">
          <a href="/">Home</a> &nbsp;/&nbsp; <span>News</span>
        </nav>
        <h1 className="h1-news">News</h1>
        <p className="dek mt-2">Latest news from {cityName()}.</p>
        <div aria-hidden className="mt-6 hairline" />
        {data.rows.length === 0 ? (
          <div className="mt-12 flex flex-col items-center text-center py-16 border border-[var(--hairline)] max-w-xl mx-auto px-8">
            <p className="kicker mb-4">Coming soon</p>
            <p className="dek mb-8">Local and national stories shaping {cityName()}.</p>
            <div className="flex flex-wrap gap-3 justify-center mb-8">
              <a href="/today" className="btn-ghost">Today</a>
              <a href="/events" className="btn-ghost">Events</a>
            </div>
            <a href="/subscribe" className="btn-primary">Subscribe free</a>
          </div>
        ) : (
          <div className="mt-8 grid gap-x-10 gap-y-10 md:grid-cols-3">
            {data.rows.map((a) => (
              <ArticleCard key={a.id} a={a} />
            ))}
          </div>
        )}
        <div className="mt-12 flex items-center justify-between border-t border-[var(--hairline)] pt-6">
          {page > 1 ? (
            <a href={`/news?page=${page - 1}`} className="btn-ghost">
              Newer stories
            </a>
          ) : (
            <span />
          )}
          {data.rows.length >= data.perPage ? (
            <a href={`/news?page=${page + 1}`} className="btn-ghost">
              Older stories
            </a>
          ) : (
            <span />
          )}
        </div>
      </main>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `News | ${siteName()}`,
          url: absUrl("/news"),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: absUrl("/") },
            { "@type": "ListItem", position: 2, name: "News", item: absUrl("/news") },
          ],
        }}
      />
    </>
  );
}
