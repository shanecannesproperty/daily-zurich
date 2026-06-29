import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { JsonLd } from "@/components/JsonLd";
import { buildMeta, canonicalLinks, absUrl } from "@/lib/seo";
import { cityName, siteName } from "@/lib/city";

export const Route = createFileRoute("/jobs")({
  head: () => ({
    meta: buildMeta({
      title: `Jobs in ${cityName()} | Local Employment & Career News | ${siteName()}`,
      description: `Jobs and employment in ${cityName()} — local job market news, top employers, industry sectors and career advice. Updated daily by ${siteName()}.`,
      path: "/jobs",
    }),
    links: canonicalLinks("/jobs"),
  }),
  component: JobsPage,
});

const SECTIONS = [
  {
    id: "market",
    heading: "The job market",
    body: `${cityName()}'s job market reflects the city's economic character — a mix of major employers in the public sector, healthcare and education alongside a private sector spanning retail, construction, hospitality and professional services. Employment conditions shift with economic cycles, but the city's diversity provides resilience.`,
  },
  {
    id: "sectors",
    heading: "Key sectors",
    body: `The largest employment sectors in ${cityName()} include healthcare and social assistance, retail trade, construction, education and training, accommodation and food services, and professional, scientific and technical services. Government employment at local, state and federal level is also significant in most Australian cities.`,
  },
  {
    id: "employers",
    heading: "Major employers",
    body: `${cityName()}'s largest employers span the public and private sectors. Hospitals and health networks, councils and state government agencies, universities, major retailers and construction companies are consistently among the biggest employment providers. Private sector employers span industries including logistics, manufacturing, financial services and technology.`,
    links: [
      { href: "/business", label: "Business and industry news" },
    ],
  },
  {
    id: "finding",
    heading: "Finding work",
    body: `Job seekers in ${cityName()} have access to national job boards including Seek, Indeed and LinkedIn for most roles. State and local government positions are advertised through their own portals. Networking through industry associations and professional events remains effective in ${cityName()}'s relatively connected professional community. Recruitment agencies active in the city specialise by sector and seniority.`,
  },
  {
    id: "wages",
    heading: "Wages and conditions",
    body: `Wages in ${cityName()} are set by a combination of national modern awards, enterprise agreements and individual contracts. The national minimum wage provides the floor. Skilled trades, healthcare professionals, engineers and technology workers typically command wages above award rates. Pay transparency is improving as employers compete for talent.`,
  },
  {
    id: "news",
    heading: "Employment news",
    body: `Job market updates, major employer announcements, business openings and closures, and workforce developments are covered in our business and news sections. Economic conditions affecting employment — interest rates, consumer spending, government policy — are also covered in local and national news.`,
    links: [
      { href: "/business", label: "Business news" },
      { href: "/news", label: "Local news" },
      { href: "/finance", label: "Finance and economy" },
    ],
  },
];

function JobsPage() {
  const city = cityName();

  return (
    <>
      <SiteHeader activePath="/jobs" />
      <main className="container-news py-10">
        <nav className="meta mb-4">
          <a href="/">Home</a> / Jobs
        </nav>

        <p className="kicker">Jobs &amp; employment</p>
        <h1 className="h1-news mt-2">Jobs in {city}</h1>
        <p className="dek mt-3 max-w-2xl">
          Local job market news, key sectors, major employers and employment resources
          in {city}. Updated daily by {siteName()}.
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
              <p className="kicker">Explore more</p>
              <ul className="mt-4 space-y-3">
                <li className="border-t border-[var(--hairline)] pt-3">
                  <a href="/business" className="no-underline hover:underline">
                    <p className="serif font-semibold leading-snug">Business news</p>
                    <p className="meta mt-1">Openings, closures and industry updates</p>
                  </a>
                </li>
                <li className="border-t border-[var(--hairline)] pt-3">
                  <a href="/finance" className="no-underline hover:underline">
                    <p className="serif font-semibold leading-snug">Finance &amp; economy</p>
                    <p className="meta mt-1">Local economic conditions</p>
                  </a>
                </li>
                <li className="border-t border-[var(--hairline)] pt-3">
                  <a href="/relocate" className="no-underline hover:underline">
                    <p className="serif font-semibold leading-snug">Moving to {city}</p>
                    <p className="meta mt-1">Suburbs, cost of living and settling in</p>
                  </a>
                </li>
                <li className="border-t border-[var(--hairline)] pt-3">
                  <a href="/community" className="no-underline hover:underline">
                    <p className="serif font-semibold leading-snug">Community</p>
                    <p className="meta mt-1">Local organisations and resources</p>
                  </a>
                </li>
              </ul>
            </div>
            <div className="border-t border-[var(--ink)] pt-6">
              <p className="kicker">Daily briefing</p>
              <p className="meta mt-3">
                {city} business and employment news every morning, free.
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
          name: `Jobs in ${city} | ${siteName()}`,
          description: `Local employment news, job market conditions and career resources in ${city}, Australia.`,
          url: absUrl("/jobs"),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: absUrl("/") },
            { "@type": "ListItem", position: 2, name: "Jobs", item: absUrl("/jobs") },
          ],
        }}
      />
    </>
  );
}
