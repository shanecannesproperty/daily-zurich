import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { JsonLd } from "@/components/JsonLd";
import { NewsletterForm } from "@/components/NewsletterForm";
import { buildMeta, canonicalLinks, absUrl } from "@/lib/seo";
import { cityName, siteName } from "@/lib/city";
import ogHero from "@/assets/og-canberra-vs-sydney.jpg";

const PATH = "/article/canberra-vs-sydney-cost-of-living";
const TITLE = "Canberra vs Sydney: the real cost of living compared";
const PUBLISHED = "2026-06-27T07:00:00+10:00";
const DESCRIPTION =
  "How much cheaper is Canberra than Sydney in 2026? A category by category comparison of housing, utilities, transport, groceries, childcare and lifestyle costs.";

interface Row {
  category: string;
  canberra: string;
  sydney: string;
  note: string;
}

const ROWS: Row[] = [
  {
    category: "Median house price",
    canberra: "$960,000",
    sydney: "$1.62m",
    note: "Sydney runs roughly 65 to 70 per cent dearer than Canberra at the detached-house median.",
  },
  {
    category: "Median unit price",
    canberra: "$575,000",
    sydney: "$840,000",
    note: "Apartments are the closest the two cities get; the Sydney premium narrows to about 45 per cent.",
  },
  {
    category: "Median weekly rent (house)",
    canberra: "$720",
    sydney: "$780",
    note: "Sydney has caught up since 2024 as Canberra rents softened with new supply in Molonglo and Gungahlin.",
  },
  {
    category: "Median weekly rent (unit)",
    canberra: "$580",
    sydney: "$720",
    note: "Inner Sydney still commands a clear premium for one and two bedroom apartments.",
  },
  {
    category: "Electricity (avg quarterly bill)",
    canberra: "$420",
    sydney: "$510",
    note: "ACT default offers track below Ausgrid and Endeavour network areas in NSW.",
  },
  {
    category: "Public transport (monthly)",
    canberra: "$130 MyWay+ cap",
    sydney: "$200 Opal weekly cap x 4",
    note: "Canberra's daily and weekly caps are materially lower; Sydney trips are longer and more frequent.",
  },
  {
    category: "Petrol (avg per litre)",
    canberra: "$1.94",
    sydney: "$2.06",
    note: "Sydney sits a few cents above the ACT on most cycles and swings harder week to week.",
  },
  {
    category: "Groceries (family of four, weekly)",
    canberra: "$320",
    sydney: "$345",
    note: "Comparable at Coles and Woolworths; Sydney's edge is wider fresh-produce competition.",
  },
  {
    category: "Long day childcare (per day, pre-rebate)",
    canberra: "$165",
    sydney: "$195",
    note: "Sydney's inner-ring centres regularly top $210; ACT subsidies and supply hold the median down.",
  },
  {
    category: "Coffee (large flat white)",
    canberra: "$6.00",
    sydney: "$6.50",
    note: "Both cities cleared $6 in 2025; Sydney CBD specialty cafes lead the rises.",
  },
];

export const Route = createFileRoute("/article/canberra-vs-sydney-cost-of-living")({
  head: () => ({
    meta: buildMeta({
      title: `${TITLE} | ${siteName()}`,
      description: DESCRIPTION,
      path: PATH,
      type: "article",
      image: ogHero,
      section: "Cost of living",
      publishedTime: PUBLISHED,
      modifiedTime: PUBLISHED,
      author: siteName(),
    }),
    links: canonicalLinks(PATH),
  }),
  component: ArticlePage,
});

