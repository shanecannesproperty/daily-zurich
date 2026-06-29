import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getArticlesByTopic } from "@/lib/data.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { ArticleCard } from "@/components/ArticleCard";
import { EmptyState } from "@/components/EmptyState";
import { JsonLd } from "@/components/JsonLd";
import { buildMeta, canonicalLinks, absUrl } from "@/lib/seo";
import { cityName, siteName } from "@/lib/city";

const searchSchema = z.object({
  page: z.coerce.number().int().min(1).max(500).default(1),
});

function topicLabel(tag: string): string {
  return tag
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function topicQuery(tag: string, page: number) {
  return queryOptions({
    queryKey: ["topic", tag, page],
    queryFn: () => getArticlesByTopic({ data: { tag, page } }),
  });
}

export const Route = createFileRoute("/topic/$tag")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: ({ params, context, deps }) =>
    context.queryClient.ensureQueryData(topicQuery(params.tag, deps.page)),
  head: ({ params }) => {
    const label = topicLabel(params.tag);
    const path = `/topic/${params.tag}`;
    return {
      meta: buildMeta({
        title: `Latest ${label} news — ${cityName()}`,
        description: `Latest ${label.toLowerCase()} stories from ${cityName()}, updated daily by ${siteName()}.`,
        path,
      }),
      links: canonicalLinks(path),
    };
  },
  component: TopicPage,
});

function TopicPage() {
  const { tag } = Route.useParams();
  const { page } = Route.useSearch();
  const { data } = useSuspenseQuery(topicQuery(tag, page));
  const label = topicLabel(tag);

  return (
    <>
      <SiteHeader />
      <main className="container-news py-10">
        <nav className="meta mb-4" aria-label="Breadcrumb">
          <a href="/">Home</a> &nbsp;/&nbsp; <span>Topic</span> &nbsp;/&nbsp; <span>{label}</span>
        </nav>
        <p className="kicker">Topic</p>
        <h1 className="h1-news mt-1">Latest {label} news — {cityName()}</h1>
        <p className="dek mt-2">
          All {label.toLowerCase()} stories from {cityName()}.
        </p>
        <div aria-hidden className="mt-6 hairline" />

        {data.rows.length === 0 ? (
          <EmptyState
            title={`No stories tagged ${label} yet`}
            message={`We haven't tagged any ${cityName()} stories with "${label}" yet. Try a related topic or subscribe to be first when we publish.`}
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
            <a href={`/topic/${tag}?page=${page - 1}`} className="btn-ghost">
              Newer stories
            </a>
          ) : (
            <span />
          )}
          {data.rows.length >= data.perPage ? (
            <a href={`/topic/${tag}?page=${page + 1}`} className="btn-ghost">
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
          name: `Latest ${label} news — ${cityName()}`,
          url: absUrl(`/topic/${tag}`),
        }}
      />
    </>
  );
}
