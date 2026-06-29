import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { JsonLd } from "@/components/JsonLd";
import { NewsletterForm } from "@/components/NewsletterForm";
import { buildMeta, canonicalLinks, absUrl } from "@/lib/seo";
import { cityName, siteName } from "@/lib/city";
import ogDayTrips from "@/assets/og-day-trips-from-canberra.jpg";

const PATH = "/best/day-trips-from-canberra";
const TITLE = "The Ultimate Day Trips from Canberra";
const PUBLISHED = "2026-06-27T06:00:00+10:00";
const DESCRIPTION =
  "A curated editorial guide to the best day trips from Canberra: Snowy Mountains, Southern Highlands, Batemans Bay, Tidbinbilla and more. What to see, how to get there, and when to go.";

interface Trip {
  name: string;
  drive: string;
  best: string;
  blurb: string;
  highlights: string[];
}

const TRIPS: Trip[] = [
  {
    name: "Snowy Mountains and Thredbo",
    drive: "About 2h 30m south via the Monaro Highway",
    best: "Winter for snow; summer for alpine walks",
    blurb:
      "Australia's highest country sits closer to Canberra than to any other capital. Thredbo and Perisher run lifts through the winter, then pivot to chairlift hikes, bike trails and trout rivers from October.",
    highlights: [
      "Kosciuszko summit walk from the Thredbo chairlift",
      "Yarrangobilly thermal pool, a constant 27 degrees year round",
      "Lake Crackenback and Jindabyne for lakeside dining",
    ],
  },
  {
    name: "Southern Highlands",
    drive: "About 1h 30m north via the Hume",
    best: "Autumn for cool-climate gardens",
    blurb:
      "Bowral, Berrima and Mittagong deliver the closest taste of English countryside Australia offers. Cellar doors, sandstone villages and Saturday markets fill an easy day out of Canberra.",
    highlights: [
      "Tulip Time festival each September in Bowral",
      "Lunch in historic Berrima, settled in 1831",
      "Fitzroy Falls in Morton National Park",
    ],
  },
  {
    name: "Batemans Bay and the South Coast",
    drive: "About 2h east via the Kings Highway",
    best: "Summer and autumn for beaches and oysters",
    blurb:
      "The capital's beach. The Clyde River meets the Pacific at Batemans Bay, with Murramarang National Park north and Mogo Wildlife Park inland. Pelican Point and Broulee Island are the local favourites.",
    highlights: [
      "Pebbly Beach kangaroos at sunrise",
      "Clyde River oysters straight from the lease",
      "Mogo village arts and craft strip",
    ],
  },
  {
    name: "Tidbinbilla Nature Reserve",
    drive: "About 45 minutes south west",
    best: "Year round, early morning",
    blurb:
      "The closest proper bush day out from the city. Tidbinbilla holds koalas, platypus, brumbies and the Birrigai rock shelter, plus the Canberra Deep Space Communication Complex on the way home.",
    highlights: [
      "Platypus pools at dusk on the Sanctuary loop",
      "Mountain Creek picnic ground and gentle walks",
      "NASA tracking station free museum and cafe",
    ],
  },
  {
    name: "Murrumbateman and Yass wine country",
    drive: "About 45 minutes north",
    best: "Cellar door weekends, October to April",
    blurb:
      "Canberra District wine sits at altitude, which means crisp Riesling and elegant Shiraz. Clonakilla, Helm and Eden Road anchor a cellar door run that ends with dinner back in town.",
    highlights: [
      "Clonakilla Shiraz Viognier tastings",
      "Poachers Pantry smokehouse lunch",
      "Yass historic main street",
    ],
  },
  {
    name: "Braidwood and the Clyde",
    drive: "About 1h east on the Kings Highway",
    best: "Any clear day; markets first Saturday monthly",
    blurb:
      "A heritage listed gold rush town that has become the capital's favourite lunch stop. Cafes, antique shops and the Braidwood Bakery before dropping down the Clyde Mountain to the coast.",
    highlights: [
      "Dojo Bread sourdough and Braidwood pies",
      "Mona Farm gardens by appointment",
      "Bungendore Wood Works Gallery on the way",
    ],
  },
  {
    name: "Lake George and the Federal Highway",
    drive: "30 minutes north on the way to Goulburn",
    best: "After heavy winter rain when the lake fills",
    blurb:
      "Australia's strangest lake; sometimes vast, sometimes a paddock. The Bungendore wind farm lookout and Collector's pubs make a low effort half day with very local character.",
    highlights: [
      "Weereewa lookout above the lake",
      "Lerida Estate cellar door",
      "Collector Hotel, a proper country pub",
    ],
  },
  {
    name: "Namadgi and Mount Ginini",
    drive: "About 1h 15m south west",
    best: "Late spring through autumn",
    blurb:
      "The ACT's own alpine park. Granite tors, sub alpine snow gum forest, Aboriginal heritage sites and some of the darkest night skies within easy reach of any Australian capital.",
    highlights: [
      "Mount Franklin Road in autumn",
      "Yankee Hat rock art walk",
      "Astronomy nights at Mount Ginini",
    ],
  },
];

