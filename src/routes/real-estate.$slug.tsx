import { useEffect, useRef, useState } from "react";
import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPropertyListingBySlug } from "@/lib/data.functions";
import { submitEnquiry } from "@/lib/forms.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { JsonLd } from "@/components/JsonLd";
import { MarketplaceDisclosure, AgencyAttribution } from "@/components/ListingDisclosure";
import { buildMeta, canonicalLinks, absUrl } from "@/lib/seo";
import { siteName, cityName, cityRegion } from "@/lib/city";
import { listingTypeLabel, descriptionToHtml } from "@/lib/listings";
import { formatDate, formatDateTime } from "@/lib/date";
import type { PropertyListingDTO } from "@/lib/schema";

function listingQuery(slug: string) {
  return queryOptions({
    queryKey: ["property-listing", slug],
    queryFn: () => getPropertyListingBySlug({ data: { slug } }),
  });
}

export const Route = createFileRoute("/real-estate/$slug")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(listingQuery(params.slug));
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    const l = loaderData as PropertyListingDTO | undefined;
    if (!l) return { meta: [{ title: `Not found | ${siteName()}` }] };
    const path = `/real-estate/${l.slug}`;
    const title = `${l.addressLine} | ${listingTypeLabel(l.listingType)} | ${siteName()}`;
    const desc =
      l.headline ??
      `${listingTypeLabel(l.listingType)} in ${l.suburb ?? cityName()}, advertised on ${siteName()}.`;
    return {
      meta: buildMeta({
        title,
        description: desc,
        path,
        image: l.images[0] ?? null,
      }),
      links: canonicalLinks(path),
    };
  },
  component: ListingDetail,
});

function ListingDetail() {
  const listing = useSuspenseQuery(listingQuery(Route.useParams().slug)).data;
  if (!listing) return null;
  return <ListingDetailBody listing={listing} />;
}

