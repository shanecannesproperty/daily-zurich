import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { JsonLd } from "@/components/JsonLd";
import { buildMeta, canonicalLinks, absUrl } from "@/lib/seo";
import { cityName, siteName } from "@/lib/city";

export const Route = createFileRoute("/schools")({
  head: () => ({
    meta: buildMeta({
      title: `Schools in ${cityName()} | Education Guide | ${siteName()}`,
      description: `A local guide to schools, childcare and education in ${cityName()} — primary, secondary, TAFE and university. Updated by ${siteName()}.`,
      path: "/schools",
    }),
    links: canonicalLinks("/schools"),
  }),
  component: SchoolsPage,
});

const SECTIONS = [
  {
    id: "primary",
    heading: "Primary schools",
    body: `${cityName()} has a mix of government, Catholic and independent primary schools spread across the city's suburbs. School zoning applies to government schools — your address determines your local school. Applications for out-of-zone placements open each year through the state education department.`,
  },
  {
    id: "secondary",
    heading: "Secondary schools and colleges",
    body: `Secondary education in ${cityName()} includes comprehensive government high schools, selective schools, Catholic colleges and independent schools. Some cities also offer specialist arts, sports or STEM pathways. Year 11 and 12 students can choose from a range of senior secondary colleges.`,
  },
  {
    id: "early",
    heading: "Early childhood and childcare",
    body: `Childcare, kindergarten and preschool services in ${cityName()} range from community-run centres to national providers. Wait lists at popular centres can be long — register early. The federal government's Child Care Subsidy (CCS) reduces costs for eligible families.`,
  },
  {
    id: "tertiary",
    heading: "TAFE and university",
    body: `${cityName()} is home to university campuses and TAFE colleges offering courses from trades and vocational qualifications to undergraduate and postgraduate degrees. International students and domestic applicants can apply directly through institutions or via UAC/VTAC and equivalent admissions bodies.`,
  },
  {
    id: "enrolment",
    heading: "Enrolment and zoning",
    body: `Government school enrolments are managed through the relevant state or territory education department. Private and Catholic school enrolments are handled directly by each school. Many primary schools hold information nights for prospective families — check local school websites for dates.`,
  },
];

function SchoolsPage() {
  const city = cityName();

  return (
    <>
      <SiteHeader activePath="/schools" />
      <main className="container-news py-10">
        <nav className="meta mb-4">
          <a href="/">Home</a> / Schools
        </nav>

        <p className="kicker">Education</p>
        <h1 className="h1-news mt-2">Schools in {city}</h1>
        <p className="dek mt-3 max-w-2xl">
          A local guide to primary and secondary schools, early childhood services, TAFE and
          university in {city}. Use this as a starting point — always confirm directly with
          schools and the relevant education department.
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
              <p className="kicker">Related guides</p>
              <ul className="mt-4 space-y-3">
                <li className="border-t border-[var(--hairline)] pt-3">
                  <a href="/relocate" className="no-underline hover:underline">
                    <p className="serif font-semibold leading-snug">Moving to {city}</p>
                    <p className="meta mt-1">Suburbs, transport and services</p>
                  </a>
                </li>
                <li className="border-t border-[var(--hairline)] pt-3">
                  <a href="/property" className="no-underline hover:underline">
                    <p className="serif font-semibold leading-snug">Property market</p>
                    <p className="meta mt-1">Suburbs, prices and rental market</p>
                  </a>
                </li>
                <li className="border-t border-[var(--hairline)] pt-3">
                  <a href="/community" className="no-underline hover:underline">
                    <p className="serif font-semibold leading-snug">Community news</p>
                    <p className="meta mt-1">Local services and what's on</p>
                  </a>
                </li>
              </ul>
            </div>
            <div className="border-t border-[var(--ink)] pt-6">
              <p className="kicker">Daily briefing</p>
              <p className="meta mt-3">
                {city} news every morning, free in your inbox.
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
          name: `Schools in ${city} | ${siteName()}`,
          description: `Guide to schools and education in ${city}, Australia.`,
          url: absUrl("/schools"),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: absUrl("/") },
            { "@type": "ListItem", position: 2, name: "Schools", item: absUrl("/schools") },
          ],
        }}
      />
    </>
  );
}
