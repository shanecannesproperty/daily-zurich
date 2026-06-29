import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listPublishedGuides } from "@/lib/data.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { JsonLd } from "@/components/JsonLd";
import { buildMeta, canonicalLinks, absUrl } from "@/lib/seo";
import { cityName, siteName } from "@/lib/city";
import type { GuideCategory, GuideRow } from "@/lib/schema";

const GUIDE_CATEGORY_ORDER: GuideCategory[] = [
  "food-dining",
  "wellness",
  "services",
  "real-estate",
  "tourism",
  "things-to-do",
];

const GUIDE_CATEGORY_LABELS: Record<GuideCategory, string> = {
  "food-dining": "Food and dining",
  wellness: "Wellness",
  services: "Services",
  "real-estate": "Real estate",
  tourism: "Tourism",
  "things-to-do": "Things to do",
};

const guidesQ = queryOptions({
  queryKey: ["guides", "all"],
  queryFn: () => listPublishedGuides(),
});

export const Route = createFileRoute("/best/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(guidesQ),
  head: () => {
    const title = `Best of ${cityName()}: the local directory | ${siteName()}`;
    const description = `Curated best-of guides for ${cityName()}: food and dining, wellness, services, real estate, tourism and things to do, from ${siteName()}.`;
    return {
      meta: buildMeta({ title, description, path: "/best" }),
      links: canonicalLinks("/best"),
    };
  },
  component: BestIndex,
});

function descriptorFor(g: GuideRow) {
  if (g.meta_description && g.meta_description.trim().length > 0) {
    const flat = g.meta_description.replace(/\s+/g, " ").trim();
    return flat.length > 140 ? flat.slice(0, 139).replace(/\s+\S*$/, "") + "…" : flat;
  }
  return `Curated picks for ${GUIDE_CATEGORY_LABELS[g.category].toLowerCase()} in ${cityName()}.`;
}

function BestIndex() {
  const guides = useSuspenseQuery(guidesQ).data;

  const grouped = GUIDE_CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: GUIDE_CATEGORY_LABELS[cat],
    items: guides.filter((g) => g.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      <SiteHeader activePath="/best" />
      <main className="container-news py-10">
        <nav className="meta mb-4">
          <a href="/">Home</a> / Best of {cityName()}
        </nav>
        <p className="kicker">Best of {cityName()}</p>
        <h1 className="h1-news mt-2">The local directory</h1>
        <p className="serif mt-4 max-w-2xl text-lg">
          AI-generated local guides to the best of {cityName()}: verified against public sources and
          updated regularly by {siteName()}.
        </p>

        {grouped.length === 0 ? (
          <p className="meta mt-10">No guides published yet.</p>
        ) : (
          grouped.map((group) => (
            <section key={group.category} className="mt-12 border-t border-[var(--ink)] pt-6">
              <h2 className="h2-news">{group.label}</h2>
              <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((g) => (
                  <li key={g.id} className="border-t border-[var(--hairline)] pt-4">
                    <Link
                      to="/best/$slug"
                      params={{ slug: g.slug }}
                      className="no-underline hover:no-underline"
                    >
                      <h3 className="serif text-xl font-semibold leading-snug">{g.title}</h3>
                      <p className="serif mt-2 text-[15px] text-[var(--ink-soft)]">
                        {descriptorFor(g)}
                      </p>
                      <p className="meta mt-3 uppercase tracking-widest">Read the guide</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </main>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `Best of ${cityName()}`,
          description: `Curated best-of guides for ${cityName()}: food and dining, wellness, services, real estate, tourism and things to do, from ${siteName()}.`,
          url: absUrl("/best"),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: `Best of ${cityName()} guides`,
          itemListElement: grouped.flatMap((group) =>
            group.items.map((g, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: g.title,
              url: absUrl(`/best/${g.slug}`),
            })),
          ),
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
          ],
        }}
      />
    </>
  );
}
