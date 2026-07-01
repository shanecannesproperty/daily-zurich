import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { JsonLd } from "@/components/JsonLd";
import { buildMeta, canonicalLinks, absUrl } from "@/lib/seo";
import { cityName, siteName } from "@/lib/city";

export const Route = createFileRoute("/food")({
  head: () => ({
    meta: buildMeta({
      title: `Food & Dining in ${cityName()} | Restaurants & Cafes | ${siteName()}`,
      description: `Where to eat in ${cityName()} — local restaurants, cafes, markets and food news. Updated daily by ${siteName()}.`,
      path: "/food",
    }),
    links: canonicalLinks("/food"),
  }),
  component: FoodPage,
});

const SECTIONS = [
  {
    id: "scene",
    heading: `The ${cityName()} food scene`,
    body: `${cityName()}'s dining scene has grown significantly in recent years. A mix of long-established local institutions and newer independent restaurants reflects the city's diverse community. From Vietnamese pho to modern Australian tasting menus, the range is broader than many outsiders expect.`,
  },
  {
    id: "cafes",
    heading: "Cafes and coffee",
    body: `Specialty coffee culture is strong in ${cityName()}. Independent cafes in the inner suburbs compete on quality, with a focus on single-origin espresso and alternative brewing methods. Most open early to serve the commuter crowd and stay busy through lunch.`,
  },
  {
    id: "restaurants",
    heading: "Restaurants",
    body: `The restaurant scene spans every price point. Casual BYO spots in neighbourhood strips are popular for mid-week dining. The city's fine dining options have expanded, with several receiving national attention. Bookings are strongly recommended on Friday and Saturday nights at popular venues.`,
  },
  {
    id: "markets",
    heading: "Food markets and producers",
    body: `${cityName()} hosts regular farmers markets where local producers sell fruit, vegetables, meat, dairy, bread and prepared food. Weekend markets are a reliable source of seasonal produce and support local growers. Check the events calendar for market dates and locations.`,
    links: [
      { href: "/events", label: "Local markets and events" },
    ],
  },
  {
    id: "takeaway",
    heading: "Takeaway and late night",
    body: `Takeaway options in ${cityName()} cover the full range from global fast food chains to local fish and chip shops, pizza joints and ethnic cuisines. Late-night food options concentrate in entertainment precincts and near transport hubs.`,
  },
  {
    id: "news",
    heading: "Food and hospitality news",
    body: `New openings, closures, award winners and food-focused events are covered in our business section. The hospitality sector is one of ${cityName()}'s largest employers and a regular source of local news.`,
    links: [
      { href: "/business", label: "Business and hospitality news" },
      { href: "/best", label: "Best of {city} guides" },
    ],
  },
];

function FoodPage() {
  const city = cityName();

  function interpolate(str: string) {
    return str.replace(/\{city\}/g, city);
  }

  return (
    <>
      <SiteHeader activePath="/food" />
      <main className="container-news py-10">
        <nav className="meta mb-4">
          <a href="/">Home</a> / Food
        </nav>

        <p className="kicker">Food &amp; dining</p>
        <h1 className="h1-news mt-2">Food &amp; dining in {city}</h1>
        <p className="dek mt-3 max-w-2xl">
          Where to eat and drink in {city} — cafes, restaurants, markets and the latest food
          news. Updated daily by {siteName()}.
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
                  {interpolate(s.heading)}
                </h2>
                <p className="prose-news mt-4">{s.body}</p>
                {"links" in s && s.links && s.links.length > 0 && (
                  <ul className="mt-4 flex flex-wrap gap-3">
                    {s.links.map((l: { href: string; label: string }) => (
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
              <p className="kicker">Explore more</p>
              <ul className="mt-4 space-y-3">
                <li className="border-t border-[var(--hairline)] pt-3">
                  <a href="/events" className="no-underline hover:underline">
                    <p className="serif font-semibold leading-snug">Food events &amp; markets</p>
                    <p className="meta mt-1">Upcoming markets, festivals and tastings</p>
                  </a>
                </li>
                <li className="border-t border-[var(--hairline)] pt-3">
                  <a href="/best" className="no-underline hover:underline">
                    <p className="serif font-semibold leading-snug">Best of {city}</p>
                    <p className="meta mt-1">Curated local guides</p>
                  </a>
                </li>
                <li className="border-t border-[var(--hairline)] pt-3">
                  <a href="/business" className="no-underline hover:underline">
                    <p className="serif font-semibold leading-snug">Hospitality news</p>
                    <p className="meta mt-1">Openings, closures and industry news</p>
                  </a>
                </li>
                <li className="border-t border-[var(--hairline)] pt-3">
                  <a href="/things-to-do" className="no-underline hover:underline">
                    <p className="serif font-semibold leading-snug">Things to do</p>
                    <p className="meta mt-1">Events and experiences in {city}</p>
                  </a>
                </li>
              </ul>
            </div>
            <div className="border-t border-[var(--ink)] pt-6">
              <p className="kicker">Daily briefing</p>
              <p className="meta mt-3">
                {city} food news and what's on each morning, free in your inbox.
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
          name: `Food & Dining in ${city} | ${siteName()}`,
          description: `Guide to restaurants, cafes, food markets and dining in ${city}.`,
          url: absUrl("/food"),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: absUrl("/") },
            { "@type": "ListItem", position: 2, name: "Food & Dining", item: absUrl("/food") },
          ],
        }}
      />
    </>
  );
}
