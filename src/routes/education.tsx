import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { JsonLd } from "@/components/JsonLd";
import { buildMeta, canonicalLinks, absUrl } from "@/lib/seo";
import { cityName, siteName } from "@/lib/city";

export const Route = createFileRoute("/education")({
  head: () => ({
    meta: buildMeta({
      title: `Education in ${cityName()} | Schools, Universities & Learning | ${siteName()}`,
      description: `${cityName()} education guide — schools, universities, TAFE and early learning. Updated by ${siteName()}.`,
      path: "/education",
    }),
    links: canonicalLinks("/education"),
  }),
  component: EducationPage,
});

const SECTIONS = [
  {
    id: "overview",
    heading: `Education in ${cityName()}`,
    body: `${cityName()} has a well-developed education system spanning early childhood, primary, secondary and tertiary education. State government schools are funded and managed at the state and territory level. Private and Catholic schools operate alongside the public system. Universities and TAFE institutes provide tertiary and vocational pathways.`,
  },
  {
    id: "schools",
    heading: "Primary and secondary schools",
    body: `${cityName()} has a range of government and non-government primary and secondary schools. Government schools are generally allocated by catchment zone. Private and Catholic schools often draw from a broader area and require enrolment applications. School performance varies by institution — checking NAPLAN results and ATAR outcomes is worthwhile for families making school selections.`,
    links: [
      { href: "/relocate", label: "Moving to " + cityName() + " — settling in" },
    ],
  },
  {
    id: "early",
    heading: "Early childhood education and care",
    body: `Long day care, family day care and preschool (kindergarten) options are available across ${cityName()}. The federal childcare subsidy reduces out-of-pocket costs for eligible families. Demand for places at popular centres is high — early registration is important, particularly for inner-city and coastal areas with competitive markets.`,
  },
  {
    id: "universities",
    heading: "Universities and higher education",
    body: `${cityName()} is served by one or more universities offering undergraduate and postgraduate programs across arts, sciences, business, law, health and engineering. University rankings, program-specific reputation and location relative to your suburb all affect the right choice for your circumstances. Applications are made through UAC (NSW/ACT), VTAC (Victoria), QTAC (Queensland), SATAC (SA) or the relevant state equivalent.`,
    links: [
      { href: "/jobs", label: "Local jobs and graduate employment" },
    ],
  },
  {
    id: "tafe",
    heading: "TAFE and vocational training",
    body: `TAFE institutes in ${cityName()} provide vocational education and training (VET) in trades, healthcare, hospitality, business, creative arts and IT. Certificate and diploma programs are typically shorter and more practically oriented than university degrees. TAFE is the main pathway for apprenticeships and traineeships in the building and construction trades.`,
    links: [
      { href: "/jobs", label: "Employment news and opportunities" },
    ],
  },
  {
    id: "international",
    heading: "International students",
    body: `${cityName()} welcomes international students across its schools and tertiary institutions. Universities provide dedicated international student support services. English language colleges (ELICOS) prepare students for mainstream study. International students contribute significantly to the city's economy and cultural diversity.`,
  },
];

function EducationPage() {
  const city = cityName();

  return (
    <>
      <SiteHeader activePath="/education" />
      <main className="container-news py-10">
        <nav className="meta mb-4">
          <a href="/">Home</a> / Education
        </nav>

        <p className="kicker">Education</p>
        <h1 className="h1-news mt-2">Education in {city}</h1>
        <p className="dek mt-3 max-w-2xl">
          Schools, universities, TAFE and early learning in {city}. Education news and
          information from {siteName()}.
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
                  <a href="/relocate" className="no-underline hover:underline">
                    <p className="serif font-semibold leading-snug">Moving to {city}</p>
                    <p className="meta mt-1">Schools, catchments and settling in</p>
                  </a>
                </li>
                <li className="border-t border-[var(--hairline)] pt-3">
                  <a href="/jobs" className="no-underline hover:underline">
                    <p className="serif font-semibold leading-snug">Jobs and careers</p>
                    <p className="meta mt-1">Graduate employment and local market</p>
                  </a>
                </li>
                <li className="border-t border-[var(--hairline)] pt-3">
                  <a href="/community" className="no-underline hover:underline">
                    <p className="serif font-semibold leading-snug">Community</p>
                    <p className="meta mt-1">Family services and local support</p>
                  </a>
                </li>
                <li className="border-t border-[var(--hairline)] pt-3">
                  <a href="/news" className="no-underline hover:underline">
                    <p className="serif font-semibold leading-snug">Local news</p>
                    <p className="meta mt-1">Education news and policy</p>
                  </a>
                </li>
              </ul>
            </div>
            <div className="border-t border-[var(--ink)] pt-6">
              <p className="kicker">Stay informed</p>
              <p className="meta mt-3">
                {city} news — including education and community updates — every morning, free.
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
          name: `Education in ${city} | ${siteName()}`,
          description: `Guide to schools, universities, TAFE and early childhood education in ${city}, Australia.`,
          url: absUrl("/education"),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: absUrl("/") },
            { "@type": "ListItem", position: 2, name: "Education", item: absUrl("/education") },
          ],
        }}
      />
    </>
  );
}
