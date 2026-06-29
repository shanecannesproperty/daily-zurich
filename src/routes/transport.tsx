import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { JsonLd } from "@/components/JsonLd";
import { buildMeta, canonicalLinks, absUrl } from "@/lib/seo";
import { cityName, siteName } from "@/lib/city";

export const Route = createFileRoute("/transport")({
  head: () => ({
    meta: buildMeta({
      title: `Transport in ${cityName()} | Getting Around | ${siteName()}`,
      description: `How to get around ${cityName()} — public transport, buses, trains, light rail, cycling and driving. Local transport news from ${siteName()}.`,
      path: "/transport",
    }),
    links: canonicalLinks("/transport"),
  }),
  component: TransportPage,
});

const SECTIONS = [
  {
    id: "public",
    heading: "Public transport",
    body: `${cityName()}'s public transport network operates buses and, in some corridors, trains or light rail. Services are managed by the relevant state or territory transport authority, which sets timetables, fares and concessions. Route maps and real-time tracking are available through the official transport app for your city.`,
  },
  {
    id: "buses",
    heading: "Buses",
    body: `Buses are the backbone of public transport in most parts of ${cityName()}. Frequent routes connect the inner city and major suburbs throughout the day. Peak hour services are more crowded; off-peak and weekend timetables operate at lower frequency. Fares are paid by contactless card or city-issued transit card.`,
  },
  {
    id: "trains",
    heading: "Trains and light rail",
    body: `Rail services in ${cityName()} link the city centre with suburban stations and, in some cases, regional destinations. Light rail operates on dedicated surface corridors in parts of the city. Check the transport authority's network map for current coverage.`,
  },
  {
    id: "cycling",
    heading: "Cycling",
    body: `${cityName()} has expanded its cycling infrastructure in recent years. Dedicated bike lanes and shared paths connect many inner suburbs. Bike-share schemes operate in some areas, allowing short-term rentals without needing your own bike. Helmets are mandatory throughout Australia.`,
  },
  {
    id: "driving",
    heading: "Driving and parking",
    body: `Driving remains the most common way to get around ${cityName()}, particularly for outer suburban areas not well served by public transport. City centre parking is managed through council-run and private car parks. Speed limits in school zones and residential streets are strictly enforced. Toll roads apply on some major routes.`,
  },
  {
    id: "rideshare",
    heading: "Rideshare and taxis",
    body: `Rideshare services operate city-wide and are often the most practical late-night transport option. Licensed taxis are also available at ranks and via booking apps. Prices and wait times vary significantly by time of day and suburb.`,
  },
];

function TransportPage() {
  const city = cityName();

  return (
    <>
      <SiteHeader activePath="/transport" />
      <main className="container-news py-10">
        <nav className="meta mb-4">
          <a href="/">Home</a> / Transport
        </nav>

        <p className="kicker">Getting around</p>
        <h1 className="h1-news mt-2">Transport in {city}</h1>
        <p className="dek mt-3 max-w-2xl">
          How to get around {city} — public transport, cycling, driving and rideshare. Updated with
          local transport news as it happens.
        </p>

        <div className="mt-10 grid gap-12 lg:grid-cols-[2fr_1fr]">
          <div>
            {SECTIONS.map((s) => (
              <section
                key={s.id}
                id={s.id}
                className="border-t border-[var(--ink)] pt-8 mt-8 first:mt-0 first:border-t-0 first:pt-0"
                aria-labelledby={`${s.id}-h`}
              >
                <h2 id={`${s.id}-h`} className="h2-news">
                  {s.heading}
                </h2>
                <p className="prose-news mt-4">{s.body}</p>
              </section>
            ))}
          </div>

          <aside className="space-y-8 border-t border-[var(--ink)] pt-8 lg:border-t-0 lg:pt-0 lg:border-l lg:border-[var(--hairline)] lg:pl-10">
            <div>
              <p className="kicker">Related</p>
              <ul className="mt-4 space-y-3">
                <li className="border-t border-[var(--hairline)] pt-3">
                  <a href="/relocate" className="no-underline hover:underline">
                    <p className="serif font-semibold leading-snug">Moving to {city}</p>
                    <p className="meta mt-1">Suburbs, services and settling in</p>
                  </a>
                </li>
                <li className="border-t border-[var(--hairline)] pt-3">
                  <a href="/news" className="no-underline hover:underline">
                    <p className="serif font-semibold leading-snug">Local news</p>
                    <p className="meta mt-1">Transport updates and disruptions</p>
                  </a>
                </li>
                <li className="border-t border-[var(--hairline)] pt-3">
                  <a href="/weather" className="no-underline hover:underline">
                    <p className="serif font-semibold leading-snug">Weather</p>
                    <p className="meta mt-1">Plan your commute</p>
                  </a>
                </li>
              </ul>
            </div>
            <div className="border-t border-[var(--ink)] pt-6">
              <p className="kicker">Stay informed</p>
              <p className="meta mt-3">
                Get {city} news — including transport updates — each morning, free.
              </p>
              <a href="/#newsletter" className="btn-primary mt-4 inline-block">
                Subscribe free
              </a>
            </div>
          </aside>
        </div>
      </main>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `Transport in ${city} | ${siteName()}`,
          description: `Guide to public transport, cycling and driving in ${city}, Australia.`,
          url: absUrl("/transport"),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: absUrl("/") },
            { "@type": "ListItem", position: 2, name: "Transport", item: absUrl("/transport") },
          ],
        }}
      />
    </>
  );
}
