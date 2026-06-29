import { createFileRoute, Link, ClientOnly } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import {
  getDailyBriefing,
  getHomepage,
  getNationalArticles,
  getVideos,
  listCourtJudgments,
  listLiveFeed,
} from "@/lib/data.functions";
import { listSyndicatedStories, listFeaturedSyndicated } from "@/lib/syndication.functions";
import { getFeaturedDevelopment } from "@/lib/featured-development.functions";
import { FeaturedDevelopment } from "@/components/FeaturedDevelopment";
import { TopStoriesRotator } from "@/components/TopStoriesRotator";
import { getWhatsOnEvents } from "@/lib/whatson.functions";
import { SocialProofBanner } from "@/components/SocialProofBanner";
import { SiteHeader } from "@/components/SiteHeader";
import { ArticleCard } from "@/components/ArticleCard";
import { LoadMoreStories } from "@/components/LoadMoreStories";
import { InYourAreaWidget } from "@/components/InYourAreaWidget";
import { SportsScoresWidget } from "@/components/SportsScoresWidget";
import { CrossNetworkTrending } from "@/components/CrossNetworkTrending";
import { TodayInHistory } from "@/components/TodayInHistory";


import { EventsBrowser } from "@/components/EventsBrowser";
import { DailyBriefingCard } from "@/components/DailyBriefingCard";
import { LiveFeed } from "@/components/LiveFeed";
import { SyndicatedList } from "@/components/SyndicatedList";
import { RecentJudgments } from "@/components/RecentJudgments";
import { VideoStrip } from "@/components/VideoStrip";
import { WhatsOnWeekend } from "@/components/WhatsOnWeekend";
import { AcrossAustralia } from "@/components/AcrossAustralia";
import { NewsletterForm } from "@/components/NewsletterForm";
import { MostRead } from "@/components/MostRead";
import { TrendingNow } from "@/components/TrendingNow";
import { HomeWeatherCard } from "@/components/HomeWeatherCard";
import { WeatherStrip } from "@/components/WeatherStrip";
import { LocalBusinessSpotlight } from "@/components/LocalBusinessSpotlight";
import { ThisWeekendCard } from "@/components/ThisWeekendCard";
import ogDayTrips from "@/assets/og-day-trips-from-canberra.jpg";
import { CategoryNav } from "@/components/CategoryNav";
import { JsonLd } from "@/components/JsonLd";
import { buildMeta, canonicalLinks, absUrl, pageTitle, clampDescription } from "@/lib/seo";
import { homepageMode } from "@/lib/homepage-mode";
import { cityName, siteName, siteTagline, siteDomain, citySocialLinks } from "@/lib/city";

const homepageQuery = queryOptions({
  queryKey: ["homepage"],
  queryFn: () => getHomepage(),
});

const briefingQuery = queryOptions({
  queryKey: ["daily-briefing"],
  queryFn: () => getDailyBriefing(),
});

const liveFeedQuery = queryOptions({
  queryKey: ["live-feed"],
  queryFn: () => listLiveFeed(),
});

const syndicatedQuery = queryOptions({
  queryKey: ["syndicated-stories", "home"],
  queryFn: () => listSyndicatedStories({ data: { limit: 20 } }),
  staleTime: 5 * 60 * 1000,
});

const featuredSyndicatedQuery = queryOptions({
  queryKey: ["syndicated-stories", "featured"],
  queryFn: () => listFeaturedSyndicated({ data: { limit: 8 } }),
  staleTime: 5 * 60 * 1000,
});

// Outbound cross-link to What's On Canberra. The server function never throws
// (it degrades to an empty list), so this query always resolves; the module
// renders nothing when the list is empty. Cached briefly so a slow or absent
// upstream feed is only ever paid for once every staleTime window.
const whatsOnQuery = queryOptions({
  queryKey: ["whatson-weekend"],
  queryFn: () => getWhatsOnEvents(),
  staleTime: 15 * 60 * 1000,
  gcTime: 15 * 60 * 1000,
});

// Compact "Recent judgments" teaser. LINK-OUT ONLY. Renders nothing when empty,
// so it stays subtle and never leaves a dangling heading on the homepage.
const judgmentsQuery = queryOptions({
  queryKey: ["court-judgments"],
  queryFn: () => listCourtJudgments(),
  staleTime: 15 * 60 * 1000,
  gcTime: 15 * 60 * 1000,
});

// Local "Canberra on video" rail. Renders nothing when empty (the component
// returns null), so it never leaves a dangling heading on the homepage.
// Native featured-development placements from The Lawson's network feed.
// Server-fetched, capped, graceful-degrade: errors and empty feeds render
// nothing so the homepage is never affected.
const featuredDevelopmentQuery = queryOptions({
  queryKey: ["featured-development"],
  queryFn: () => getFeaturedDevelopment(),
  staleTime: 10 * 60 * 1000,
  gcTime: 30 * 60 * 1000,
});