function ArticlePage() {
  return (
    <>
      <SiteHeader />
      <main className="container-read py-10">
        <nav className="meta mb-4" aria-label="Breadcrumb">
          <a href="/">Home</a> / <a href="/archive">Archive</a> / Cost of living
        </nav>
        <p className="kicker">Cost of living</p>
        <h1 className="h1-news mt-2">{TITLE}</h1>
        <p className="dek mt-4" style={{ fontFamily: "Georgia, serif" }}>
          Canberrans hear it often: the capital is cheaper than Sydney, but the gap is narrower
          than the headlines suggest. We pulled the latest ABS, CoreLogic, Canstar Blue and
          MyWay+ figures to put a real number against every line of a household budget.
        </p>
        <p className="meta mt-3">
          By the {siteName()} newsroom · Published {new Date(PUBLISHED).toLocaleDateString("en-AU", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>

        <figure className="mt-6">
          <img
            src={ogHero}
            alt={`Editorial split illustration: ${cityName()} on the left and Sydney on the right`}
            width={1216}
            height={640}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="w-full h-auto"
          />
        </figure>

        <section className="mt-10">
          <h2 className="h2-news">The short version</h2>
          <p className="serif mt-3" style={{ fontFamily: "Georgia, serif" }}>
            A typical Canberra household spends about 15 to 20 per cent less than a Sydney
            household with the same income, mostly because of housing. Strip out mortgage and
            rent, and the gap drops to roughly 5 to 8 per cent. Childcare, electricity and public
            transport are meaningfully cheaper in Canberra; fresh food, eating out and coffee are
            broadly the same.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="h2-news">Category by category</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-[var(--ink)] text-left">
                  <th className="py-2 pr-4 font-semibold">Category</th>
                  <th className="py-2 pr-4 font-semibold">{cityName()}</th>
                  <th className="py-2 pr-4 font-semibold">Sydney</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r) => (
                  <tr key={r.category} className="border-b border-[var(--hairline)] align-top">
                    <th scope="row" className="py-3 pr-4 text-left font-semibold">
                      {r.category}
                    </th>
                    <td className="py-3 pr-4">{r.canberra}</td>
                    <td className="py-3 pr-4">{r.sydney}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="mt-6 space-y-3 serif" style={{ fontFamily: "Georgia, serif" }}>
            {ROWS.map((r) => (
              <li key={r.category}>
                <strong>{r.category}.</strong> {r.note}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12 border-t border-[var(--ink)] pt-8">
          <h2 className="h2-news">Housing is the whole story</h2>
          <p className="serif mt-3" style={{ fontFamily: "Georgia, serif" }}>
            The single biggest reason Canberra households come out ahead is the mortgage. On a
            median detached house with a 20 per cent deposit at current standard variable rates,
            a Sydney buyer pays around $2,400 a month more than a Canberra buyer over a 30 year
            loan. That gap alone covers childcare and groceries combined for most families.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="h2-news">Where Sydney wins</h2>
          <p className="serif mt-3" style={{ fontFamily: "Georgia, serif" }}>
            Salaries. Sydney median full-time earnings sit roughly 8 per cent above Canberra in
            private sector roles outside the APS. Specialist healthcare, direct international
            flights and weekend choice are easier in Sydney too. For households that travel
            often, the cost of regular Canberra to Sydney flights or drives eats into the gap.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="h2-news">Verdict</h2>
          <p className="serif mt-3" style={{ fontFamily: "Georgia, serif" }}>
            If you can earn close to a Sydney salary in Canberra (which is common in the APS,
            tech and defence), the capital is comfortably cheaper to live in. If you depend on
            Sydney-specific industries, the cost-of-living gap shrinks fast once you adjust for
            salary. Either way, the difference is housing first, everything else second.
          </p>
        </section>

        <section className="mt-12 border-t border-[var(--ink)] pt-8">
          <h2 className="h2-news">Sources</h2>
          <p className="meta mt-3">
            ABS Selected Living Cost Indexes (March 2026), CoreLogic Home Value Index (May 2026),
            Domain Rent Report (Q1 2026), AER Default Market Offer 2025-26, Transport Canberra
            MyWay+ fares, Canstar Blue household bill survey 2026, ACCC retail petrol monitoring
            (Q1 2026).
          </p>
        </section>

        <div className="mt-12 border-t border-[var(--ink)] pt-10">
          <NewsletterForm source="article:canberra-vs-sydney-cost-of-living" variant="band" />
        </div>
      </main>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "NewsArticle",
          "@id": absUrl(`${PATH}#article`),
          headline: TITLE,
          description: DESCRIPTION,
          url: absUrl(PATH),
          mainEntityOfPage: { "@type": "WebPage", "@id": absUrl(PATH) },
          articleSection: "Cost of living",
          inLanguage: "en-AU",
          datePublished: PUBLISHED,
          dateModified: PUBLISHED,
          image: [absUrl(ogHero)],
          author: { "@type": "Organization", name: siteName(), url: absUrl("/") },
          publisher: {
            "@type": "NewsMediaOrganization",
            name: siteName(),
            url: absUrl("/"),
            logo: { "@type": "ImageObject", url: absUrl("/favicon-192.png") },
          },
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: absUrl("/") },
            { "@type": "ListItem", position: 2, name: "Archive", item: absUrl("/archive") },
            { "@type": "ListItem", position: 3, name: TITLE, item: absUrl(PATH) },
          ],
        }}
      />
    </>
  );
}
