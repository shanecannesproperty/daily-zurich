// Compliance disclosure blocks for the property-listings surfaces.
//
// MarketplaceDisclosure: the site-wide, persistent statement (rendered on the
// index and detail pages) that these are advertisements supplied by agencies,
// that The Daily Canberra is not the seller/lessor, and that it also operates
// as a licensed agency and so has a commercial interest in some listings.
//
// PaidPlacementNote: the standing note, shown wherever ordering can be bought,
// that Featured listings are paid placements and paid placement can affect
// order and visibility.
//
// AgencyAttribution: the mandatory per-listing line naming the advertising
// agency and its licence, with at least one feed contact channel, so the
// responsible licensed agency is always identifiable and is never presented as
// the site owner.
import { siteName } from "@/lib/city";

export function MarketplaceDisclosure() {
  return (
    <aside
      className="mt-6 border border-[var(--hairline)] bg-[color-mix(in_srgb,var(--ink)_4%,transparent)] p-4 text-[13px] leading-relaxed text-[var(--ink-soft)]"
      role="note"
      aria-label="Advertising disclosure"
    >
      <p>
        {siteName()} is an advertising platform. The property listings shown here are advertisements
        supplied by real-estate agencies, including our own agency and other paying agents.{" "}
        {siteName()} is not the seller or lessor. Availability, price and details are the
        responsibility of the listing agency shown on each listing and may change. {siteName()} also
        operates as a licensed real-estate agency and therefore has a commercial interest in some of
        the listings displayed.
      </p>
    </aside>
  );
}

export function PaidPlacementNote({ className = "" }: { className?: string }) {
  return (
    <p className={`meta ${className}`.trim()}>
      Listings marked Featured are paid placements. Paid placement can affect the order and
      visibility of listings.
    </p>
  );
}

export function AgencyAttribution({
  agencyName,
  agencyLicence,
  agentName,
  agentPhone,
  agentEmail,
  detailed = false,
}: {
  agencyName: string | null;
  agencyLicence: string | null;
  agentName: string | null;
  agentPhone?: string | null;
  agentEmail?: string | null;
  detailed?: boolean;
}) {
  const agency = agencyName ?? "the listing agency";
  return (
    <div className="meta mt-2 text-[var(--ink-soft)]">
      <p>
        Advertised by <span className="font-semibold text-[var(--ink)]">{agency}</span>
        {agencyLicence ? <> (Licence {agencyLicence})</> : null}
        {agentName ? <>. Listing agent {agentName}</> : null}.
      </p>
      {detailed && (agentPhone || agentEmail) ? (
        <p className="mt-1">
          {agentPhone ? (
            <a href={`tel:${agentPhone.replace(/\s+/g, "")}`} className="hover:underline">
              {agentPhone}
            </a>
          ) : null}
          {agentPhone && agentEmail ? <> &middot; </> : null}
          {agentEmail ? (
            <a href={`mailto:${agentEmail}`} className="hover:underline">
              {agentEmail}
            </a>
          ) : null}
        </p>
      ) : null}
      <p className="mt-1">Contact the listing agent for current availability and price.</p>
    </div>
  );
}
