import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getArticlesByCategory } from "@/lib/data.functions";
import { CATEGORY_LABELS, type ArticleCategory } from "@/lib/schema";
import { SiteHeader } from "@/components/SiteHeader";
import { ArticleCard } from "@/components/ArticleCard";
import { JsonLd } from "@/components/JsonLd";
import { absUrl } from "@/lib/seo";
import { cityName, siteName } from "@/lib/city";

export function categoryQuery(category: ArticleCategory, page: number) {
  return queryOptions({
    queryKey: ["category", category, page],
    queryFn: () => getArticlesByCategory({ data: { category, page } }),
  });
}

function categoryBlurb(category: ArticleCategory): string {
  const city = cityName();
  const blurbs: Partial<Record<ArticleCategory, string>> = {
    finance: `Markets, the RBA, cost of living, and what it all means for ${city} households.`,
    business: `Openings, closures, and the entrepreneurs driving ${city}'s economy.`,
    community: `Neighbourhood news, projects, and the people who make ${city} tick.`,
    sport: `From local leagues to national competitions — ${city}'s sports beat.`,
    world: `International stories selected for ${city} readers.`,
    wellness: `Health, wellbeing, and living well in ${city}.`,
    longevity: `In-depth reporting and long-form features from ${city}.`,
    federal: `Federal politics, parliament, and national policy — with a ${city} lens.`,
    news: `Local and national stories shaping ${city}.`,
  };
  return blurbs[category] ?? `The latest ${CATEGORY_LABELS[category].toLowerCase()} coverage from ${city}.`;
}

export function CategoryHub({ category, page }: { category: ArticleCategory; page: number }) {
  const { data } = useSuspenseQuery(categoryQuery(category, page));
  const label = CATEGORY_LABELS[category];
  return (
    <>
      <SiteHeader activePath={`/${category}`} />
      <main className="container-news py-10">
        <nav className="meta mb-4" aria-label="Breadcrumb">
          <a href="/">Home</a> &nbsp;/&nbsp; <span>{label}</span>
        </nav>
        <h1 className="h1-news">{label}</h1>
        <p className="dek mt-2">
          Latest {label.toLowerCase()} from {siteName()}.
        </p>
        <div aria-hidden className="mt-6 hairline" />
        {data.rows.length === 0 ? (
          <div className="mt-12 flex flex-col items-center text-center py-16 border border-[var(--hairline)] max-w-xl mx-auto px-8">
            <p className="kicker mb-4">Coming soon</p>
            <p className="dek mb-8">{categoryBlurb(category)}</p>
            <div className="flex flex-wrap gap-3 justify-center mb-8">
              <a href="/news" className="btn-ghost">All News</a>
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
            <a href={`/${category}?page=${page - 1}`} className="btn-ghost">
              Newer stories
            </a>
          ) : (
            <span />
          )}
          {data.rows.length >= data.perPage ? (
            <a href={`/${category}?page=${page + 1}`} className="btn-ghost">
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
          name: `${label} | ${siteName()}`,
          url: absUrl(`/${category}`),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: absUrl("/") },
            { "@type": "ListItem", position: 2, name: label, item: absUrl(`/${category}`) },
          ],
        }}
      />
    </>
  );
}
