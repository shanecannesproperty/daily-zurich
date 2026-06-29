import { createFileRoute, notFound } from "@tanstack/react-router";
import { z } from "zod";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getArticlesByCategory } from "@/lib/data.functions";
import { ARTICLE_CATEGORIES, CATEGORY_LABELS, type ArticleCategory } from "@/lib/schema";
import { SiteHeader } from "@/components/SiteHeader";
import { ArticleCard } from "@/components/ArticleCard";
import { EmptyState } from "@/components/EmptyState";
import { JsonLd } from "@/components/JsonLd";
import { buildMeta, canonicalLinks, absUrl } from "@/lib/seo";
import { cityName, siteName } from "@/lib/city";

const searchSchema = z.object({ page: z.coerce.number().int().min(1).max(500).default(1) });

function isValidCategory(slug: string): slug is ArticleCategory {
  return (ARTICLE_CATEGORIES as readonly string[]).includes(slug);
}

function categoryArchiveQuery(category: ArticleCategory, page: number) {
  return queryOptions({
    queryKey: ["categoryArchive", category, page],
    queryFn: () => getArticlesByCategory({ data: { category, page } }),
  });
}

export const Route = createFileRoute("/category/$slug")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: ({ params, context, deps }) => {
    if (!isValidCategory(params.slug)) throw notFound();
    return context.queryClient.ensureQueryData(categoryArchiveQuery(params.slug, deps.page));
  },
  head: ({ params }) => {
    if (!isValidCategory(params.slug)) return { meta: [{ title: "Not found" }] };
    const label = CATEGORY_LABELS[params.slug];
    return {
      meta: buildMeta({
        title: `${label} — ${siteName()}`,
        description: `Latest ${label.toLowerCase()} news from ${cityName()}. Updated daily.`,
        path: `/category/${params.slug}`,
      }),
      links: canonicalLinks(`/category/${params.slug}`),
    };
  },
  notFoundComponent: () => (
    <>
      <SiteHeader />
      <main className="container-news py-16">
        <h1 className="h1-news">Topic not found</h1>
        <p className="dek mt-3">
          That topic doesn&apos;t exist. <a href="/">Return home</a>.
        </p>
      </main>
    </>
  ),
  component: CategoryArchivePage,
});

function CategoryArchivePage() {
  const { slug } = Route.useParams();
  const { page } = Route.useSearch();
  // Loader throws notFound() for invalid categories, so slug is always valid here.
  const category = slug as ArticleCategory;
  const label = CATEGORY_LABELS[category];
  const { data } = useSuspenseQuery(categoryArchiveQuery(category, page));

  return (
    <>
      <SiteHeader activePath={`/category/${category}`} />
      <main className="container-news py-10">
        <nav className="meta mb-4" aria-label="Breadcrumb">
          <a href="/">Home</a> &nbsp;/&nbsp; <a href="/news">Topics</a> &nbsp;/&nbsp;{" "}
          <span>{label}</span>
        </nav>
        <h1 className="h1-news">{label}</h1>
        <p className="dek mt-2">
          All {label.toLowerCase()} coverage from {cityName()}.
        </p>
        <div aria-hidden className="mt-6 hairline" />

        {data.rows.length === 0 ? (
          <EmptyState
            title={`No ${label.toLowerCase()} stories yet`}
            message={`We haven't published anything in ${label} for ${cityName()} recently. Browse other sections or subscribe to be first when we do.`}
            primaryHref="/"
            primaryLabel="Browse all articles →"
          />
        ) : (
          <div className="mt-8 grid gap-x-10 gap-y-10 md:grid-cols-3">
            {data.rows.map((a) => (
              <ArticleCard key={a.id} a={a} />
            ))}
          </div>
        )}

        <div className="mt-12 flex items-center justify-between border-t border-[var(--hairline)] pt-6">
          {page > 1 ? (
            <a href={`/category/${category}?page=${page - 1}`} className="btn-ghost">
              Newer stories
            </a>
          ) : (
            <span />
          )}
          {data.rows.length >= data.perPage ? (
            <a href={`/category/${category}?page=${page + 1}`} className="btn-ghost">
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
          name: `${label} — ${siteName()}`,
          url: absUrl(`/category/${category}`),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: absUrl("/") },
            {
              "@type": "ListItem",
              position: 2,
              name: label,
              item: absUrl(`/category/${category}`),
            },
          ],
        }}
      />
    </>
  );
}
