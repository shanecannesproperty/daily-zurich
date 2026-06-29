import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { z } from "zod";
import { getWorldArticles } from "@/lib/data.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { JsonLd } from "@/components/JsonLd";
import { buildMeta, canonicalLinks, absUrl } from "@/lib/seo";
import { siteName } from "@/lib/city";
import type { ArticleRow } from "@/lib/schema";
import { formatDate } from "@/lib/date";

const LABEL = "The World";

function worldQuery(page: number) {
  return queryOptions({
    queryKey: ["world", page],
    queryFn: () => getWorldArticles({ data: { page } }),
  });
}

const searchSchema = z.object({ page: z.coerce.number().int().min(1).max(500).default(1) });

export const Route = createFileRoute("/world")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(worldQuery(deps.page)),
  head: () => ({
    meta: buildMeta({
      title: `${LABEL} | ${siteName()}`,
      description:
        "The world, explained for Australia. Evergreen explainers from The Daily World desk.",
      path: "/world",
    }),
    links: canonicalLinks("/world"),
  }),
  component: WorldPage,
});

function WorldCard({ a }: { a: ArticleRow }) {
  const href = `/world/${a.slug}`;
  return (
    <article>
      {a.hero_image && (
        <a href={href} className="block no-underline">
          <img
            src={a.hero_image}
            alt={a.title}
            className="aspect-[3/2] w-full object-cover"
            loading="lazy"
            decoding="async"
            width={800}
            height={533}
          />
        </a>
      )}
      <p className="kicker mt-3">The World</p>
      <h3 className="h2-news mt-1">
        <a href={href} className="no-underline hover:underline">
          {a.title}
        </a>
      </h3>
      {a.dek && <p className="meta mt-2 line-clamp-3">{a.dek}</p>}
      <p className="meta mt-2">
        {a.author ? `By ${a.author}` : "AI-generated"}
        {a.published_at && <> &middot; {formatDate(a.published_at)}</>}
      </p>
    </article>
  );
}

function WorldPage() {
  const { page } = Route.useSearch();
  const { data } = useSuspenseQuery(worldQuery(page));
  return (
    <>
      <SiteHeader activePath="/world" />
      <main className="container-news py-10">
        <nav className="meta mb-4" aria-label="Breadcrumb">
          <a href="/">Home</a> &nbsp;/&nbsp; <span>{LABEL}</span>
        </nav>
        <h1 className="h1-news">{LABEL}</h1>
        <p className="dek mt-2">The world, explained for Australia.</p>
        <div aria-hidden className="mt-6 hairline" />
        {data.rows.length === 0 ? (
          <p className="mt-10 meta">No world stories published yet.</p>
        ) : (
          <div className="mt-8 grid gap-x-10 gap-y-10 md:grid-cols-3">
            {data.rows.map((a) => (
              <WorldCard key={a.id} a={a} />
            ))}
          </div>
        )}
        <div className="mt-12 flex items-center justify-between border-t border-[var(--hairline)] pt-6">
          {page > 1 ? (
            <a href={`/world?page=${page - 1}`} className="btn-ghost">
              Newer stories
            </a>
          ) : (
            <span />
          )}
          {data.rows.length >= data.perPage ? (
            <a href={`/world?page=${page + 1}`} className="btn-ghost">
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
          name: `${LABEL} | ${siteName()}`,
          url: absUrl("/world"),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: absUrl("/") },
            { "@type": "ListItem", position: 2, name: LABEL, item: absUrl("/world") },
          ],
        }}
      />
    </>
  );
}
