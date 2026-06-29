import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getArticlesByCategory } from "@/lib/data.functions";
import {
  ARTICLE_CATEGORIES,
  CATEGORY_LABELS,
  type ArticleCategory,
  type ArticleRow,
} from "@/lib/schema";
import { SiteHeader } from "@/components/SiteHeader";
import { CategoryNav } from "@/components/CategoryNav";
import { ArticleCard } from "@/components/ArticleCard";
import { JsonLd } from "@/components/JsonLd";
import { buildMeta, canonicalLinks, absUrl } from "@/lib/seo";
import { cityName, siteName } from "@/lib/city";

function isValidCategory(slug: string): slug is ArticleCategory {
  return (ARTICLE_CATEGORIES as readonly string[]).includes(slug);
}

function categoryHubQuery(category: ArticleCategory) {
  return queryOptions({
    // Page 1 of /news/[category] (24 per page). "Load more" pages are fetched
    // client-side via the same server fn but kept in local state so the loader
    // contract stays cache-friendly for SSR.
    queryKey: ["newsHub", category, 1],
    queryFn: () => getArticlesByCategory({ data: { category, page: 1 } }),
  });
}

export const Route = createFileRoute("/news/$category")({
  loader: ({ params, context }) => {
    if (!isValidCategory(params.category)) throw notFound();
    return context.queryClient.ensureQueryData(categoryHubQuery(params.category));
  },
  head: ({ params }) => {
    if (!isValidCategory(params.category)) return { meta: [{ title: "Not found" }] };
    const label = CATEGORY_LABELS[params.category];
    const path = `/news/${params.category}`;
    return {
      meta: buildMeta({
        title: `${label} News | ${siteName()}`,
        description: `Latest ${label.toLowerCase()} news from ${siteName()}. Updated daily with local stories from ${cityName()}.`,
        path,
      }),
      links: canonicalLinks(path),
    };
  },
  notFoundComponent: () => (
    <>
      <SiteHeader />
      <main className="container-news py-16">
        <h1 className="h1-news">Category not found</h1>
        <p className="dek mt-3">
          That news category doesn&apos;t exist. <a href="/">Return home</a>.
        </p>
      </main>
    </>
  ),
  component: NewsHubPage,
});

function NewsHubPage() {
  const { category: slug } = Route.useParams();
  // Loader throws notFound() for invalid categories, so slug is always valid here.
  const category = slug as ArticleCategory;
  const label = CATEGORY_LABELS[category];

  const { data: firstPage } = useSuspenseQuery(categoryHubQuery(category));
  const fetchPage = useServerFn(getArticlesByCategory);
  const [extra, setExtra] = useState<ArticleRow[]>([]);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(firstPage.rows.length < firstPage.perPage);

  const articles = [...firstPage.rows, ...extra];

  async function loadMore() {
    if (busy || done) return;
    setBusy(true);
    try {
      const next = page + 1;
      const res = await fetchPage({ data: { category, page: next } });
      setExtra((prev) => [...prev, ...res.rows]);
      setPage(next);
      if (res.rows.length < res.perPage) setDone(true);
    } catch (err) {
      console.error("[news-hub] load more failed", err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SiteHeader activePath={`/news/${category}`} />
      <CategoryNav activeSlug={category} />
      <main className="container-news py-10">
        <nav className="meta mb-4" aria-label="Breadcrumb">
          <a href="/">Home</a> &nbsp;&gt;&nbsp; <span>{label}</span>
        </nav>
        <h1 className="h1-news">{label} News</h1>
        <p className="dek mt-2">
          Latest {label.toLowerCase()} stories from {cityName()}, updated daily.
        </p>
        <div aria-hidden className="mt-6 hairline" />

        {articles.length === 0 ? (
          <p className="mt-10 meta">
            No {label.toLowerCase()} articles yet &mdash; check back soon.
          </p>
        ) : (
          <>
            <div className="mt-8 grid gap-x-10 gap-y-10 md:grid-cols-3">
              {articles.map((a) => (
                <ArticleCard key={a.id} a={a} />
              ))}
            </div>
            <div className="mt-12 flex justify-center border-t border-[var(--hairline)] pt-8">
              {done ? (
                <p className="meta">You&apos;ve reached the end.</p>
              ) : (
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={busy}
                  className="inline-block border border-[var(--ink)] px-5 py-2 text-sm uppercase tracking-[0.14em] hover:bg-[var(--ink)] hover:text-[var(--bg)] disabled:opacity-60"
                >
                  {busy ? "Loading…" : "Load more"}
                </button>
              )}
            </div>
          </>
        )}
      </main>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `${label} News | ${siteName()}`,
          url: absUrl(`/news/${category}`),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: absUrl("/") },
            { "@type": "ListItem", position: 2, name: label, item: absUrl(`/news/${category}`) },
          ],
        }}
      />
    </>
  );
}
