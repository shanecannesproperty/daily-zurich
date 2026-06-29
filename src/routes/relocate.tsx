import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { JsonLd } from "@/components/JsonLd";
import { buildMeta, canonicalLinks, absUrl } from "@/lib/seo";
import { cityName, siteName } from "@/lib/city";

export const Route = createFileRoute("/relocate")({
  head: () => ({
    meta: buildMeta({
      title: `Moving to ${cityName()} | Relocation Guide | ${siteName()}`,
      description: `Everything you need to know about moving to ${cityName()} — suburbs, cost of living, schools, transport and local services. Practical advice from ${siteName()}.`,
      path: "/relocate",
    }),
    links: canonicalLinks("/relocate"),
  }),
  component: RelocatePage,
});

const SECTIONS = [
  {
    id: "why",
    heading: `Why people move to ${cityName()}`,
    body: `${cityName()} attracts newcomers for its job market, lifestyle and relative affordability compared to the largest capital cities. The city has grown steadily and continues to attract people from interstate and overseas. Many residents cite the balance of urban amenity and access to natural spaces as the main draw.`,
  },
  {
    id: "suburbs",
    heading: "Choosing a suburb",
    body: `${cityName()}'s suburbs vary significantly in character, price and access to services. Inner suburbs offer walkability and proximity to the city centre. Middle-ring suburbs typically offer more space and family-friendly environments. Outer suburbs offer the best value per square metre but require more reliance on private transport. Checking school catchment zones before buying or renting is essential for families.`,
    links: [
      { href: "/property", label: "Property market" },
      { href: "/schools", label: "Schools guide" },
    ],
  },
  {
    id: "cost",
    heading: "Cost of living",
    body: `Housing is the biggest cost driver in ${cityName()}. Rental vacancy rates and median prices shift frequently — check the current property section for the latest data. Groceries, utilities and transport costs are broadly in line with other Australian cities, with some variation depending on your suburb.`,
    links: [
      { href: "/property", label: "Property and rental market" },
    ],
  },
  {
    id: "transport",
    heading: "Getting around",
    body: `Public transport in ${cityName()} covers the inner city and major suburbs with buses and, in some parts of the network, light rail or trains. A car remains the most flexible option for outer suburbs and regional day trips. Rideshare and cycling infrastructure have expanded in recent years.`,
  },
  {
    id: "services",
    heading: "Services and settling in",
    body: `Once you arrive, enrolling with a local GP, dentist and Medicare provider are the first practical priorities. Council services — bins, rates, local permits — are managed through your local government area. For children, enrolling in school should be done several months in advance, particularly for out-of-zone government schools.`,
    links: [
      { href: "/community", label: "Community services" },
      { href: "/schools", label: "Schools" },
    ],
  },
  {
    id: "jobs",
    heading: "Finding work",
    body: `The local job market in ${cityName()} spans government, healthcare, education, construction and a growing technology sector. Large employers advertise on national platforms. Local and state government roles are advertised through their own portals.`,
    links: [
      { href: "/jobs", label: "Local jobs news" },
      { href: "/business", label: "Business news" },
    ],
  },
];

function RelocatePage() {
  const city = cityName();

  return (
    <>
      <SiteHeader activePath="/relocate" />
      <main className="container-news py-10">
        <nav className="meta mb-4">
          <a href="/">Home</a> / Moving to {city}
        </nav>

        <p className="kicker">Relocation guide</p>
        <h1 className="h1-news mt-2">Moving to {city}</h1>
        <p className="dek mt-3 max-w-2xl">
          A practical guide for anyone relocating to {city} — from choosing a suburb to
          finding a school and settling into local life.
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
              <p className="kicker">Quick links</p>
              <ul className="mt-4 space-y-3">
                <li className="border-t border-[var(--hairline)] pt-3">
                  <a href="/property" className="no-underline hover:underline">
                    <p className="serif font-semibold leading-snug">Property market</p>
                    <p className="meta mt-1">Rental and sale prices by suburb</p>
                  </a>
                </li>
                <li className="border-t border-[var(--hairline)] pt-3">
                  <a href="/schools" className="no-underline hover:underline">
                    <p className="serif font-semibold leading-snug">Schools in {city}</p>
                    <p className="meta mt-1">Primary, secondary and childcare</p>
                  </a>
                </li>
                <li className="border-t border-[var(--hairline)] pt-3">
                  <a href="/jobs" className="no-underline hover:underline">
                    <p className="serif font-semibold leading-snug">Local jobs</p>
                    <p className="meta mt-1">Employment news and opportunities</p>
                  </a>
                </li>
                <li className="border-t border-[var(--hairline)] pt-3">
                  <a href="/weather" className="no-underline hover:underline">
                    <p className="serif font-semibold leading-snug">Weather</p>
                    <p className="meta mt-1">Climate and seasonal forecast</p>
                  </a>
                </li>
              </ul>
            </div>
            <div className="border-t border-[var(--ink)] pt-6">
              <p className="kicker">Stay in the loop</p>
              <p className="meta mt-3">
                New to {city}? Get daily local news and what's on in your inbox, free.
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
          "@type": "Article",
          headline: `Moving to ${city} — Relocation Guide`,
          description: `Practical guide to relocating to ${city}, Australia.`,
          url: absUrl("/relocate"),
          publisher: {
            "@type": "Organization",
            name: siteName(),
          },
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: absUrl("/") },
            { "@type": "ListItem", position: 2, name: `Moving to ${city}`, item: absUrl("/relocate") },
          ],
        }}
      />
    </>
  );
}
