import { useMemo, useState } from "react";
import type { PropertyListingDTO } from "@/lib/schema";
import { SALE_PRICE_BANDS } from "@/lib/listings";
import { PropertyListingCard } from "./PropertyListingCard";

// Client-side filter bar + grid over the pre-sanitised listing DTOs. All
// filtering is done on the already-sanitised array. The price-band filter uses
// the coarse priceBand bucket id computed server-side; not-public listings have
// priceBand === null and are only excluded when a specific band is chosen, so
// the exact hidden numeric is never echoed into a chip or the URL.
type SaleRent = "all" | "sale" | "rent";

const BED_OPTIONS = [
  { id: "0", label: "Any beds", min: 0 },
  { id: "1", label: "1+ beds", min: 1 },
  { id: "2", label: "2+ beds", min: 2 },
  { id: "3", label: "3+ beds", min: 3 },
  { id: "4", label: "4+ beds", min: 4 },
];

const MIN_OPTIONS = [
  { id: "0", label: "Any", min: 0 },
  { id: "1", label: "1+", min: 1 },
  { id: "2", label: "2+", min: 2 },
  { id: "3", label: "3+", min: 3 },
];

export function PropertyListingsGrid({ listings }: { listings: PropertyListingDTO[] }) {
  const [saleRent, setSaleRent] = useState<SaleRent>("all");
  const [suburb, setSuburb] = useState("all");
  const [beds, setBeds] = useState("0");
  const [baths, setBaths] = useState("0");
  const [cars, setCars] = useState("0");
  const [band, setBand] = useState("all");
  const [propertyType, setPropertyType] = useState("all");

  // Distinct suburbs (only those the publisher allows us to name).
  const suburbs = useMemo(() => {
    const set = new Set<string>();
    for (const l of listings) {
      if (l.suburb && l.suburbDisplay) set.add(l.suburb);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [listings]);

  const propertyTypes = useMemo(() => {
    const set = new Set<string>();
    for (const l of listings) if (l.propertyType) set.add(l.propertyType);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [listings]);

  const filtered = useMemo(() => {
    const bedMin = Number(BED_OPTIONS.find((o) => o.id === beds)?.min ?? 0);
    const bathMin = Number(MIN_OPTIONS.find((o) => o.id === baths)?.min ?? 0);
    const carMin = Number(MIN_OPTIONS.find((o) => o.id === cars)?.min ?? 0);
    return listings.filter((l) => {
      if (saleRent === "sale" && l.listingType !== "sale") return false;
      if (saleRent === "rent" && l.listingType !== "rent") return false;
      if (suburb !== "all" && l.suburb !== suburb) return false;
      if (propertyType !== "all" && l.propertyType !== propertyType) return false;
      if (bedMin > 0 && (l.bedrooms ?? 0) < bedMin) return false;
      if (bathMin > 0 && (l.bathrooms ?? 0) < bathMin) return false;
      if (carMin > 0 && (l.carspaces ?? 0) < carMin) return false;
      if (band !== "all" && l.priceBand !== band) return false;
      return true;
    });
  }, [listings, saleRent, suburb, beds, baths, cars, band, propertyType]);

  return (
    <div>
      <div className="grid gap-3 border-y border-[var(--hairline)] py-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="label">Type</span>
          <select
            className="field"
            value={saleRent}
            onChange={(e) => setSaleRent(e.target.value as SaleRent)}
          >
            <option value="all">For sale and rent</option>
            <option value="sale">For sale</option>
            <option value="rent">For rent</option>
          </select>
        </label>

        <label className="block">
          <span className="label">Suburb</span>
          <select className="field" value={suburb} onChange={(e) => setSuburb(e.target.value)}>
            <option value="all">All suburbs</option>
            {suburbs.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="label">Bedrooms</span>
          <select className="field" value={beds} onChange={(e) => setBeds(e.target.value)}>
            {BED_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="label">Price</span>
          <select className="field" value={band} onChange={(e) => setBand(e.target.value)}>
            <option value="all">Any price</option>
            {SALE_PRICE_BANDS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="label">Property type</span>
          <select
            className="field"
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
          >
            <option value="all">All types</option>
            {propertyTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="label">Bathrooms</span>
          <select className="field" value={baths} onChange={(e) => setBaths(e.target.value)}>
            {MIN_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="label">Car spaces</span>
          <select className="field" value={cars} onChange={(e) => setCars(e.target.value)}>
            {MIN_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="meta mt-4">
        Showing {filtered.length} of {listings.length} listings
      </p>

      {filtered.length === 0 ? (
        <p className="serif mt-8 text-lg">
          No listings match these filters right now. Try widening your search.
        </p>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((l) => (
            <PropertyListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </div>
  );
}
