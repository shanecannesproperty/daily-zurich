import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { JsonLd } from "@/components/JsonLd";
import { buildMeta, canonicalLinks, absUrl } from "@/lib/seo";
import { cityName, siteName } from "@/lib/city";

export const Route = createFileRoute("/volunteer")({
  head: () => ({
    meta: buildMeta({
      title: `Volunteering in ${cityName()} | Community & Charity | ${siteName()}`,
      description: `How to volunteer in ${cityName()} — community organisations, charity opportunities and local causes. Connect with your community through ${siteName()}.`,
      path: "/volunteer",
    }),
    links: canonicalLinks("/volunteer"),
  }),
  component: VolunteerPage,
});

const SECTIONS = [
  {
    id: "why",
    heading: "Volunteering in the community",
    body: `Volunteering is one of the most direct ways to connect with ${cityName()}'s community and contribute to local life. From emergency services to food banks, arts organisations to sporting clubs, the city's volunteer sector spans thousands of organisations and hundreds of thousands of hours of unpaid community work each year.`,
  },
  {
    id: "emergency",
    heading: "Emergency and community services",
    body: `The SES (State Emergency Service), Rural Fire Service, surf lifesaving clubs and community first aid organisations depend entirely on volunteers. These roles require training and commitment but provide deeply meaningful community service. Training is provided and equipment is supplied. Most emergency services welcome applications year-round.`,
  },
  {
    id: "charities",
    heading: "Charities and welfare organisations",
    body: `Food banks, op shops, homeless services, aged care companions and disability support volunteers are needed year-round. Organisations including Foodbank, St Vincent de Paul, Salvation Army, Anglicare and many local charities run structured volunteer programs. Demand for food and welfare volunteers typically increases in winter.`,
    links: [
      { href: "/community", label: "Community news and resources" },
    ],
  },
  {
    id: "arts",
    heading: "Arts and cultural volunteering",
    body: `${cityName()}'s galleries, museums, theatres and festivals rely heavily on volunteers. Gallery guides, festival marshals, event assistants and arts administration volunteers are regularly sought. Volunteering with cultural institutions offers access to programming and professional networks alongside the community contribution.`,
    links: [
      { href: "/arts", label: "Arts and culture in the city" },
    ],
  },
  {
    id: "sport",
    heading: "Sport and recreation volunteering",
    body: `Community sporting clubs across ${cityName()} depend entirely on volunteer coaches, administrators, ground staff, team managers and committee members. The local football club, netball association or cricket club in your suburb likely has dozens of volunteer roles that are critical to operations. Volunteering in community sport is one of the most practical ways to connect with local life.`,
  },
  {
    id: "finding",
    heading: "How to find volunteer opportunities",
    body: `Volunteer referral services including GoVolunteer and the Volunteering Australia national database list opportunities by location and interest. Local council community directories list local organisations that take volunteers. Approaching organisations you personally use or care about directly is also effective — most welcome the contact.`,
  },
];

function VolunteerPage() {
  const city = cityName();

  return (
    <>
      <SiteHeader activePath="/volunteer" />
      <main className="container-news py-10">
        <nav className="meta mb-4">
          <a href="/">Home</a> / Volunteer
        </nav>

        <p className="kicker">Community &amp; volunteering</p>
        <h1 className="h1-news mt-2">Volunteering in {city}</h1>
        <p className="dek mt-3 max-w-2xl">
          How to get involved and give back in {city} — community organisations,
          charities and local volunteer opportunities. From {siteName()}.
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
              <p className="kicker">Community links</p>
              <ul className="mt-4 space-y-3">
                <li className="border-t border-[var(--hairline)] pt-3">
                  <a href="/community" className="no-underline hover:underline">
                    <p className="serif font-semibold leading-snug">Community news</p>
                    <p className="meta mt-1">Local organisations and updates</p>
                  </a>
                </li>
                <li className="border-t border-[var(--hairline)] pt-3">
                  <a href="/events" className="no-underline hover:underline">
                    <p className="serif font-semibold leading-snug">Events</p>
                    <p className="meta mt-1">Community events and fundraisers</p>
                  </a>
                </li>
                <li className="border-t border-[var(--hairline)] pt-3">
                  <a href="/wellness" className="no-underline hover:underline">
                    <p className="serif font-semibold leading-snug">Wellness</p>
                    <p className="meta mt-1">Mental health and community support</p>
                  </a>
                </li>
                <li className="border-t border-[var(--hairline)] pt-3">
                  <a href="/schools" className="no-underline hover:underline">
                    <p className="serif font-semibold leading-snug">Schools</p>
                    <p className="meta mt-1">P&amp;C and school community roles</p>
                  </a>
                </li>
              </ul>
            </div>
            <div className="border-t border-[var(--ink)] pt-6">
              <p className="kicker">Community news daily</p>
              <p className="meta mt-3">
                {city} community and volunteering news each morning, free.
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
          name: `Volunteering in ${city} | ${siteName()}`,
          description: `Guide to volunteering and community organisations in ${city}, Australia.`,
          url: absUrl("/volunteer"),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: absUrl("/") },
            { "@type": "ListItem", position: 2, name: "Volunteer", item: absUrl("/volunteer") },
          ],
        }}
      />
    </>
  );
}
