import { Link } from "@tanstack/react-router";
import type { PropertyListingDTO } from "@/lib/schema";
import { listingTypeLabel } from "@/lib/listings";
import { formatDate } from "@/lib/date";
import { AgencyAttribution } from "./ListingDisclosure";

// A single for-sale/for-rent card. Renders ONLY the pre-sanitised DTO: the
// priceDisplay string is always safe (the raw numeric is never on the DTO when
// the price is not public), and the image alt text is built without any price.
// Featured (paid) cards carry a conspicuous, in-card "Featured" badge that is
// visible without hover and on mobile; under-offer cards carry an "Under Offer"
// badge. Organic cards are visually distinct from featured ones.
export function PropertyListingCard({ listing }: { listing: PropertyListingDTO }) {
  const hero = listing.images[0] ?? null;
  const isRent = listing.listingType === "rent";
  const featuredClass = listing.isFeatured
    ? "ring-1 ring-[var(--ink-red)] ring-offset-0"
    : "border border-[var(--hairline)]";

  return (
    <article className={`group flex flex-col bg-background ${featuredClass}`}>
      <Link
        to="/real-estate/$slug"
        params={{ slug: listing.slug }}
        className="block no-underline hover:no-underline"
      >
        <div className="relative aspect-[3/2] w-full overflow-hidden bg-[var(--hairline)]">
          {hero ? (
            <img
              src={hero}
              alt={listing.imageAlt}
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
              width={800}
              height={533}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[var(--ink-soft)]">
              <span className="meta">No image supplied</span>
            </div>
          )}
          <div className="absolute left-0 top-0 flex flex-wrap gap-1 p-2">
            {listing.isFeatured && (
              <span className="bg-[var(--ink-red)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
                Featured
              </span>
            )}
            {listing.underOffer && (
              <span className="bg-[var(--ink)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
                Under Offer
              </span>
            )}
          </div>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <p className="kicker">
          {listingTypeLabel(listing.listingType)}
          {listing.propertyType ? <> &middot; {listing.propertyType}</> : null}
        </p>

        <h3 className="h3-card mt-1">
          <Link
            to="/real-estate/$slug"
            params={{ slug: listing.slug }}
            className="no-underline hover:underline"
          >
            {listing.addressLine}
          </Link>
        </h3>

        <p className="serif mt-2 text-lg font-semibold">{listing.priceDisplay}</p>

        <ul className="meta mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {listing.bedrooms ? <li>{listing.bedrooms} bed</li> : null}
          {listing.bathrooms ? <li>{listing.bathrooms} bath</li> : null}
          {listing.carspaces ? <li>{listing.carspaces} car</li> : null}
          {listing.landArea ? <li>{listing.landArea} m² land</li> : null}
        </ul>

        {isRent && listing.dateAvailable ? (
          <p className="meta mt-1">Available {formatDate(listing.dateAvailable)}</p>
        ) : null}

        <div className="mt-auto pt-3">
          <AgencyAttribution
            agencyName={listing.agencyName}
            agencyLicence={listing.agencyLicence}
            agentName={listing.agentName}
          />
        </div>
      </div>
    </article>
  );
}
