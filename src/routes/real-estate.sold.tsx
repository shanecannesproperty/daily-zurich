import { createFileRoute, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getRecentlySold } from "@/lib/data.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { JsonLd } from "@/components/JsonLd";
import { RecentlySoldStrip } from "@/components/RecentlySoldStrip";
import { MarketplaceDisclosure } from "@/components/ListingDisclosure";
import { buildMeta, canonicalLinks, absUrl } from "@/lib/seo";
import { cityName, siteName } from "@/lib/city";
import { SOLD_ROUTE_ENABLED } from "@/lib/real-estate-config";

const soldQ = queryOptions({
  queryKey: ["property-listings", "sold"],
  queryFn: () => getRecentlySold(),
});

export const Route = createFileRoute("/real-estate/sold")({
  // The sold/leased surface ships DISABLED. When the flag is off the route is
  // unreachable (404), so sold/leased stock is fully suppressed by default.
  loader: async ({ context }) => {
    if (!SOLD_ROUTE_ENABLED) throw notFound();
    await context.queryClient.ensureQueryData(soldQ);
  },
  head: () => {
    const title = `Recently sold and leased in ${cityName()} | ${siteName()}`;
    const description = `A record of recently sold and leased properties in ${cityName()}. These properties are no longer available.`;
    return {
      meta: buildMeta({ title, description, path: "/real-estate/sold" }),
      links: canonicalLinks("/real-estate/sold"),
    };
  },
  component: SoldIndex,
});

function SoldIndex() {
  const sold = useSuspenseQuery(soldQ).data;

  return (
    <>
      <SiteHeader activePath="/real-estate" />
      <main className="container-news py-10">
        <nav className="meta mb-4">
          <a href="/">Home</a> / <a href="/real-estate">Real estate</a> / Recently sold
        </nav>
        <p className="kicker">Real estate</p>
        <h1 className="h1-news mt-2">Recently sold and leased in {cityName()}</h1>
        <p className="serif mt-4 max-w-2xl text-lg">
          A record of properties recently sold or leased. These properties are no longer available
          and are shown for reference only.
        </p>

        <MarketplaceDisclosure />

        {sold.length === 0 ? (
          <p className="serif mt-10 text-lg">No recently sold or leased properties to show.</p>
        ) : (
          <RecentlySoldStrip items={sold} heading="Sold and leased" />
        )}
      </main>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `Recently sold and leased in ${cityName()} | ${siteName()}`,
          description: `A record of recently sold and leased properties in ${cityName()}. These properties are no longer available.`,
          url: absUrl("/real-estate/sold"),
        }}
      />
    </>
  );
}
