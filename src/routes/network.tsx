import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { CITY_BRANDING } from "@/lib/city-config";
import { getNetworkLatestHeadlines } from "@/lib/data.functions";
import { buildMeta, canonicalLinks } from "@/lib/seo";
import { siteName, siteEmail } from "@/lib/city";

// Only launched cities appear publicly. Draft cities (e.g. new international
// ones) are wired into the network — domains resolve, infra is ready — but stay
// off the public network page until they have real content. See
// DRAFT_CITY_SLUGS in city-config.ts.
const LAUNCHED_CITIES = Object.values(CITY_BRANDING)
  .filter((c) => c.launched)
  .sort((a, b) => a.name.localeCompare(b.name));
const CITY_COUNT = LAUNCHED_CITIES.length;

const headlinesQuery = queryOptions({
  queryKey: ["network-headlines"],
  queryFn: () => getNetworkLatestHeadlines(),
});

export const Route = createFileRoute("/network")({
  loader: ({ context }) => context.queryClient.ensureQueryData(headlinesQuery),
  head: () => ({
    meta: buildMeta({
      title: `The Daily Network — ${CITY_COUNT} cities, one community`,
      description: `Australia's fastest-growing independent local news network. ${CITY_COUNT} cities, ${CITY_COUNT} morning newsletters, one mission: better local news.`,
      path: "/network",
    }),
    links: canonicalLinks("/network"),
  }),
  component: NetworkPage,
});

function NetworkPage() {
  const headlines = useSuspenseQuery(headlinesQuery).data;
  const cities = LAUNCHED_CITIES;

  return (
    <>
      <SiteHeader />
      <main className="container-news py-12">
        <header className="border-b border-[var(--ink,#2d2d2d)] pb-10">
          <p className="kicker">The Daily Network</p>
          <h1 className="h1-news mt-2 max-w-[20ch]">
            {CITY_COUNT} cities. One community.
          </h1>
          <p className="dek mt-4 max-w-[60ch]">
            Australia&apos;s fastest-growing independent local news network.
            One newsroom philosophy, {CITY_COUNT} morning briefings, written for
            the places they cover.
          </p>
        </header>

        <section
          aria-label="Network at a glance"
          className="mt-10 grid grid-cols-2 gap-px bg-[var(--ink,#2d2d2d)] sm:grid-cols-4"
        >
          {[
            { v: String(CITY_COUNT), l: "Cities" },
            { v: "50,000+", l: "Monthly readers" },
            { v: String(CITY_COUNT), l: "Morning newsletters" },
            { v: "Est. 2026", l: "Independent" },
          ].map((s) => (
            <div
              key={s.l}
              className="bg-[var(--surface,#e8e4dd)] px-5 py-6 text-center"
            >
              <p className="serif text-3xl leading-none">{s.v}</p>
              <p className="kicker mt-2">{s.l}</p>
            </div>
          ))}
        </section>

        <section className="mt-12">
          <h2 className="h2-section">Every city in the network</h2>
          <p className="meta mt-2 max-w-[60ch]">
            Click any city to read its latest local news, or subscribe to its
            morning briefing.
          </p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cities.map((c) => {
              const headline = headlines[c.slug];
              return (
                <li
                  key={c.slug}
                  className="border border-[var(--hairline,#d6d2c9)] bg-[var(--surface,#e8e4dd)] p-5 transition hover:border-[var(--ink,#2d2d2d)]"
                >
                  <a
                    href={c.domain}
                    rel="noopener"
                    className="block no-underline"
                  >
                    <p className="kicker">{c.name}</p>
                    <p className="serif mt-1 text-xl font-semibold leading-tight">
                      The Daily {c.name}
                    </p>
                    {headline ? (
                      <p className="meta mt-3 line-clamp-3 italic">
                        “{headline.title}”
                      </p>
                    ) : (
                      <p className="meta mt-3 italic text-[var(--ink-grey,#6b6b6b)]">
                        Launching soon — subscribe for the first edition.
                      </p>
                    )}
                    <p className="meta mt-4">
                      Visit {c.domain.replace(/^https?:\/\//, "")} →
                    </p>
                  </a>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mt-16 border-t border-[var(--ink,#2d2d2d)] pt-8">
          <h2 className="h2-section">Why a network</h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <p className="serif text-base leading-relaxed">
              National mastheads can&apos;t cover every council meeting, footy
              fixture, or weekend market. We do — city by city — because local
              news is the connective tissue of a community.
            </p>
            <p className="serif text-base leading-relaxed">
              Shared technology, shared editorial standards, independent local
              voices. That&apos;s how {siteName()} fits into the Daily Network.
            </p>
          </div>
          <p className="meta mt-6">
            Want to partner, syndicate, or invest?{" "}
            <a href={`mailto:${siteEmail("hello")}`} className="underline">
              {siteEmail("hello")}
            </a>
          </p>
        </section>
      </main>
    </>
  );
}
