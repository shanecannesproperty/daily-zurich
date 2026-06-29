// Pure, dependency-free helpers for property listings. Shared by the server
// read functions (src/lib/data.functions.ts) and the listing components. Kept
// free of any server-only import so it can be unit tested in the node env and
// imported from client components.
//
// PRICE SANITISATION is the core compliance contract (see /tmp/reaxml
// compliance.json + frontend-spec.json): the raw <price> numeric is shown
// publicly ONLY when its public flag is true AND it parses as a positive
// number. Anything else falls back to the publisher's free-text price view, or
// the literal "Contact Agent". The numeric must never reach any public surface
// (visible text, alt text, JSON-LD, meta, data-*, embedded JSON) when its flag
// is false, so callers build their priceDisplay from here and DROP the raw
// numeric on not-public rows before the row is serialised to the client.

export type ListingType = "sale" | "rent" | "land" | "commercial";

export const LISTING_TYPE_LABELS: Record<string, string> = {
  sale: "For Sale",
  rent: "For Rent",
  land: "Land",
  commercial: "Commercial",
};

export function listingTypeLabel(t: string | null | undefined): string {
  if (!t) return "Listing";
  return LISTING_TYPE_LABELS[t] ?? "Listing";
}

// True only when the value is a finite, positive number.
function isPositiveNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v > 0;
}

// Format a positive number as AUD with no decimals, e.g. 650000 -> "$650,000".
export function formatAud(value: number): string {
  try {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `$${Math.round(value).toLocaleString("en-AU")}`;
  }
}

// Decide the single public price string for a sale/rent listing.
// Decision order (compliance.json priceRules):
//   1. public flag true AND numeric positive -> formatted dollar figure
//      (rentals append the rent period when present, e.g. "$680 per week").
//   2. otherwise, the publisher's price_view_text free text if present.
//   3. otherwise, the literal "Contact Agent".
// The numeric is consulted ONLY in branch 1; when the flag is false we never
// look at it, matching the view which already nulls it.
export function priceDisplay(input: {
  isPublic: boolean | null | undefined;
  numeric: number | null | undefined;
  viewText: string | null | undefined;
  period?: string | null | undefined;
}): string {
  const view = (input.viewText ?? "").trim();
  if (input.isPublic === true && isPositiveNumber(input.numeric)) {
    const base = formatAud(input.numeric);
    const period = (input.period ?? "").trim();
    if (period) return `${base} ${normalisePeriod(period)}`;
    return base;
  }
  if (view) return view;
  return "Contact Agent";
}

// Sold price string for the Recently Sold section. Only show a sold figure when
// the feed explicitly authorises it (sold_price_is_public true and the value
// parses positive). Otherwise prefer the publisher's display text or range,
// else the neutral "Sold (price withheld)".
export function soldPriceDisplay(input: {
  isPublic: boolean | null | undefined;
  numeric: number | null | undefined;
  displayText: string | null | undefined;
  range: string | null | undefined;
}): string {
  const display = (input.displayText ?? "").trim();
  const range = (input.range ?? "").trim();
  if (input.isPublic === true && isPositiveNumber(input.numeric)) {
    return formatAud(input.numeric);
  }
  if (display) return display;
  if (range) return range;
  return "Sold (price withheld)";
}

function normalisePeriod(period: string): string {
  const p = period.toLowerCase().trim();
  if (p === "week" || p === "weekly" || p === "pw") return "per week";
  if (p === "month" || p === "monthly" || p === "pcm") return "per month";
  if (p.startsWith("per ")) return p;
  return `per ${p}`;
}

// Compose a display address that honours the publisher's privacy flags.
//   - address_display true  -> full street line from the number/name parts plus
//     suburb, state and postcode.
//   - address_display false -> NEVER a street: prefer display_address if the
//     feed supplied one, else suburb (only when suburb_display) + state, else a
//     region fallback. We never invent a street.
export function composeAddress(input: {
  addressDisplay: boolean | null | undefined;
  suburbDisplay: boolean | null | undefined;
  unitNumber?: string | null;
  lotNumber?: string | null;
  streetNumber?: string | null;
  streetName?: string | null;
  suburb?: string | null;
  suburbDisplayName?: string | null;
  state?: string | null;
  postcode?: string | null;
  displayAddress?: string | null;
  regionFallback?: string;
}): string {
  const state = (input.state ?? "").trim();
  const postcode = (input.postcode ?? "").trim();
  const suburb = (input.suburbDisplayName ?? input.suburb ?? "").trim();
  // Belt-and-braces default only. The server caller always passes a
  // city-derived regionFallback (see data.functions.ts), so this neutral
  // literal never renders on a live build; kept city-agnostic regardless.
  const region = (input.regionFallback ?? "the region").trim();

  if (input.addressDisplay === true) {
    const street = composeStreet(input);
    const tail = [suburb, state, postcode].filter(Boolean).join(" ");
    return [street, tail].filter(Boolean).join(", ").trim() || tail || region;
  }

  // address_display false: no street allowed.
  const display = (input.displayAddress ?? "").trim();
  if (display) return display;
  if (input.suburbDisplay !== false && suburb) {
    return [suburb, state].filter(Boolean).join(", ");
  }
  return region;
}

