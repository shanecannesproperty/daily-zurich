import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { listLiveFeed } from "@/lib/data.functions";
import { listSyndicatedStories } from "@/lib/syndication.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { LiveFeed } from "@/components/LiveFeed";
import { SyndicatedList } from "@/components/SyndicatedList";
import { NewsletterForm } from "@/components/NewsletterForm";
import { buildMeta, canonicalLinks } from "@/lib/seo";
import { siteName, cityName, citySlug } from "@/lib/city";
import type { SyndicatedStoryWithSource } from "@/lib/syndication";

const PAGE_SIZE = 30;

const liveFeedQuery = queryOptions({
  queryKey: ["live-feed"],
  queryFn: () => listLiveFeed(),
});

const syndicatedFirstPageQuery = queryOptions({
  queryKey: ["syndicated-stories", "live", 0],
  queryFn: () => listSyndicatedStories({ data: { limit: PAGE_SIZE, offset: 0 } }),
  staleTime: 5 * 60 * 1000,
});

export const Route = createFileRoute("/live")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(liveFeedQuery).catch(() => undefined),
      context.queryClient.ensureQueryData(syndicatedFirstPageQuery).catch(() => undefined),
    ]),
  head: () => ({
    meta: buildMeta({
      title: `Live now | ${siteName()}`,
      description: `The latest ${cityName()} news headlines and current conditions, refreshed through the day by ${siteName()}. Every item links back to its source.`,
      path: "/live",
    }),
    links: canonicalLinks("/live"),
  }),
  component: LivePage,
});

function LivePage() {
  const { data: live } = useSuspenseQuery(liveFeedQuery);
  const { data: firstPage } = useSuspenseQuery(syndicatedFirstPageQuery);

  const [pages, setPages] = useState<SyndicatedStoryWithSource[][]>([
    firstPage?.items ?? [],
  ]);
  const [nextPage, setNextPage] = useState<number | null>(
    (firstPage?.items?.length ?? 0) >= PAGE_SIZE ? 1 : null,
  );

  // Lazy-fetch the next page only when it's requested (button or sentinel).
  const morePageQuery = useQuery({
    queryKey: ["syndicated-stories", "live", nextPage],
    queryFn: () =>
      listSyndicatedStories({
        data: { limit: PAGE_SIZE, offset: (nextPage ?? 0) * PAGE_SIZE },
      }),
    enabled: false,
    staleTime: 5 * 60 * 1000,
  });

  async function loadMore() {
    if (nextPage == null || morePageQuery.isFetching) return;
    const res = await morePageQuery.refetch();
    const items = res.data?.items ?? [];
    setPages((p) => [...p, items]);
    setNextPage(items.length >= PAGE_SIZE ? (nextPage ?? 0) + 1 : null);
  }

  // Infinite scroll: observe a sentinel and trigger loadMore as it nears view.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!sentinelRef.current || nextPage == null) return;
    const el = sentinelRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMore();
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextPage, morePageQuery.isFetching]);

  const items = pages.flat();
  const hasWeather =
    !!live.weather &&
    ((live.weather.temp_c != null && Number.isFinite(live.weather.temp_c)) ||
      !!live.weather.weather_text ||
      !!live.weather.title);

  return (
    <>
      <SiteHeader activePath="/live" />
      <main>
        <section className="container-news pt-8 pb-10">
          <p className="kicker">Live now</p>
          <h1 className="h1-news mt-1">Live from {cityName()}</h1>
          <p className="dek mt-3 max-w-2xl">
            {citySlug() === "canberra"
              ? "Tracked headlines from trusted local news sources, newest first."
              : `Tracked ${cityName()} headlines from local and national sources, newest first.`}{" "}
            Every item credits its source and links back to the original report. We do not
            republish full articles.
          </p>

          {hasWeather && (
            <div className="mt-6">
              <LiveFeed items={[]} weather={live.weather} limit={0} showHeading={false} />
            </div>
          )}

          {items.length > 0 ? (
            <div className="mt-8">
              <SyndicatedList items={items} showHeading={false} />
              {nextPage != null ? (
                <div className="mt-8 flex flex-col items-center gap-3">
                  <div ref={sentinelRef} aria-hidden className="h-px w-full" />
                  <button
                    onClick={loadMore}
                    disabled={morePageQuery.isFetching}
                    className="btn-ghost"
                  >
                    {morePageQuery.isFetching ? "Loading…" : "Load more stories"}
                  </button>
                </div>
              ) : (
                <p className="meta mt-8 text-center">You've reached the end of the feed.</p>
              )}
            </div>
          ) : (
            <p className="meta mt-10">
              Nothing tracked right now. Feeds refresh hourly.
            </p>
          )}
        </section>

        <section className="container-news py-10 border-t border-[var(--hairline)]">
          <NewsletterForm source="live-feed" variant="band" />
        </section>
      </main>
    </>
  );
}
