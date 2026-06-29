import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { JsonLd } from "@/components/JsonLd";
import { buildMeta, canonicalLinks, absUrl } from "@/lib/seo";
import { cityName, siteName } from "@/lib/city";

export const Route = createFileRoute("/nightlife")({
  head: () => ({
    meta: buildMeta({
      title: `Nightlife in ${cityName()} | Bars, Clubs & Late Night | ${siteName()}`,
      description: `What to do after dark in ${cityName()} — bars, live music venues, clubs, late-night dining and entertainment. Updated by ${siteName()}.`,
      path: "/nightlife",
    }),
    links: canonicalLinks("/nightlife"),
  }),
  component: NightlifePage,
});

const SECTIONS = [
  {
    id: "scene",
    heading: "The nightlife scene",
    body: `${cityName()}'s after-dark culture spans everything from neighbourhood wine bars and live music pubs to dedicated nightclubs and late-night dining precincts. The city's nightlife reflects its demographic character — with inner-city areas typically having the greatest concentration of venues and the widest variety of options.`,
  },
  {
    id: "bars",
    heading: "Bars and pubs",
    body: `${cityName()} has a strong bar and pub culture. Neighbourhood pubs anchor local communities across the suburbs. The inner city hosts cocktail bars, wine bars, craft beer venues and rooftop bars that draw a mixed crowd through the week. Friday and Saturday nights are the peak; many venues are also busy on Thursday.`,
  },
  {
    id: "live",
    heading: "Live music",
    body: `Live music venues are the heart of ${cityName()}'s nightlife culture. Pubs and dedicated music venues host local and touring acts most nights of the week. The city's music scene spans rock, jazz, hip-hop, electronic and folk. Checking venue social media or event ticketing platforms for the current schedule is the most reliable way to find what's on.`,
    links: [
      { href: "/events", label: "Events and what's on" },
      { href: "/arts", label: "Arts and culture" },
    ],
  },
  {
    id: "clubs",
    heading: "Nightclubs and dancing",
    body: `${cityName()}'s nightclub scene is concentrated in entertainment precincts and the inner city. Clubs range from intimate dance bars to larger venues with international DJ bookings. Most operate from Thursday through Saturday. Entry policies, cover charges and dress codes vary by venue.`,
  },
  {
    id: "latedining",
    heading: "Late-night dining",
    body: `Late-night food options in ${cityName()} range from food-hall style options in entertainment precincts to neighbourhood kebab shops, 24-hour diners and late-closing Asian restaurants. Delivery apps extend the options further, with most major platforms operating until the early hours in inner suburbs.`,
  },
  {
    id: "safety",
    heading: "Getting home safely",
    body: `${cityName()}'s late-night transport options include rideshare apps, taxis and in some areas night bus services. Public transport typically has reduced service after midnight on weekdays, with some cities operating special late-night services on Friday and Saturday. Planning the trip home before you go out is sensible practice.`,
  },
];

function NightlifePage() {
  const city = cityName();

  return (
    <>
      <SiteHeader activePath="/nightlife" />
      <main className="container-news py-10">
        <nav className="meta mb-4">
          <a href="/">Home</a> / Nightlife
        </nav>

        <p className="kicker">Nightlife</p>
        <h1 className="h1-news mt-2">Nightlife in {city}</h1>
        <p className="dek mt-3 max-w-2xl">
          Bars, live music, clubs and late-night dining in {city}. What to do after dark,
          updated by {siteName()}.
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
                {"links" in s && s.links && s.links.length > 0 && (
                  <ul className="mt-4 flex flex-wrap gap-3">
                    {s.links.map((l: { href: string; label: string }) => (
                      <li key={l.href}>
                        <a href={l.href} className="meta underline">
                          {l.label} →
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
              <p className="kicker">Going out</p>
              <ul className="mt-4 space-y-3">
                <li className="border-t border-[var(--hairline)] pt-3">
                  <a href="/events" className="no-underline hover:underline">
                    <p className="serif font-semibold leading-snug">Events calendar</p>
                    <p className="meta mt-1">Gigs, shows and nights out</p>
                  </a>
                </li>
                <li className="border-t border-[var(--hairline)] pt-3">
                  <a href="/arts" className="no-underline hover:underline">
                    <p className="serif font-semibold leading-snug">Arts &amp; culture</p>
                    <p className="meta mt-1">Theatre, music and film</p>
                  </a>
                </li>
                <li className="border-t border-[var(--hairline)] pt-3">
                  <a href="/food" className="no-underline hover:underline">
                    <p className="serif font-semibold leading-snug">Food &amp; dining</p>
                    <p className="meta mt-1">Restaurants and late-night options</p>
                  </a>
                </li>
                <li className="border-t border-[var(--hairline)] pt-3">
                  <a href="/tourism" className="no-underline hover:underline">
                    <p className="serif font-semibold leading-snug">Visiting {city}</p>
                    <p className="meta mt-1">What to see and do</p>
                  </a>
                </li>
              </ul>
            </div>
            <div className="border-t border-[var(--ink)] pt-6">
              <p className="kicker">Stay in the loop</p>
              <p className="meta mt-3">
                {city} nightlife and events news every morning, free.
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
          name: `Nightlife in ${city} | ${siteName()}`,
          description: `Guide to bars, live music, clubs and late-night entertainment in ${city}, Australia.`,
          url: absUrl("/nightlife"),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: absUrl("/") },
            { "@type": "ListItem", position: 2, name: "Nightlife", item: absUrl("/nightlife") },
          ],
        }}
      />
    </>
  );
}
