import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { JsonLd } from "@/components/JsonLd";
import { buildMeta, canonicalLinks, absUrl } from "@/lib/seo";
import { cityName, siteName } from "@/lib/city";

export const Route = createFileRoute("/shopping")({
  head: () => ({
    meta: buildMeta({
      title: `Shopping in ${cityName()} | Centres, Markets & Local Retail | ${siteName()}`,
      description: `Where to shop in ${cityName()} — shopping centres, local markets, independent retailers and online delivery. Updated by ${siteName()}.`,
      path: "/shopping",
    }),
    links: canonicalLinks("/shopping"),
  }),
  component: ShoppingPage,
});

const SECTIONS = [
  {
    id: "centres",
    heading: "Shopping centres",
    body: `${cityName()} is served by major shopping centres anchored by supermarkets and national retail chains. Centres in the inner city tend to skew towards fashion and specialty retail. Larger outer suburban centres offer a broader mix including homewares, electronics and food courts. Trading hours generally follow standard retail hours, with extended hours on Thursdays and Fridays in most states.`,
  },
  {
    id: "strips",
    heading: "High streets and retail strips",
    body: `Many of ${cityName()}'s suburbs have a distinct high street or retail strip with a mix of independent shops, cafes and services. These strips are where much of the city's independent retail, specialty food and boutique fashion trades. They tend to close earlier than shopping centres and may not trade on Sundays.`,
  },
  {
    id: "markets",
    heading: "Markets",
    body: `Farmers markets, artisan markets and flea markets operate across ${cityName()} on weekends. These are a good source of local produce, handmade goods, vintage items and specialty food. Market locations and dates change seasonally — check the events calendar for current listings.`,
    links: [
      { href: "/events", label: "Markets and events calendar" },
    ],
  },
  {
    id: "independent",
    heading: "Independent retailers",
    body: `${cityName()} has a healthy independent retail scene across fashion, books, homewares, music and specialty food. Independent retailers are concentrated in the city's inner suburbs and village strips. Supporting local retail is a recurring theme in local business coverage.`,
    links: [
      { href: "/business", label: "Local business news" },
    ],
  },
  {
    id: "online",
    heading: "Online shopping and delivery",
    body: `Most major Australian online retailers deliver to ${cityName()} with standard and express options. Same-day delivery is available through some providers for inner-city suburbs. Local businesses increasingly offer click-and-collect and local delivery services, often through their own sites or third-party platforms.`,
  },
];

function ShoppingPage() {
  const city = cityName();

  return (
    <>
      <SiteHeader activePath="/shopping" />
      <main className="container-news py-10">
        <nav className="meta mb-4">
          <a href="/">Home</a> / Shopping
        </nav>

        <p className="kicker">Shopping</p>
        <h1 className="h1-news mt-2">Shopping in {city}</h1>
        <p className="dek mt-3 max-w-2xl">
          Shopping centres, high streets, local markets and independent retailers in {city}.
          Business news and retail updates from {siteName()}.
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
              <p className="kicker">Also useful</p>
              <ul className="mt-4 space-y-3">
                <li className="border-t border-[var(--hairline)] pt-3">
                  <a href="/events" className="no-underline hover:underline">
                    <p className="serif font-semibold leading-snug">Markets &amp; events</p>
                    <p className="meta mt-1">Weekend markets and pop-ups</p>
                  </a>
                </li>
                <li className="border-t border-[var(--hairline)] pt-3">
                  <a href="/business" className="no-underline hover:underline">
                    <p className="serif font-semibold leading-snug">Business news</p>
                    <p className="meta mt-1">Retail openings, closures and news</p>
                  </a>
                </li>
                <li className="border-t border-[var(--hairline)] pt-3">
                  <a href="/classifieds" className="no-underline hover:underline">
                    <p className="serif font-semibold leading-snug">Classifieds</p>
                    <p className="meta mt-1">Buy and sell locally</p>
                  </a>
                </li>
                <li className="border-t border-[var(--hairline)] pt-3">
                  <a href="/best" className="no-underline hover:underline">
                    <p className="serif font-semibold leading-snug">Best of {city}</p>
                    <p className="meta mt-1">Curated shopping guides</p>
                  </a>
                </li>
              </ul>
            </div>
            <div className="border-t border-[var(--ink)] pt-6">
              <p className="kicker">Daily briefing</p>
              <p className="meta mt-3">
                {city} business and retail news every morning, free.
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
          name: `Shopping in ${city} | ${siteName()}`,
          description: `Guide to shopping centres, markets and local retail in ${city}, Australia.`,
          url: absUrl("/shopping"),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: absUrl("/") },
            { "@type": "ListItem", position: 2, name: "Shopping", item: absUrl("/shopping") },
          ],
        }}
      />
    </>
  );
}