function ListingDetailBody({ listing }: { listing: PropertyListingDTO }) {
  const isRent = listing.listingType === "rent";
  const path = `/real-estate/${listing.slug}`;
  const descHtml = descriptionToHtml(listing.description);

  // RealEstateListing JSON-LD. We deliberately OMIT any offers/price node: the
  // sanitised DTO carries no raw price numeric, so no figure can leak through
  // structured data. Address fields come from the already-composed display
  // values only.
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: listing.addressLine,
    description: listing.headline ?? undefined,
    url: absUrl(path),
    image: listing.images.length ? listing.images : undefined,
    datePosted: listing.modTime ?? undefined,
  };
  if (listing.bedrooms) jsonLd.numberOfBedrooms = listing.bedrooms;
  if (listing.bathrooms) jsonLd.numberOfBathroomsTotal = listing.bathrooms;
  if (listing.suburb && listing.suburbDisplay) {
    jsonLd.address = {
      "@type": "PostalAddress",
      addressLocality: listing.suburb,
      addressRegion: cityRegion(),
      addressCountry: "AU",
    };
  }
  if (listing.buildingArea) {
    jsonLd.floorSize = {
      "@type": "QuantitativeValue",
      value: listing.buildingArea,
      unitCode: "MTK",
    };
  }

  return (
    <>
      <SiteHeader activePath="/real-estate" />
      <main className="container-news py-8">
        <nav className="meta mb-4">
          <a href="/">Home</a> / <Link to="/real-estate">Real estate</Link> /{" "}
          {listingTypeLabel(listing.listingType)}
        </nav>

        <div className="flex flex-wrap items-center gap-2">
          <span className="kicker">{listingTypeLabel(listing.listingType)}</span>
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

        <h1 className="h1-news mt-2">{listing.addressLine}</h1>
        <p className="serif mt-3 text-2xl font-semibold">{listing.priceDisplay}</p>
        {listing.priceViewText && listing.priceViewText !== listing.priceDisplay ? (
          <p className="meta mt-1">{listing.priceViewText}</p>
        ) : null}
        {listing.priceTax ? <p className="meta">{listing.priceTax}</p> : null}

        <ul className="meta mt-3 flex flex-wrap gap-x-4 gap-y-1">
          {listing.propertyType ? <li>{listing.propertyType}</li> : null}
          {listing.bedrooms ? <li>{listing.bedrooms} bed</li> : null}
          {listing.bathrooms ? <li>{listing.bathrooms} bath</li> : null}
          {listing.carspaces ? <li>{listing.carspaces} car</li> : null}
          {listing.landArea ? <li>{listing.landArea} m² land</li> : null}
          {listing.buildingArea ? <li>{listing.buildingArea} m² building</li> : null}
        </ul>

        {/* Gallery */}
        {listing.images.length > 0 && (
          <section className="mt-6">
            <img
              src={listing.images[0]}
              alt={listing.imageAlt}
              className="aspect-[16/9] w-full object-cover"
              loading="eager"
              width={1600}
              height={900}
            />
            {listing.images.length > 1 && (
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                {listing.images.slice(1).map((src, i) => (
                  <img
                    key={src}
                    src={src}
                    alt={`${listing.imageAlt} photo ${i + 2}`}
                    className="aspect-square w-full object-cover"
                    loading="lazy"
                    decoding="async"
                    width={300}
                    height={300}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_320px]">
          <div>
            {isRent && (
              <section className="mb-8 border border-[var(--hairline)] p-4">
                <h2 className="kicker">Rental details</h2>
                <ul className="meta mt-2 space-y-1">
                  <li>Rent: {listing.priceDisplay}</li>
                  {listing.bondDisplay ? <li>Bond: {listing.bondDisplay}</li> : null}
                  {listing.dateAvailable ? (
                    <li>Available from {formatDate(listing.dateAvailable)}</li>
                  ) : null}
                </ul>
              </section>
            )}

            {listing.headline && <p className="serif text-xl">{listing.headline}</p>}

            {descHtml ? (
              <div
                className="prose-news mt-4"
                // descHtml is built by descriptionToHtml, which escapes the raw
                // feed text FIRST and only then inserts <p>/<br>. No unescaped
                // feed HTML reaches the DOM.
                dangerouslySetInnerHTML={{ __html: descHtml }}
              />
            ) : null}

            {listing.features.length > 0 && (
              <section className="mt-8">
                <h2 className="h2-news">Features</h2>
                <ul className="mt-3 grid list-disc gap-1 pl-5 sm:grid-cols-2">
                  {listing.features.map((f) => (
                    <li key={f} className="serif">
                      {f}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {listing.floorplans.length > 0 && (
              <section className="mt-8">
                <h2 className="h2-news">Floorplans</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {listing.floorplans.map((src, i) => (
                    <img
                      key={src}
                      src={src}
                      alt={`Floorplan ${i + 1} for ${listing.imageAlt}`}
                      className="w-full border border-[var(--hairline)] object-contain"
                      loading="lazy"
                      decoding="async"
                      width={800}
                      height={600}
                    />
                  ))}
                </div>
              </section>
            )}

            {listing.inspectionTimes.length > 0 && (
              <section className="mt-8">
                <h2 className="h2-news">Inspection times</h2>
                <ul className="mt-3 space-y-1">
                  {listing.inspectionTimes.map((t) => (
                    <li key={t} className="serif">
                      {t}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* Agent / agency + enquiry sidebar */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="border border-[var(--hairline)] p-4">
              <h2 className="kicker">Advertised by</h2>
              <AgencyAttribution
                agencyName={listing.agencyName}
                agencyLicence={listing.agencyLicence}
                agentName={listing.agentName}
                agentPhone={listing.agentPhone}
                agentEmail={listing.agentEmail}
                detailed
              />
            </div>
            <div className="mt-4 border border-[var(--hairline)] p-4">
              <h2 className="kicker">Enquire about this listing</h2>
              <EnquiryForm listing={listing} />
            </div>
          </aside>
        </div>

        <MarketplaceDisclosure />
        {listing.modTime ? (
          <p className="meta mt-3 text-[var(--ink-soft)]">
            Details current as at {formatDateTime(listing.modTime)}.
          </p>
        ) : null}
      </main>

      <JsonLd data={jsonLd} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: absUrl("/") },
            { "@type": "ListItem", position: 2, name: "Real estate", item: absUrl("/real-estate") },
            { "@type": "ListItem", position: 3, name: listing.addressLine, item: absUrl(path) },
          ],
        }}
      />
    </>
  );
}

function EnquiryForm({ listing }: { listing: PropertyListingDTO }) {
  const submit = useServerFn(submitEnquiry);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const started = useRef(0);
  useEffect(() => {
    started.current = Date.now();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      intent: "listing_enquiry",
      listing_id: listing.id,
      listing_slug: listing.slug,
      agency_key: listing.agencyKey ?? "",
      agency_name: listing.agencyName ?? "",
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      message: String(fd.get("message") ?? ""),
    };
    try {
      await submit({
        data: {
          type: "listing",
          payload,
          company: String(fd.get("company") ?? ""),
          startedAt: started.current,
        },
      });
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <p className="serif mt-3" role="status">
        Thank you. Your enquiry has been passed to {listing.agencyName ?? "the listing agency"}.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 grid gap-3">
      <label className="block">
        <span className="label">Name</span>
        <input name="name" required className="field" />
      </label>
      <label className="block">
        <span className="label">Email</span>
        <input type="email" name="email" required className="field" />
      </label>
      <label className="block">
        <span className="label">Phone</span>
        <input name="phone" className="field" />
      </label>
      <label className="block">
        <span className="label">Message</span>
        <textarea
          name="message"
          rows={3}
          className="field"
          defaultValue={`I would like more information about ${listing.addressLine}.`}
        />
      </label>
      <div className="honeypot" aria-hidden="true">
        <label>
          Do not fill in
          <input type="text" name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <button type="submit" className="btn-primary" disabled={busy}>
        {busy ? "Sending" : "Send enquiry"}
      </button>
      <p className="meta">
        Your enquiry goes to the listing agency, who is responsible for the property and its
        details.
      </p>
    </form>
  );
}
