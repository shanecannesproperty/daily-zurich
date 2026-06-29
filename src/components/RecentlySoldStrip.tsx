import { Link } from "@tanstack/react-router";
import type { RecentlySoldDTO } from "@/lib/schema";
import { formatDate } from "@/lib/date";

// The Recently Sold / Leased section. It is visually and textually distinct
// from the active grid: every card carries a SOLD or LEASED badge, states the
// status as a fact, and shows NO enquire-to-buy/rent CTA implying the property
// is still available. Sold rows never appear in the active for-sale/for-rent
// grid. The sold price is the pre-sanitised soldPriceDisplay string only.
function statusBadge(status: string | null): string {
  const s = (status ?? "").toLowerCase();
  if (s === "leased") return "Leased";
  return "Sold";
}

function SoldCard({ item }: { item: RecentlySoldDTO }) {
  const hero = item.images[0] ?? null;
  return (
    <article className="border border-[var(--hairline)] bg-background">
      <div className="relative aspect-[3/2] w-full overflow-hidden bg-[var(--hairline)]">
        {hero ? (
          <img
            src={hero}
            alt={item.imageAlt}
            className="h-full w-full object-cover grayscale-[15%]"
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
        <span className="absolute left-2 top-2 bg-[var(--ink)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
          {statusBadge(item.status)}
        </span>
      </div>
      <div className="p-4">
        <p className="kicker">
          {statusBadge(item.status)}
          {item.propertyType ? <> &middot; {item.propertyType}</> : null}
        </p>
        <h3 className="h3-card mt-1">{item.addressLine}</h3>
        <p className="serif mt-2 text-lg font-semibold">{item.soldPriceDisplay}</p>
        <ul className="meta mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {item.bedrooms ? <li>{item.bedrooms} bed</li> : null}
          {item.bathrooms ? <li>{item.bathrooms} bath</li> : null}
          {item.carspaces ? <li>{item.carspaces} car</li> : null}
        </ul>
        {item.soldDate ? (
          <p className="meta mt-2">
            {statusBadge(item.status)} {formatDate(item.soldDate)}
          </p>
        ) : null}
        <p className="meta mt-2 text-[var(--ink-soft)]">
          Advertised by {item.agencyName ?? "the listing agency"}
          {item.agencyLicence ? <> (Licence {item.agencyLicence})</> : null}.
        </p>
      </div>
    </article>
  );
}

export function RecentlySoldStrip({
  items,
  heading = "Recently sold and leased",
  showViewAll = false,
}: {
  items: RecentlySoldDTO[];
  heading?: string;
  showViewAll?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <section className="mt-14 border-t-[3px] border-[var(--ink)] pt-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="h2-news">{heading}</h2>
        {showViewAll && (
          <Link to="/real-estate/sold" className="meta uppercase tracking-widest hover:underline">
            View all
          </Link>
        )}
      </div>
      <p className="meta mt-2 text-[var(--ink-soft)]">
        These properties are no longer available. Status shown is a record of the sale or lease, not
        an invitation to enquire.
      </p>
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <SoldCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
