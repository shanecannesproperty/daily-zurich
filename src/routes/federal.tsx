import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getNationalArticles } from "@/lib/data.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { ArticleCard } from "@/components/ArticleCard";
import { NewsletterForm } from "@/components/NewsletterForm";
import { buildMeta, canonicalLinks } from "@/lib/seo";
import { siteName } from "@/lib/city";

const nationalQuery = queryOptions({
  queryKey: ["national-articles"],
  queryFn: () => getNationalArticles(),
  staleTime: 30 * 60 * 1000,
});

export const Route = createFileRoute("/federal")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(nationalQuery).catch(() => undefined),
  head: () => ({
    meta: buildMeta({
      title: `National | ${siteName()}`,
      description: "Australian national news from the Daily Network.",
      path: "/federal",
    }),
    links: canonicalLinks("/federal"),
  }),
  component: FederalPage,
});

function FederalPage() {
  const { data: articles } = useSuspenseQuery(nationalQuery);

  return (
    <>
      <SiteHeader activePath="/federal" />
      <main>
        <section className="container-news pt-8 pb-10">
          <p className="kicker">National</p>
          <h1 className="h1-news mt-1">Across Australia</h1>
          <p className="dek mt-3 max-w-2xl">
            National stories from the Daily Network, covering the issues that affect all Australians.
          </p>

          {articles.length === 0 ? (
            <div className="mt-12 flex flex-col items-center text-center py-16 border border-[var(--hairline)] max-w-xl mx-auto px-8">
              <p className="kicker mb-4">Coming soon</p>
              <p className="dek mb-8">
                Our correspondents cover Canberra's influence on national policy, federal parliament, and the stories that matter across Australia.
              </p>
              <div className="flex flex-wrap gap-3 justify-center mb-8">
                <a href="/news" className="btn-ghost">Local News</a>
                <a href="/today" className="btn-ghost">Today</a>
                <a href="/events" className="btn-ghost">Events</a>
              </div>
              <a href="/subscribe" className="btn-primary">Subscribe free</a>
            </div>
          ) : (
            <div className="mt-8 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {articles.map((a) => (
                <ArticleCard key={a.id} a={a} />
              ))}
            </div>
          )}
        </section>

        <section className="container-news py-10 border-t border-[var(--hairline)]">
          <NewsletterForm source="federal" variant="band" />
        </section>
      </main>
    </>
  );
}
