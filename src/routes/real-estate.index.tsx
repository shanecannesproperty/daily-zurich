import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { getPropertyListings, getRecentlySold } from "@/lib/data.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { JsonLd } from "@/components/JsonLd";
import { PropertyListingsGrid } from "@/components/PropertyListingsGrid";
import { RecentlySoldStrip } from "@/components/RecentlySoldStrip";
import { AgentCtaBlock } from "@/components/AgentCtaBlock";
import { MarketplaceDisclosure, PaidPlacementNote } from "@/components/ListingDisclosure";
import { buildMeta, canonicalLinks, absUrl, pageTitle, clampDescription } from "@/lib/seo";
import { cityName, siteName } from "@/lib/city";
import { SOLD_ROUTE_ENABLED } from "@/lib/real-estate-config";

const listingsQ = queryOptions({
  queryKey: ["property-listings", "all"],
  queryFn: () => getPropertyListings(),
});

const soldQ = queryOptions({
  queryKey: ["property-listings", "sold"],
  queryFn: () => getRecentlySold(),
});

export const Route = createFileRoute("/real-estate/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(listingsQ);
    if (SOLD_ROUTE_ENABLED) await context.queryClient.ensureQueryData(soldQ);
  },
  head: () => {
    const title = pageTitle(`Homes for sale and rent in ${cityName()}`);
    const description = clampDescription(
      `Browse for-sale and for-rent property listings across ${cityName()}, advertised by local agencies on ${siteName()}.`,
      160,
    );
    return {
      meta: buildMeta({ title, description, path: "/real-estate" }),
      links: canonicalLinks("/real-estate"),
    };
  },
  component: RealEstateIndex,
});

function RealEstateIndex() {
  const listings = useSuspenseQuery(listingsQ).data;
  const sold = useQuery({ ...soldQ, enabled: SOLD_ROUTE_ENABLED }).data ?? [];

  return (
    <>
      <SiteHeader activePath="/real-estate" />
      <main className="container-news py-10">
        <nav className="meta mb-4">
          <a href="/">Home</a> / Real estate
        </nav>
        <p className="kicker">Real estate</p>
        <h1 className="h1-news mt-2">Homes for sale and rent in {cityName()}</h1>
        <p className="serif mt-4 max-w-2xl text-lg">
          Property listings advertised by local agencies. Looking to buy, sell or relocate? Our{" "}
          <a href="/property" className="hover:underline">
            property and relocation desk
          </a>{" "}
          can connect you with the right specialist.
        </p>

        <MarketplaceDisclosure />
        <PaidPlacementNote className="mt-3" />

        <div className="mt-8">
          <PropertyListingsGrid listings={listings} />
        </div>

        {SOLD_ROUTE_ENABLED && <RecentlySoldStrip items={sold} showViewAll />}

        <AgentCtaBlock />
      </main>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `Homes for sale and rent in ${cityName()} | ${siteName()}`,
          description: `Browse for-sale and for-rent property listings across ${cityName()}, advertised by local agencies on ${siteName()}.`,
          url: absUrl("/real-estate"),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: `Property listings in ${cityName()}`,
          numberOfItems: listings.length,
          itemListElement: listings.map((l, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: absUrl(`/real-estate/${l.slug}`),
            name: l.addressLine,
          })),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: absUrl("/") },
            { "@type": "ListItem", position: 2, name: "Real estate", item: absUrl("/real-estate") },
          ],
        }}
      />
    </>
  );
}