function composeStreet(input: {
  unitNumber?: string | null;
  lotNumber?: string | null;
  streetNumber?: string | null;
  streetName?: string | null;
}): string {
  const unit = (input.unitNumber ?? "").trim();
  const lot = (input.lotNumber ?? "").trim();
  const streetNumber = (input.streetNumber ?? "").trim();
  const streetName = (input.streetName ?? "").trim();

  // Build the numeric prefix: "12/34" for unit/street, "Lot 5" when only a lot.
  let prefix = "";
  if (unit && streetNumber) prefix = `${unit}/${streetNumber}`;
  else if (unit) prefix = unit;
  else if (streetNumber) prefix = streetNumber;
  else if (lot) prefix = `Lot ${lot}`;

  return [prefix, streetName].filter(Boolean).join(" ").trim();
}

// Build SAFE image alt text from property_type + suburb + listing_type only.
// It must NEVER contain a price (compliance: hidden price must not leak through
// alt text). Suburb is included only when the publisher allows the suburb.
export function safeImageAlt(input: {
  propertyType?: string | null;
  suburb?: string | null;
  suburbDisplay?: boolean | null;
  listingType?: string | null;
}): string {
  const parts: string[] = [];
  const pt = (input.propertyType ?? "").trim();
  if (pt) parts.push(pt);
  const suburb = (input.suburb ?? "").trim();
  if (suburb && input.suburbDisplay !== false) parts.push(`in ${suburb}`);
  const label = listingTypeLabel(input.listingType).toLowerCase();
  if (label !== "listing") parts.push(label);
  const text = parts.join(" ").trim();
  return text || "Property listing";
}

// Escape plain text for safe injection into a string we then render with
// preserved line breaks. We only ever use this on the description, which we
// escape FIRST and then convert newlines to <br>. No raw HTML from the feed is
// trusted.
export function escapeHtml(input: string | null | undefined): string {
  if (!input) return "";
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Convert an escaped description into HTML with preserved paragraph breaks.
// Caller passes the RAW description; we escape then linebreak so nothing
// executable can survive.
export function descriptionToHtml(input: string | null | undefined): string {
  const escaped = escapeHtml(input);
  if (!escaped) return "";
  return escaped
    .split(/\n{2,}/)
    .map((para) => `<p>${para.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

// Normalise the images jsonb (array of {url, order}) into an ordered array of
// safe http(s) urls. Drops anything that is not a usable absolute image url.
export function normaliseImages(images: unknown): string[] {
  if (!Array.isArray(images)) return [];
  const rows = images
    .map((img) => {
      if (img && typeof img === "object") {
        const url = (img as Record<string, unknown>).url;
        const order = (img as Record<string, unknown>).order;
        return {
          url: typeof url === "string" ? url : "",
          order: typeof order === "number" ? order : Number.MAX_SAFE_INTEGER,
        };
      }
      if (typeof img === "string") return { url: img, order: Number.MAX_SAFE_INTEGER };
      return { url: "", order: Number.MAX_SAFE_INTEGER };
    })
    .filter((r) => isHttpUrl(r.url))
    .sort((a, b) => a.order - b.order);
  return rows.map((r) => r.url);
}

function isHttpUrl(v: string): boolean {
  const s = v.trim().toLowerCase();
  return s.startsWith("http://") || s.startsWith("https://");
}

// Normalise the features jsonb into a flat list of plain-text strings.
export function normaliseFeatures(features: unknown): string[] {
  if (Array.isArray(features)) {
    return features.map((f) => (typeof f === "string" ? f.trim() : "")).filter((f) => f.length > 0);
  }
  if (features && typeof features === "object") {
    // {"feature": true} style maps -> keys whose value is truthy.
    return Object.entries(features as Record<string, unknown>)
      .filter(([, v]) => v === true || (typeof v === "string" && v.trim().length > 0))
      .map(([k, v]) => (typeof v === "string" && v.trim() ? `${k}: ${v}` : k));
  }
  return [];
}

// Normalise inspection_times jsonb into label strings for plain-text display.
export function normaliseInspections(inspections: unknown): string[] {
  if (!Array.isArray(inspections)) return [];
  return inspections
    .map((i) => {
      if (typeof i === "string") return i.trim();
      if (i && typeof i === "object") {
        const o = i as Record<string, unknown>;
        const label = o.label ?? o.text ?? o.when;
        if (typeof label === "string") return label.trim();
        const start = typeof o.start === "string" ? o.start : "";
        const end = typeof o.end === "string" ? o.end : "";
        return [start, end].filter(Boolean).join(" - ").trim();
      }
      return "";
    })
    .filter((s) => s.length > 0);
}

// Coarse, public-safe price band buckets for the index filter. Boundaries are
// fixed and coarse so they never reveal an exact hidden figure. A listing is
// bucketed only when its price is public AND positive; not-public rows are left
// unbucketed (band === null) so they are shown under "Any price" and the exact
// hidden numeric never reaches a filter chip or URL param.
export const SALE_PRICE_BANDS: { id: string; label: string; min: number; max: number }[] = [
  { id: "u500k", label: "Under $500k", min: 0, max: 500_000 },
  { id: "500k-750k", label: "$500k to $750k", min: 500_000, max: 750_000 },
  { id: "750k-1m", label: "$750k to $1m", min: 750_000, max: 1_000_000 },
  { id: "1m-1_5m", label: "$1m to $1.5m", min: 1_000_000, max: 1_500_000 },
  { id: "o1_5m", label: "Over $1.5m", min: 1_500_000, max: Number.MAX_SAFE_INTEGER },
];

export function saleBandFor(
  isPublic: boolean | null | undefined,
  numeric: number | null | undefined,
): string | null {
  if (isPublic !== true || !isPositiveNumber(numeric)) return null;
  const band = SALE_PRICE_BANDS.find((b) => numeric >= b.min && numeric < b.max);
  return band ? band.id : null;
}
