import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { JsonLd } from "@/components/JsonLd";
import { buildMeta, canonicalLinks, absUrl } from "@/lib/seo";
import { cityName, siteName } from "@/lib/city";

export const Route = createFileRoute("/tourism")({
  head: () => ({
    meta: buildMeta({
      title: `Visiting ${cityName()} | Tourism Guide | ${siteName()}`,
      description: `Your local guide to visiting ${cityName()}. Top attractions, where to eat, things to do, events and getting around — updated daily by ${siteName()}.`,
      path: "/tourism",
    }),
    links: canonicalLinks("/tourism"),
  }),
  component: TourismPage,
});

const SECTIONS = [
  {
    id: "attractions",
    heading: "Top attractions",
    body: `${cityName()} offers a mix of cultural landmarks, natural spaces and local institutions that draw visitors year-round. From galleries and museums to parks, markets and heritage precincts, there is something to fill every day of a visit. Check our events calendar for festivals and temporary exhibitions running during your stay.`,
    links: [
      { href: "/things-to-do", label: "Things to do in {city}" },
      { href: "/events", label: "Upcoming events" },
    ],
  },
  {
    id: "food",
    heading: "Where to eat and drink",
    body: `The local food and drink scene reflects {city}'s diverse community. Independent cafes open early for the morning crowd, neighbourhood restaurants serve lunch through to late, and a growing bar culture has made {city} evenings worth staying up for. Our business section covers new openings and closures as they happen.`,
    links: [
      { href: "/best", label: "Curated local guides" },
      { href: "/business", label: "Business news" },
    ],
  },
  {
    id: "getting-around",
    heading: "Getting here and getting around",
    body: `{city} is well connected by road, rail and, depending on the city, air and sea. Public transport covers the inner suburbs on regular timetables. Rideshare and taxi services operate city-wide. For day trips into the surrounding region, a car or bicycle gives the most flexibility.`,
    links: [
      { href: "/news", label: "Local transport news" },
    ],
  },
  {
    id: "stay",
    heading: "Where to stay",
    body: `Accommodation in {city} ranges from budget options near the centre to hotels, serviced apartments and holiday rentals across the suburbs. Booking ahead is recommended during major events and school holidays. Our property section covers the rental market for those considering a longer stay.`,
    links: [
      { href: "/property", label: "Property and rental market" },
      { href: "/events", label: "Major events calendar" },
    ],
  },
  {
    id: "weather",
    heading: "When to visit",
    body: `{city}'s climate varies by season. Checking the local forecast before you arrive helps you pack correctly and plan outdoor activities. Our live weather page shows current conditions and the week ahead.`,
    links: [
      { href: "/weather", label: "Live {city} weather" },
    ],
  },
];

function TourismPage() {
  const city = cityName();

  function interpolate(str: string) {
    return str.replace(/\{city\}/g, city);
  }

  return (
    <>
      <SiteHeader activePath="/tourism" />
      <main className="container-news py-10">
        <nav className="meta mb-4">
          <a href="/">Home</a> / Tourism
        </nav>

        <p className="kicker">Visitor guide</p>
        <h1 className="h1-news mt-2">Visiting {city}</h1>
        <p className="dek mt-3 max-w-2xl">
          A practical guide to getting the most out of {city} — whether you are here for a weekend
          or planning a longer stay. Local intelligence, updated daily.
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
                <p className="prose-news mt-4">{interpolate(s.body)}</p>
                {s.links.length > 0 && (
                  <ul className="mt-4 flex flex-wrap gap-3">
                    {s.links.map((l) => (
                      <li key={l.href}>
                        <a href={l.href} className="meta underline">
                          {interpolate(l.label)} →
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          <aside className="space-y-8 border-t border-[var(--ink)] pt-8 lg:border-t-0 lg:pt-0 lg:border-l lg:border-[var(--hairline)] lg:pl-10">
            <div>
              <p className="kicker">Plan your visit</p>
              <ul className="mt-4 space-y-3">
                <li className="border-t border-[var(--hairline)] pt-3">
                  <a href="/events" className="no-underline hover:underline">
                    <p className="serif font-semibold leading-snug">What's on this week</p>
                    <p className="meta mt-1">Upcoming events in {city}</p>
                  </a>
                </li>
                <li className="border-t border-[var(--hairline)] pt-3">
                  <a href="/weather" className="no-underline hover:underline">
                    <p className="serif font-semibold leading-snug">Weather forecast</p>
                    <p className="meta mt-1">Current conditions and the week ahead</p>
                  </a>
                </li>
                <li className="border-t border-[var(--hairline)] pt-3">
                  <a href="/things-to-do" className="no-underline hover:underline">
                    <p className="serif font-semibold leading-snug">Things to do</p>
                    <p className="meta mt-1">Attractions, activities and experiences</p>
                  </a>
                </li>
                <li className="border-t border-[var(--hairline)] pt-3">
                  <a href="/best" className="no-underline hover:underline">
                    <p className="serif font-semibold leading-snug">Best of {city}</p>
                    <p className="meta mt-1">Curated guides from the {siteName()} team</p>
                  </a>
                </li>
              </ul>
            </div>

            <div className="border-t border-[var(--ink)] pt-6">
              <p className="kicker">Stay informed</p>
              <p className="meta mt-3">
                Get {city} news and what's on each morning, free in your inbox.
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
          "@type": "TouristDestination",
          name: city,
          description: `Tourist guide to ${city}, Australia — attractions, dining, accommodation and events.`,
          url: absUrl("/tourism"),
          touristType: ["Leisure", "Culture", "Nature"],
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: absUrl("/") },
            { "@type": "ListItem", position: 2, name: "Tourism", item: absUrl("/tourism") },
          ],
        }}
      />
    </>
  );
}