const videosQuery = queryOptions({
  queryKey: ["videos"],
  queryFn: () => getVideos(),
  staleTime: 15 * 60 * 1000,
  gcTime: 15 * 60 * 1000,
});

const nationalQuery = queryOptions({
  queryKey: ["national-articles"],
  queryFn: () => getNationalArticles(),
  staleTime: 30 * 60 * 1000,
});

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(homepageQuery),
      context.queryClient.ensureQueryData(briefingQuery),
      context.queryClient.ensureQueryData(liveFeedQuery).catch(() => undefined),
      context.queryClient.ensureQueryData(syndicatedQuery).catch(() => undefined),
      context.queryClient.ensureQueryData(featuredSyndicatedQuery).catch(() => undefined),
      context.queryClient.ensureQueryData(whatsOnQuery).catch(() => undefined),
      context.queryClient.ensureQueryData(judgmentsQuery).catch(() => undefined),
      context.queryClient.ensureQueryData(videosQuery).catch(() => undefined),
      context.queryClient.ensureQueryData(featuredDevelopmentQuery).catch(() => undefined),
      context.queryClient.ensureQueryData(nationalQuery).catch(() => undefined),
    ]);
  },
  head: () => ({
    meta: buildMeta({
      title: pageTitle(siteTagline()),
      description: clampDescription(
        `${cityName()} news today. Independent local coverage of breaking news, weather, events and what's on in ${cityName()}, published every morning by ${siteName()}.`,
        160,
      ),
      path: "/",
      image: `${siteDomain()}/og.png`,
    }),
    links: canonicalLinks("/"),
  }),
  component: Home,
});

