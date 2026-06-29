import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listTrendingArticles } from "@/lib/data.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { ArticleCard } from "@/components/ArticleCard";
import { JsonLd } from "@/components/JsonLd";
import { buildMeta, canonicalLinks, absUrl } from "@/lib/seo";
import { cityName, siteName } from "@/lib/city";

const trendingQ = queryOptions({
  queryKey: ["trending"],
  queryFn: () => listTrendingArticles(),
});

export const Route = createFileRoute("/trending")({
  loader: ({ context }) => context.queryClient.ensureQueryData(trendingQ),
  head: () => ({
    meta: buildMeta({
      title: `Trending stories | ${siteName()}`,
      description: `The most read ${cityName()} stories from the past week.`,
      path: "/trending",
    }),
    links: canonicalLinks("/trending"),
  }),
  component: TrendingPage,
});

function TrendingPage() {
  const { data } = useSuspenseQuery(trendingQ);
  return (
    <>
      <SiteHeader activePath="/trending" />
      <main className="container-news py-10">
        <nav className="meta mb-4">
          <a href="/">Home</a> / Trending
        </nav>
        <p className="kicker">Trending this week</p>
        <h1 className="h1-news mt-2">What {cityName()} is reading</h1>
        <p className="dek mt-3 max-w-2xl">
          The stories getting the most attention in the past seven days.
        </p>

        {data.length === 0 ? (
          <p className="meta mt-10">Nothing trending right now.</p>
        ) : (
          <ul className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {data.map((a) => (
              <li key={a.id}>
                <ArticleCard a={a} />
              </li>
            ))}
          </ul>
        )}
      </main>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `Trending | ${siteName()}`,
          url: absUrl("/trending"),
        }}
      />
    </>
  );
}
