import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { JsonLd } from "@/components/JsonLd";
import { buildMeta, canonicalLinks, absUrl } from "@/lib/seo";
import { cityName, siteName } from "@/lib/city";

export const Route = createFileRoute("/arts")({
  head: () => ({
    meta: buildMeta({
      title: `Arts & Culture in ${cityName()} | ${siteName()}`,
      description: `${cityName()}'s arts and cultural scene — galleries, theatre, music, film and community arts. Updated daily by ${siteName()}.`,
      path: "/arts",
    }),
    links: canonicalLinks("/arts"),
  }),
  component: ArtsPage,
});

const SECTIONS = [
  {
    id: "scene",
    heading: `Arts and culture in ${cityName()}`,
    body: `${cityName()} has a vibrant arts scene built around a mix of major public institutions, independent galleries, live music venues and community arts organisations. The city's cultural infrastructure ranges from publicly funded galleries to grassroots creative spaces run by local artists.`,
  },
  {
    id: "galleries",
    heading: "Galleries and museums",
    body: `${cityName()}'s gallery and museum landscape includes major state institutions alongside smaller commercial and not-for-profit galleries. Rotating exhibitions keep the calendar fresh throughout the year. Many institutions offer free general admission, with charges for blockbuster shows.`,
    links: [
      { href: "/events", label: "Current exhibitions and events" },
    ],
  },
  {
    id: "theatre",
    heading: "Theatre and performance",
    body: `Live performance in ${cityName()} spans professional theatre at major venues, independent companies working in smaller spaces, comedy clubs and spoken word nights. Tickets at professional venues book out quickly for popular seasons — checking programs in advance is worthwhile.`,
    links: [
      { href: "/events", label: "Upcoming performances" },
    ],
  },
  {
    id: "music",
    heading: "Live music",
    body: `${cityName()}'s live music scene operates across pub venues, dedicated theatres, outdoor amphitheatres and festival grounds. Local bands play at pubs and clubs most weekends. National and international touring acts play the city's larger venues regularly throughout the year.`,
    links: [
      { href: "/events", label: "Music events" },
    ],
  },
  {
    id: "film",
    heading: "Film and cinema",
    body: `${cityName()} has multiplex cinemas for mainstream releases and independent cinemas for arthouse and international films. Film festivals — including dedicated international, documentary and short film programs — run throughout the year.`,
  },
  {
    id: "community",
    heading: "Community arts",
    body: `Community arts organisations in ${cityName()} run workshops, public installations and participatory projects. Many are supported through local council arts grants. First Nations cultural programs and festivals hold a significant place in the city's arts calendar.`,
    links: [
      { href: "/community", label: "Community news" },
    ],
  },
];

function ArtsPage() {
  const city = cityName();

  return (
    <>
      <SiteHeader activePath="/arts" />
      <main className="container-news py-10">
        <nav className="meta mb-4">
          <a href="/">Home</a> / Arts
        </nav>

        <p className="kicker">Arts &amp; culture</p>
        <h1 className="h1-news mt-2">Arts &amp; culture in {city}</h1>
        <p className="dek mt-3 max-w-2xl">
          Galleries, theatre, live music, film and community arts in {city}. Updated daily
          by {siteName()}.
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
              <p className="kicker">What's on</p>
              <ul className="mt-4 space-y-3">
                <li className="border-t border-[var(--hairline)] pt-3">
                  <a href="/events" className="no-underline hover:underline">
                    <p className="serif font-semibold leading-snug">Events calendar</p>
                    <p className="meta mt-1">Exhibitions, performances and festivals</p>
                  </a>
                </li>
                <li className="border-t border-[var(--hairline)] pt-3">
                  <a href="/things-to-do" className="no-underline hover:underline">
                    <p className="serif font-semibold leading-snug">Things to do</p>
                    <p className="meta mt-1">Experiences across {city}</p>
                  </a>
                </li>
                <li className="border-t border-[var(--hairline)] pt-3">
                  <a href="/best" className="no-underline hover:underline">
                    <p className="serif font-semibold leading-snug">Best of {city}</p>
                    <p className="meta mt-1">Curated local guides</p>
                  </a>
                </li>
                <li className="border-t border-[var(--hairline)] pt-3">
                  <a href="/community" className="no-underline hover:underline">
                    <p className="serif font-semibold leading-snug">Community</p>
                    <p className="meta mt-1">Local organisations and notices</p>
                  </a>
                </li>
              </ul>
            </div>
            <div className="border-t border-[var(--ink)] pt-6">
              <p className="kicker">Arts news daily</p>
              <p className="meta mt-3">
                {city} arts and culture news every morning, free in your inbox.
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
          name: `Arts & Culture in ${city} | ${siteName()}`,
          description: `Guide to arts, galleries, theatre, music and culture in ${city}, Australia.`,
          url: absUrl("/arts"),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: absUrl("/") },
            { "@type": "ListItem", position: 2, name: "Arts & Culture", item: absUrl("/arts") },
          ],
        }}
      />
    </>
  );
}
