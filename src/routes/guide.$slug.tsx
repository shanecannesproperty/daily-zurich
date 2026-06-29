import { createFileRoute, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getArticlesByCategory } from "@/lib/data.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { ArticleCard } from "@/components/ArticleCard";
import { JsonLd } from "@/components/JsonLd";
import { buildMeta, canonicalLinks, absUrl } from "@/lib/seo";
import { cityName, siteName } from "@/lib/city";
import { guideBySlug, GUIDES } from "@/lib/guides-config";
import type { ArticleCategory } from "@/lib/schema";

function guideArticlesQuery(category: ArticleCategory) {
  return queryOptions({
    queryKey: ["guide-articles", category],
    queryFn: () => getArticlesByCategory({ data: { category, page: 1 } }),
  });
}

export const Route = createFileRoute("/guide/$slug")({
  loader: async ({ context, params }) => {
    const guide = guideBySlug(params.slug);
    if (!guide) throw notFound();
    await context.queryClient.ensureQueryData(guideArticlesQuery(guide.category));
    return { guide };
  },
  head: ({ loaderData }) => {
    if (!loaderData?.guide) return { meta: [{ title: "Not found" }] };
    const { guide } = loaderData;
    const city = cityName();
    const title = guide.titleFn(city);
    const description = guide.descFn(city);
    const path = `/guide/${guide.slug}`;
    return {
      meta: buildMeta({ title: `${title} | ${siteName()}`, description, path }),
      links: canonicalLinks(path),
    };
  },
  component: GuidePage,
});

function GuidePage() {
  const { guide } = Route.useLoaderData();
  const city = cityName();
  const title = guide.titleFn(city);
  const description = guide.descFn(city);
  const path = `/guide/${guide.slug}`;

  const { data } = useSuspenseQuery(guideArticlesQuery(guide.category));
  const articles = data.rows.slice(0, 8);

  return (
    <>
      <SiteHeader activePath="/guides" />
      <main className="container-news py-10">
        <nav className="meta mb-4" aria-label="Breadcrumb">
          <a href="/">Home</a> &nbsp;/&nbsp;{" "}
          <a href="/guides">Guides</a> &nbsp;/&nbsp;{" "}
          <span>{guide.label}</span>
        </nav>

        <p className="kicker text-[var(--accent)]">{guide.label} Guide</p>
        <h1 className="h1-news mt-2">{title}</h1>
        <p className="dek mt-4">{description}</p>

        <div aria-hidden className="mt-6 hairline" />

        <section className="mt-10">
          <h2 className="h2-news">What's covered in this guide</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {guide.bullets.map((b: string) => (
              <li key={b} className="flex items-start gap-2 meta">
                <span className="mt-0.5 text-[var(--ink-red)] shrink-0">→</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12">
          <h2 className="h2-news">Latest {guide.label} articles</h2>
          {articles.length === 0 ? (
            <p className="meta mt-6">No articles published yet in this section.</p>
          ) : (
            <div className="mt-6 grid gap-x-10 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
              {articles.map((a) => (
                <ArticleCard key={a.id} a={a} />
              ))}
            </div>
          )}
          <p className="mt-8">
            <a href={`/${guide.category}`} className="btn-ghost">
              See all {guide.label.toLowerCase()} articles →
            </a>
          </p>
        </section>

        <section className="mt-12 border-t border-[var(--hairline)] pt-8">
          <h2 className="h2-news">Explore all guides</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {GUIDES.filter((g) => g.slug !== guide.slug).map((g) => (
              <a key={g.slug} href={`/guide/${g.slug}`} className="btn-ghost text-sm">
                {g.titleFn(city)}
              </a>
            ))}
          </div>
        </section>
      </main>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `${title} | ${siteName()}`,
          description,
          url: absUrl(path),
          publisher: { "@type": "NewsMediaOrganization", name: siteName() },
          about: { "@type": "Thing", name: guide.label },
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: absUrl("/") },
            { "@type": "ListItem", position: 2, name: "Guides", item: absUrl("/guides") },
            { "@type": "ListItem", position: 3, name: guide.label, item: absUrl(path) },
          ],
        }}
      />
    </>
  );
}