export const Route = createFileRoute("/best/day-trips-from-canberra")({
  head: () => ({
    meta: buildMeta({
      title: `${TITLE} | ${siteName()}`,
      description: DESCRIPTION,
      path: PATH,
      type: "article",
      image: ogDayTrips,
      section: `Best of ${cityName()}`,
      publishedTime: PUBLISHED,
      modifiedTime: PUBLISHED,
      author: siteName(),
    }),
    links: canonicalLinks(PATH),
  }),
  component: DayTripsGuide,
});

function DayTripsGuide() {
  return (
    <>
      <SiteHeader activePath="/best" />
      <main className="container-read py-10">
        <nav className="meta mb-4" aria-label="Breadcrumb">
          <a href="/">Home</a> / <a href="/best">Best of {cityName()}</a>
        </nav>
        <p className="kicker">Best of {cityName()}</p>
        <h1 className="h1-news mt-2">{TITLE}</h1>
        <p className="dek mt-4" style={{ fontFamily: "Georgia, serif" }}>
          Canberra is the only Australian capital within easy reach of snow, surf, vineyards and
          bushland in the same week. This is our standing list of the day trips worth the drive,
          with the season we'd recommend and what to do once you arrive.
        </p>
        <figure className="mt-6">
          <img
            src={ogDayTrips}
            alt="Snow-capped Snowy Mountains rising above the Monaro plains south of Canberra"
            width={1200}
            height={630}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="w-full h-auto"
          />
        </figure>


        <ol className="mt-10 divide-y divide-[var(--hairline)] border-t border-[var(--ink)]">
          {TRIPS.map((t, i) => (
            <li key={t.name} className="py-8">
              <div className="flex items-baseline gap-4">
                <span className="serif text-3xl text-[var(--ink-grey)]">{i + 1}</span>
                <h2 className="h2-news">{t.name}</h2>
              </div>
              <p className="meta mt-2">
                {t.drive} · Best: {t.best}
              </p>
              <p className="serif mt-3" style={{ fontFamily: "Georgia, serif" }}>
                {t.blurb}
              </p>
              <ul className="mt-3 list-disc pl-6 serif" style={{ fontFamily: "Georgia, serif" }}>
                {t.highlights.map((h) => (
                  <li key={h} className="mt-1">
                    {h}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>

        <section className="mt-12 border-t border-[var(--ink)] pt-8">
          <h2 className="h2-news">Planning notes</h2>
          <p className="serif mt-3" style={{ fontFamily: "Georgia, serif" }}>
            Fuel up before leaving Canberra; ranges between Cooma, Braidwood and Yass are limited
            on weekends. The Kings Highway down the Clyde is single lane in places and slows
            sharply in wet weather. For snow country, check NPWS road status before you go and
            carry chains between June and October.
          </p>
        </section>

        <div className="mt-12 border-t border-[var(--ink)] pt-10">
          <NewsletterForm source="guide:day-trips-from-canberra" variant="band" />
        </div>
      </main>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          "@id": absUrl(`${PATH}#article`),
          headline: TITLE,
          description: DESCRIPTION,
          url: absUrl(PATH),
          mainEntityOfPage: { "@type": "WebPage", "@id": absUrl(PATH) },
          articleSection: `Best of ${cityName()}`,
          inLanguage: "en-AU",
          datePublished: PUBLISHED,
          dateModified: PUBLISHED,
          image: [absUrl(ogDayTrips)],
          author: {
            "@type": "Organization",
            name: siteName(),
            url: absUrl("/"),
          },
          publisher: {
            "@type": "NewsMediaOrganization",
            name: siteName(),
            url: absUrl("/"),
            logo: {
              "@type": "ImageObject",
              url: absUrl("/favicon-192.png"),
            },
          },
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: TITLE,
          url: absUrl(PATH),
          numberOfItems: TRIPS.length,
          itemListOrder: "https://schema.org/ItemListOrderAscending",
          itemListElement: TRIPS.map((t, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "TouristAttraction",
              name: t.name,
              description: t.blurb,
              touristType: "Day trip from Canberra",
              isAccessibleForFree: true,
              address: {
                "@type": "PostalAddress",
                addressRegion: "NSW/ACT",
                addressCountry: "AU",
              },
            },
          })),
        }}
      />

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: absUrl("/") },
            {
              "@type": "ListItem",
              position: 2,
              name: `Best of ${cityName()}`,
              item: absUrl("/best"),
            },
            { "@type": "ListItem", position: 3, name: TITLE, item: absUrl(PATH) },
          ],
        }}
      />
    </>
  );
}
