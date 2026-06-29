import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { JsonLd } from "@/components/JsonLd";
import { buildMeta, canonicalLinks, absUrl } from "@/lib/seo";
import { cityName, siteName } from "@/lib/city";

export const Route = createFileRoute("/outdoors")({
  head: () => ({
    meta: buildMeta({
      title: `Outdoors in ${cityName()} | Parks, Walks & Nature | ${siteName()}`,
      description: `Outdoor activities in ${cityName()} — parks, walking tracks, beaches, national parks and nature. Updated by ${siteName()}.`,
      path: "/outdoors",
    }),
    links: canonicalLinks("/outdoors"),
  }),
  component: OutdoorsPage,
});

const SECTIONS = [
  {
    id: "parks",
    heading: "Parks and reserves",
    body: `${cityName()} has an extensive network of parks, reserves and green spaces managed by local councils, state government and the national parks system. From inner-city parks to large regional reserves, outdoor spaces are among ${cityName()}'s most valued public assets. Parks are generally free to access and open daily.`,
  },
  {
    id: "walking",
    heading: "Walking and hiking",
    body: `Walking tracks range from accessible paths around lakes and reserves to challenging multi-day bushwalks in national parks around ${cityName()}. Most city councils maintain a network of signed walks of varying difficulty. Apps like AllTrails are useful for finding routes with reviews from other walkers.`,
    links: [
      { href: "/tourism", label: "Visitor guide to the area" },
    ],
  },
  {
    id: "cycling",
    heading: "Cycling",
    body: `${cityName()} has expanded its cycling infrastructure significantly in recent years. Dedicated cycling paths along waterways and through parks connect inner suburbs. Mountain biking trails are available in and around several national parks and reserves. Helmets are legally required throughout Australia for all cyclists.`,
    links: [
      { href: "/transport", label: "Getting around" },
    ],
  },
  {
    id: "water",
    heading: "Water activities",
    body: `${cityName()}'s relationship with water varies by geography — whether ocean beaches, rivers, lakes or harbours, water is typically part of the outdoor experience. Swimming, kayaking, paddleboarding, fishing and surfing are all practised by local communities depending on the local waterways.`,
  },
  {
    id: "national",
    heading: "National parks nearby",
    body: `National parks within day-trip distance of ${cityName()} offer some of Australia's most significant natural landscapes. These parks protect biodiversity, provide recreational access and are managed by state park authorities. Fees may apply for vehicle entry. Checking the park authority website before visiting is recommended.`,
  },
  {
    id: "seasons",
    heading: "Outdoor seasons",
    body: `The best outdoor season in ${cityName()} varies by activity and climate. Spring and autumn are generally most comfortable for extended walking. Summer brings heat that requires early morning starts and sun protection. Winter conditions vary significantly by city — Darwin's dry season is its outdoor peak; Hobart's winter is genuinely cold but the experienced outdoors community continues year-round.`,
  },
];

function OutdoorsPage() {
  const city = cityName();

  return (
    <>
      <SiteHeader activePath="/outdoors" />
      <main className="container-news py-10">
        <nav className="meta mb-4">
          <a href="/">Home</a> / Outdoors
        </nav>

        <p className="kicker">Outdoors</p>
        <h1 className="h1-news mt-2">Outdoors in {city}</h1>
        <p className="dek mt-3 max-w-2xl">
          Parks, walking tracks, beaches, national parks and outdoor activities in {city}.
          Nature news and outdoor guides from {siteName()}.
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
              <p className="kicker">Get outside</p>
              <ul className="mt-4 space-y-3">
                <li className="border-t border-[var(--hairline)] pt-3">
                  <a href="/weather" className="no-underline hover:underline">
                    <p className="serif font-semibold leading-snug">Weather</p>
                    <p className="meta mt-1">Plan your outdoor activities</p>
                  </a>
                </li>
                <li className="border-t border-[var(--hairline)] pt-3">
                  <a href="/tourism" className="no-underline hover:underline">
                    <p className="serif font-semibold leading-snug">Tourism guide</p>
                    <p className="meta mt-1">Visitor attractions and experiences</p>
                  </a>
                </li>
                <li className="border-t border-[var(--hairline)] pt-3">
                  <a href="/transport" className="no-underline hover:underline">
                    <p className="serif font-semibold leading-snug">Getting around</p>
                    <p className="meta mt-1">Buses, trains, cycling and rideshare</p>
                  </a>
                </li>
                <li className="border-t border-[var(--hairline)] pt-3">
                  <a href="/wellness" className="no-underline hover:underline">
                    <p className="serif font-semibold leading-snug">Wellness</p>
                    <p className="meta mt-1">Health, fitness and wellbeing</p>
                  </a>
                </li>
              </ul>
            </div>
            <div className="border-t border-[var(--ink)] pt-6">
              <p className="kicker">Outdoor news</p>
              <p className="meta mt-3">
                {city} outdoor and nature news in your inbox each morning, free.
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
          name: `Outdoors in ${city} | ${siteName()}`,
          description: `Guide to parks, walks, beaches and outdoor activities in ${city}, Australia.`,
          url: absUrl("/outdoors"),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: absUrl("/") },
            { "@type": "ListItem", position: 2, name: "Outdoors", item: absUrl("/outdoors") },
          ],
        }}
      />
    </>
  );
}
