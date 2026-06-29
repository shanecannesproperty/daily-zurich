import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { getSyndicatedStoryBySlug } from "@/lib/syndication.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { buildMeta, canonicalLinks } from "@/lib/seo";
import { cityName, siteName } from "@/lib/city";
import { formatShortDate } from "@/lib/date";
import { hostOf } from "@/lib/syndication";
import { decodeEntities } from "@/lib/decode-entities";

const storyQuery = (slug: string) =>
  queryOptions({
    queryKey: ["syndicated-story", slug],
    queryFn: () => getSyndicatedStoryBySlug({ data: { slug } }),
  });

export const Route = createFileRoute("/story/$slug")({
  loader: async ({ context, params }) => {
    const res = await context.queryClient.ensureQueryData(storyQuery(params.slug));
    if (!res.story) throw notFound();
    return res.story;
  },
  head: ({ loaderData }) => {
    const s = loaderData;
    const title = s ? `${decodeEntities(s.title)} | ${siteName()}` : siteName();
    const description = s?.dek ? decodeEntities(s.dek) : `Syndicated story tracked by ${siteName()}.`;
    
    return {
      meta: buildMeta({ title, description, path: s ? `/story/${s.slug}` : "/" }),
      links: canonicalLinks(s ? `/story/${s.slug}` : "/"),
    };
  },
  errorComponent: ({ error }) => (
    <main className="container-news py-24">
      <p className="meta">Could not load this story. {error.message}</p>
    </main>
  ),
  notFoundComponent: () => (
    <>
      <SiteHeader />
      <main className="container-news py-24 text-center">
        <h1 className="h1-news">Story not found</h1>
        <p className="dek mt-4">It may have been removed.</p>
        <Link to="/live" className="meta underline mt-6 inline-block">
          Back to Live now
        </Link>
      </main>
    </>
  ),
  component: StoryPage,
});

function StoryPage() {
  const { data } = useSuspenseQuery(storyQuery(Route.useParams().slug));
  const s = data.story!;
  const sourceName = s.source?.name ?? hostOf(s.link) ?? "Source";
  const when = s.source_published_at ?? s.fetched_at;

  return (
    <>
      <SiteHeader />
      <main className="container-news py-10 max-w-3xl">
        <p className="kicker">Tracked from {sourceName}</p>
        <h1 className="h1-news mt-2">{decodeEntities(s.title)}</h1>
        {s.dek && <p className="dek mt-4">{decodeEntities(s.dek)}</p>}

        <div className="mt-6 border-y border-[var(--hairline)] py-3 text-sm flex flex-wrap items-center justify-between gap-3">
          <div className="meta">
            <span className="uppercase tracking-widest">Source:</span>{" "}
            {s.source?.homepage_url ? (
              <a
                href={s.source.homepage_url}
                target="_blank"
                rel="noopener nofollow"
                className="underline"
              >
                {sourceName}
              </a>
            ) : (
              sourceName
            )}
            <span className="mx-2">·</span>
            <time dateTime={when}>Published {formatShortDate(when)}</time>
            <span className="mx-2">·</span>
            <time dateTime={s.fetched_at}>Indexed {formatShortDate(s.fetched_at)}</time>
          </div>
          <a
            href={s.link}
            target="_blank"
            rel="noopener nofollow"
            className="btn-primary inline-flex items-center gap-2"
          >
            Read at {sourceName} <ExternalLink className="h-4 w-4" aria-hidden />
          </a>
        </div>

        <section className="mt-10">
          <p className="kicker">Our commentary</p>
          {s.commentary ? (
            <div className="prose-news mt-3 whitespace-pre-wrap">{s.commentary}</div>
          ) : (
            <p className="meta mt-3 italic">
              We have not added commentary on this story yet. The full report lives at the source
              above.
            </p>
          )}
          {s.commentary_updated_at && (
            <p className="meta mt-3">
              Commentary updated <time>{formatShortDate(s.commentary_updated_at)}</time>.
            </p>
          )}
        </section>

        <aside className="mt-10 border border-[var(--hairline)] bg-[var(--surface)] p-5">
          <p className="meta uppercase tracking-widest">Where this came from</p>
          <p className="mt-2 text-sm">
            {siteName()} aggregates headlines from approved {cityName()} news sources via their public
            RSS feeds. We do not republish full articles. Visit{" "}
            <a
              href={s.link}
              target="_blank"
              rel="noopener nofollow"
              className="underline"
            >
              {sourceName}
            </a>{" "}
            to read the original report.
          </p>
        </aside>

        <p className="mt-10">
          <Link to="/live" className="meta underline">
            Back to Live now
          </Link>
        </p>
      </main>
    </>
  );
}