function Home() {
  const { data } = useSuspenseQuery(homepageQuery);
  const { data: briefing } = useSuspenseQuery(briefingQuery);
  const { data: live } = useSuspenseQuery(liveFeedQuery);
  const { data: syndicated } = useSuspenseQuery(syndicatedQuery);
  const { data: featuredSyndicated } = useSuspenseQuery(featuredSyndicatedQuery);
  const { data: whatsOn } = useSuspenseQuery(whatsOnQuery);
  const { data: judgments } = useSuspenseQuery(judgmentsQuery);
  const { data: videos } = useSuspenseQuery(videosQuery);
  const { data: featuredDevelopment } = useSuspenseQuery(featuredDevelopmentQuery);
  const { data: national } = useSuspenseQuery(nationalQuery);
  const mode = homepageMode(data);
  const hasArticles = mode === "news";
  const [lead, ...rest] = data.articles;
  const hasLive =
    live.items.length > 0 ||
    (!!live.weather &&
      ((live.weather.temp_c != null && Number.isFinite(live.weather.temp_c)) ||
        !!live.weather.weather_text ||
        !!live.weather.title));

  // Split the article stack for the hero grid: 1 lead, 4 secondary headlines,
  // remaining stories drop into the section grid below.
  const secondaryStack = rest.slice(0, 4);
  const sectionRail = rest.slice(4, 10);

  return (
    <>
      <SiteHeader activePath="/" />
      <SocialProofBanner />
      <main>
        {/* Visually hidden H1 so every homepage layout has a single, descriptive
            top-level heading and section H2s don't skip levels. */}
        <h1 className="sr-only">
          {siteName()} — {siteTagline()}
        </h1>
        {hasArticles ? (

          <>
            {/* Hero: lead article dominates above the fold, secondary stack right.
                TodayInHistory sits inside the sidebar as a quiet editorial note.
                Nothing interrupts the reader between nav and front-page stories. */}
            <section className="container-news pt-6 sm:pt-8 pb-10">
              <div className="grid gap-8 lg:grid-cols-12">
                <div className="lg:col-span-8 lg:border-r lg:border-[var(--hairline)] lg:pr-8">
                  <ArticleCard a={lead} level="lead" />
                </div>

                {(featuredSyndicated?.items?.length ?? 0) > 0 ? (
                  <div className="lg:col-span-4">
                    <TopStoriesRotator items={featuredSyndicated?.items ?? []} />
                    {secondaryStack.length > 0 && (
                      <div className="mt-6 divide-y divide-[var(--hairline)] border-t border-[var(--hairline)] pt-4">
                        {secondaryStack.slice(0, 3).map((a) => (
                          <div key={a.id} className="py-3 first:pt-0 last:pb-0">
                            <ArticleCard a={a} level="compact" />
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-6 border-t border-[var(--hairline)] pt-4">
                      <TodayInHistory />
                    </div>
                  </div>
                ) : (
                  secondaryStack.length > 0 && (
                    <div className="lg:col-span-4">
                      <h2 className="kicker mb-3">Top stories</h2>
                      <div className="divide-y divide-[var(--hairline)]">
                        {secondaryStack.map((a) => (
                          <div key={a.id} className="py-4 first:pt-0 last:pb-0">
                            <ArticleCard a={a} level="compact" />
                          </div>
                        ))}
                      </div>
                      <div className="mt-6 border-t border-[var(--hairline)] pt-4">
                        <TodayInHistory />
                      </div>
                    </div>
                  )
                )}
              </div>
            </section>

            {/* Weather strip — prominent, above the fold, drives /weather SEO traffic */}
            <WeatherStrip />

            {/* Sports scores + cross-network — below the fold, not blocking the hero */}
            <SportsScoresWidget />
            <CrossNetworkTrending />

            {(syndicated?.items?.length ?? 0) > 0 || hasLive ? (
              <section className="border-t border-[var(--hairline)] bg-[var(--surface)]">
                <div className="container-news py-6">
                  {hasLive && (
                    <LiveFeed items={[]} weather={live.weather} limit={0} showHeading={true} />
                  )}
                  <SyndicatedList
                    items={syndicated?.items ?? []}
                    limit={8}
                    showHeading={!hasLive}
                  />
                  {(syndicated?.items?.length ?? 0) > 8 && (
                    <a href="/live" className="meta underline mt-4 inline-block">
                      Full live feed
                    </a>
                  )}
                </div>
              </section>
            ) : null}

            {/* Audio briefing band */}
            {briefing && (
              <section className="border-y border-[var(--ink)] bg-[var(--surface)] py-8">
                <div className="container-news">
                  <DailyBriefingCard briefing={briefing} />
                </div>
              </section>
            )}

            {/* Continued coverage grid */}
            {sectionRail.length > 0 && (
              <section className="container-news py-10">
                <h2 className="kicker">Continued coverage</h2>
                <div className="mt-4 grid gap-x-10 gap-y-8 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[var(--hairline)]">
                  {sectionRail.map((a, i) => (
                    <div key={a.id} className={i === 0 ? "" : "pt-6 md:pt-0 md:pl-10"}>
                      <ArticleCard a={a} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            <LoadMoreStories initialCount={data.articles.length} />



            <section className="container-news py-10 border-t border-[var(--ink)]">
              <div className="mx-auto max-w-6xl grid gap-10 md:grid-cols-2 lg:grid-cols-3">
                <MostRead />
                <TrendingNow />
                <ThisWeekendCard events={data.events} />
              </div>
              <div className="mx-auto max-w-6xl mt-8 grid gap-6 md:grid-cols-2">
                <LocalBusinessSpotlight slot="homepage" className="max-w-md" />
                <aside className="border-t border-[var(--ink)] pt-4 max-w-md">
                  <p className="kicker">Community</p>
                  <h2 className="serif text-xl font-semibold mt-1">
                    <a href="/classifieds" className="no-underline hover:underline">{cityName()} Classifieds</a>
                  </h2>
                  <p className="meta mt-2">For sale, wanted, services, jobs, rentals and notices. Free to post.</p>
                  <a href="/classifieds" className="meta underline mt-3 inline-block">Browse listings →</a>
                </aside>
              </div>
            </section>

            {data.events.length > 0 && (
              <section className="container-news py-10 border-t border-[var(--ink)]">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="kicker">Diary</p>
                    <h2 className="h2-news mt-1">This week in {cityName()}</h2>
                  </div>
                  <a href="/events" className="meta underline">
                    All events
                  </a>
                </div>
                <EventsBrowser events={data.events} limit={8} showFilters={false} />
              </section>
            )}
          </>
        ) : (
          <>
            {briefing && (
              <section className="border-b border-[var(--ink)] bg-[var(--surface)] py-8">
                <div className="container-news">
                  <DailyBriefingCard briefing={briefing} />
                </div>
              </section>
            )}

            {((syndicated?.items?.length ?? 0) > 0 || hasLive) && (
              <section className="container-news pt-8">
                {hasLive && (
                  <LiveFeed items={[]} weather={live.weather} limit={0} showHeading={true} />
                )}
                <SyndicatedList
                  items={syndicated?.items ?? []}
                  limit={8}
                  showHeading={!hasLive}
                />
                {(syndicated?.items?.length ?? 0) > 8 && (
                  <a href="/live" className="meta underline mt-4 inline-block">
                    See the full live feed
                  </a>
                )}
              </section>
            )}

            <section className="container-news pt-8 pb-10">
              <p className="kicker">What&apos;s on</p>
              <div className="flex items-end justify-between gap-6 mt-1">
                <h2 className="h1-news">This week in {cityName()}</h2>
                <a href="/events" className="meta underline hidden sm:inline">
                  All events
                </a>
              </div>
              <p className="dek mt-3 max-w-2xl">
                A curated diary of verified events across the capital. Every listing links back to
                its source.
              </p>
              {data.events.length > 0 ? (
                <EventsBrowser events={data.events} variant="grid" limit={12} />
              ) : (
                <p className="meta mt-10">No upcoming events listed yet. Check back soon.</p>
              )}
            </section>
          </>
        )}

        <ClientOnly fallback={null}>
          <WhatsOnWeekend events={whatsOn ?? []} />
        </ClientOnly>

        <RecentJudgments judgments={judgments} limit={4} />

        <AcrossAustralia articles={national ?? []} />

        <FeaturedDevelopment placements={featuredDevelopment ?? []} />

        {videos.length > 0 && (
          <section className="container-news py-10 border-t border-[var(--ink)]">
            <VideoStrip videos={videos} variant="rail" />
          </section>
        )}

        <section className="container-news py-10 border-t border-[var(--ink)]">
          <p className="kicker">Editor's guide</p>
          <div className="mt-3 grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-center">
            <a href="/best/day-trips-from-canberra" className="block no-underline">
              <img
                src={ogDayTrips}
                alt="The Ultimate Day Trips from Canberra"
                className="aspect-[1200/630] w-full object-cover"
                loading="lazy"
                decoding="async"
                width={1200}
                height={630}
              />
            </a>
            <div>
              <h2 className="h1-news">
                <a
                  href="/best/day-trips-from-canberra"
                  className="no-underline hover:underline"
                >
                  The Ultimate Day Trips from Canberra
                </a>
              </h2>
              <p className="serif mt-3" style={{ fontFamily: "Georgia, serif" }}>
                Snowy Mountains, Southern Highlands, Batemans Bay and six more drives worth the
                tank of petrol, with the season we'd pick.
              </p>
              <a
                href="/best/day-trips-from-canberra"
                className="meta mt-4 inline-block underline"
              >
                Read the guide →
              </a>
            </div>
          </div>
        </section>

        {data.guides.length > 0 && (
          <section className="container-news py-10 border-t border-[var(--ink)]">
            <div className="flex items-end justify-between">
              <div>
                <p className="kicker">Best of {cityName()}</p>
                <h2 className="h2-news mt-1">Curated local guides</h2>
              </div>
              <Link to="/best" className="meta underline">
                See all
              </Link>
            </div>
            <div className="mt-6 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {data.guides.slice(0, 6).map(({ guide, top }) => (
                <article key={guide.id} className="border-t border-[var(--hairline)] pt-4">
                  {top?.image_url && (
                    <a href={`/best/${guide.slug}`} className="block no-underline">
                      <img
                        src={top.image_url}
                        alt={guide.title}
                        className="aspect-[3/2] w-full object-cover"
                        loading="lazy"
                        decoding="async"
                        width={600}
                        height={400}
                      />
                    </a>
                  )}
                  <h3 className="h2-news mt-3">
                    <a href={`/best/${guide.slug}`} className="no-underline hover:underline">
                      {guide.title}
                    </a>
                  </h3>
                  {top && (
                    <p className="meta mt-2">
                      Featuring {top.business_name}
                      {top.suburb ? `, ${top.suburb}` : ""}.
                    </p>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        <section
          id="newsletter"
          className="border-t border-b border-[var(--ink)] bg-[var(--surface)] py-10 sm:py-12 mt-12"
        >
          <div className="container-news grid gap-6 md:gap-10 md:grid-cols-5 md:items-center">
            <div className="md:col-span-2">
              <p className="kicker">Newsletter</p>
              <p className="dek mt-2">
                Get the day&apos;s {cityName()} news and what&apos;s on in a 2-minute read, weekday
                mornings.
              </p>
            </div>
            <div className="md:col-span-3">
              <NewsletterForm source="hero" variant="band" />
            </div>
          </div>
        </section>
      </main>
      {hasArticles && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "ItemList",
            itemListElement: data.articles.map((a, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: absUrl(`/article/${a.slug}`),
              name: a.title,
            })),
          }}
        />
      )}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: absUrl("/") }],
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: siteName(),
          url: siteDomain(),
          potentialAction: {
            "@type": "SearchAction",
            target: { "@type": "EntryPoint", urlTemplate: `${siteDomain()}/search?q={search_term_string}` },
            "query-input": "required name=search_term_string",
          },
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "NewsMediaOrganization",
          name: siteName(),
          url: siteDomain(),
          logo: { "@type": "ImageObject", url: `${siteDomain()}/logo.svg` },
          sameAs: citySocialLinks(),
          publishingPrinciples: absUrl("/editorial-standards"),
          diversityPolicy: absUrl("/editorial-standards"),
        }}
      />
    </>
  );
}
