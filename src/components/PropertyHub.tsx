// Property listings hub. Reads from the public_available_property_listings
// view via the city-scoped db.server helper (same path as the existing
// real-estate UI) and serves a paginated, filterable hub. Uses sanitised
// PropertyListingDTO rows — never raw price/rent numerics.
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Bed, Bath, Car } from "lucide-react";
import { listPropertyHubPage } from "@/lib/data.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { JsonLd } from "@/components/JsonLd";
import { absUrl } from "@/lib/seo";
import { cityName, siteName } from "@/lib/city";

type ListingType = "sale" | "rent" | "all";

export function propertyQuery(type: ListingType, page: number) {
  return queryOptions({
    queryKey: ["property_hub", type, page],
    queryFn: () => listPropertyHubPage({ data: { type, page } }),
  });
}

const TYPE_LABELS: Record<ListingType, string> = {
  all: "All Listings",
  sale: "For Sale",
  rent: "For Rent",
};

function tabHref(t: ListingType): string {
  return t === "all" ? "/property" : `/property?type=${t}`;
}

export function PropertyHub({ type, page }: { type: ListingType; page: number }) {
  const { data } = useSuspenseQuery(propertyQuery(type, page));

  return (
    <>
      <SiteHeader activePath="/property" />
      <main className="container-news py-10">
        <nav className="meta mb-4" aria-label="Breadcrumb">
          <a href="/">Home</a> &nbsp;/&nbsp; <span>Property</span>
        </nav>
        <h1 className="h1-news">Property</h1>
        <p className="dek mt-2">
          {cityName()} property listings from {siteName()}.
        </p>

        <div className="mt-6 flex gap-6 border-b border-[var(--hairline)]">
          {(["all", "sale", "rent"] as ListingType[]).map((t) => (
            <a
              key={t}
              href={tabHref(t)}
              className={
                "pb-2 text-sm font-semibold uppercase tracking-wider transition-colors " +
                (type === t
                  ? "border-b-2 border-[var(--accent)] text-[var(--accent)]"
                  : "text-[var(--ink-muted,#6b6b6b)] hover:text-[var(--ink,#2d2d2d)]")
              }
            >
              {TYPE_LABELS[t]}
            </a>
          ))}
        </div>

        {data.rows.length === 0 ? (
          <p className="mt-10 meta">
            No {type === "all" ? "" : TYPE_LABELS[type].toLowerCase() + " "}listings found for{" "}
            {cityName()} yet. Check back soon.
          </p>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 md:grid-cols-3">
            {data.rows.map((listing) => {
              const isRent = listing.listingType === "rent";
              return (
                <div
                  key={listing.id}
                  className="border border-[var(--hairline)] p-4 hover:border-[var(--ink,#2d2d2d)] transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="meta text-xs uppercase tracking-wider">
                      {listing.propertyType ?? "Property"}
                    </span>
                    {listing.underOffer && (
                      <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5">
                        Under Offer
                      </span>
                    )}
                  </div>
                  <p className="font-bold leading-snug line-clamp-2 mb-2">
                    {listing.addressLine || listing.suburb || "Address withheld"}
                  </p>
                  {listing.suburb && listing.addressLine !== listing.suburb && (
                    <p className="text-sm text-[var(--ink-muted,#6b6b6b)] mb-3">
                      {listing.suburb}
                    </p>
                  )}
                  {listing.priceDisplay && (
                    <p className="serif text-base mb-3">{listing.priceDisplay}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-[var(--ink-muted,#6b6b6b)]">
                    {listing.bedrooms != null && (
                      <span className="flex items-center gap-1" aria-label={`${listing.bedrooms} bedrooms`}>
                        <Bed className="w-3.5 h-3.5" aria-hidden />
                        {listing.bedrooms}
                      </span>
                    )}
                    {listing.bathrooms != null && (
                      <span className="flex items-center gap-1" aria-label={`${listing.bathrooms} bathrooms`}>
                        <Bath className="w-3.5 h-3.5" aria-hidden />
                        {listing.bathrooms}
                      </span>
                    )}
                    {listing.carspaces != null && listing.carspaces > 0 && (
                      <span className="flex items-center gap-1" aria-label={`${listing.carspaces} car spaces`}>
                        <Car className="w-3.5 h-3.5" aria-hidden />
                        {listing.carspaces}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 pt-3 border-t border-[var(--hairline)] flex items-center justify-between">
                    <span className="kicker text-xs">
                      {isRent ? "For Rent" : "For Sale"}
                    </span>
                    {listing.agencyName && (
                      <span className="text-[11px] text-[var(--ink-muted,#6b6b6b)] truncate ml-2">
                        {listing.agencyName}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-12 flex items-center justify-between border-t border-[var(--hairline)] pt-6">
          {page > 1 ? (
            <a
              href={`/property?type=${type}&page=${page - 1}`}
              className="text-sm font-semibold uppercase tracking-wider hover:text-[var(--accent)]"
            >
              ← Newer listings
            </a>
          ) : (
            <span />
          )}
          {data.rows.length >= data.perPage ? (
            <a
              href={`/property?type=${type}&page=${page + 1}`}
              className="text-sm font-semibold uppercase tracking-wider hover:text-[var(--accent)]"
            >
              Older listings →
            </a>
          ) : (
            <span />
          )}
        </div>
      </main>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `Property | ${siteName()}`,
          url: absUrl("/property"),
        }}
      />
    </>
  );
}
