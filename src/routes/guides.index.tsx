import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listPublishedGuides } from "@/lib/data.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { JsonLd } from "@/components/JsonLd";
import { buildMeta, canonicalLinks, absUrl } from "@/lib/seo";
import { cityName, siteName } from "@/lib/city";
import type { GuideCategory, GuideRow } from "@/lib/schema";

const CATEGORY_ORDER: GuideCategory[] = [
  "food-dining",
  "things-to-do",
  "tourism",
  "real-estate",
  "wellness",
  "services",
];

const CATEGORY_LABELS: Record<GuideCategory, string> = {
  "food-dining": "Food & Dining",
  "things-to-do": "Things To Do",
  tourism: "Tourism",
  "real-estate": "Real Estate",
  wellness: "Wellness",
  services: "Services",
};

const guidesQ = queryOptions({
  queryKey: ["guides", "all"],
  queryFn: () => listPublishedGuides(),
});

export const Route = createFileRoute("/guides/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(guidesQ),
  head: () => {
    const title = `City Guides | ${siteName()}`;
    const description = `Local expert guides to the best of ${cityName()}: food, things to do, tourism, real estate and wellness.`;
    return {
      meta: buildMeta({ title, description, path: "/guides" }),
      links: canonicalLinks("/guides"),
    };
  },
  component: GuidesIndex,
});

function descriptorFor(g: GuideRow) {
  if (g.meta_description && g.meta_description.trim().length > 0) {
    const flat = g.meta_description.replace(/\s+/g, " ").trim();
    return flat.length > 160 ? flat.slice(0, 159).replace(/\s+\S*$/, "") + "…" : flat;
  }
  return `Curated picks for ${CATEGORY_LABELS[g.category].toLowerCase()} in ${cityName()}.`;
}

function GuidesIndex() {
  const guides = useSuspenseQuery(guidesQ).data;

  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    items: guides.filter((g) => g.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      <SiteHeader activePath="/guides" />
      <main className="container-news py-10">
        <nav className="meta mb-4">
          <a href="/">Home</a> / City Guides
        </nav>
        <p className="kicker">City Guides</p>
        <h1 className="h1-news mt-2">City Guides</h1>
        <p className="serif mt-4 max-w-2xl text-lg">
          Local expert guides to the best of {cityName()}.
        </p>

        {grouped.length === 0 ? (
          <p className="meta mt-10">No guides published yet.</p>
        ) : (
          grouped.map((group) => (
            <section key={group.category} className="mt-12 border-t border-[var(--ink)] pt-6">
              <h2 className="h2-news">{group.label}</h2>
              <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((g) => (
                  <li
                    key={g.id}
                    className="border-t border-[var(--hairline)] pt-4 flex flex-col"
                  >
                    <span
                      className="self-start text-[11px] uppercase tracking-widest px-2 py-1 mb-3"
                      style={{
                        backgroundColor: "var(--accent)",
                        color: "var(--accent-contrast, #fff)",
                      }}
                    >
                      {CATEGORY_LABELS[g.category]}
                    </span>
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
          name: `City Guides — ${cityName()}`,
          description: `Local expert guides to the best of ${cityName()}.`,
          url: absUrl("/guides"),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: `${cityName()} city guides`,
          itemListElement: grouped.flatMap((group) =>
            group.items.map((g, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: g.title,
              url: absUrl(`/guides/${g.slug}`),
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
            { "@type": "ListItem", position: 2, name: "City Guides", item: absUrl("/guides") },
          ],
        }}
      />
    </>
  );
}
