// Compliance regression test for property-listing price + address sanitisation.
//
// The core contract: when a price is NOT public, the raw numeric must never
// appear in any rendered output (visible text, alt text, JSON-LD, etc). These
// tests assert the pure helpers that build every public price/address/alt
// string honour that, and that a hidden numeric never surfaces.
import { describe, expect, it } from "vitest";
import {
  priceDisplay,
  soldPriceDisplay,
  composeAddress,
  safeImageAlt,
  saleBandFor,
  formatAud,
  descriptionToHtml,
  normaliseImages,
  normaliseFeatures,
} from "@/lib/listings";

describe("priceDisplay", () => {
  it("formats the numeric only when the price is public AND positive", () => {
    expect(priceDisplay({ isPublic: true, numeric: 650000, viewText: null })).toContain("650,000");
  });

  it("never renders the numeric when the price is not public", () => {
    const hidden = priceDisplay({
      isPublic: false,
      numeric: 650000,
      viewText: "Offers over $600k",
    });
    expect(hidden).toBe("Offers over $600k");
    expect(hidden).not.toContain("650,000");
    expect(hidden).not.toContain("650000");
  });

  it("falls back to Contact Agent when not public and no view text", () => {
    expect(priceDisplay({ isPublic: false, numeric: 650000, viewText: null })).toBe(
      "Contact Agent",
    );
    expect(priceDisplay({ isPublic: false, numeric: 650000, viewText: "" })).toBe("Contact Agent");
  });

  it("treats a missing/zero/unparseable numeric as not displayable", () => {
    expect(priceDisplay({ isPublic: true, numeric: 0, viewText: "Contact" })).toBe("Contact");
    expect(priceDisplay({ isPublic: true, numeric: null, viewText: null })).toBe("Contact Agent");
    // @ts-expect-error deliberately passing a bad type
    expect(priceDisplay({ isPublic: true, numeric: "650000", viewText: null })).toBe(
      "Contact Agent",
    );
  });

  it("prefers price_view_text over the formatted figure is NOT done; figure wins when public", () => {
    // When public and positive, the dollar figure is shown (view text may sit alongside in the UI).
    expect(priceDisplay({ isPublic: true, numeric: 720000, viewText: "Auction" })).toContain(
      "720,000",
    );
  });

  it("appends the rent period for rentals", () => {
    expect(priceDisplay({ isPublic: true, numeric: 680, viewText: null, period: "week" })).toBe(
      `${formatAud(680)} per week`,
    );
  });
});

describe("soldPriceDisplay", () => {
  it("shows the figure only when the sold price is public", () => {
    expect(
      soldPriceDisplay({ isPublic: true, numeric: 900000, displayText: null, range: null }),
    ).toContain("900,000");
  });

  it("never leaks a hidden sold numeric", () => {
    const out = soldPriceDisplay({
      isPublic: false,
      numeric: 900000,
      displayText: null,
      range: "$800k - $880k",
    });
    expect(out).toBe("$800k - $880k");
    expect(out).not.toContain("900,000");
    expect(out).not.toContain("900000");
  });

  it("falls back to a neutral withheld label", () => {
    expect(
      soldPriceDisplay({ isPublic: false, numeric: 900000, displayText: null, range: null }),
    ).toBe("Sold (price withheld)");
  });
});

describe("saleBandFor", () => {
  it("buckets a public price into a coarse band", () => {
    expect(saleBandFor(true, 620000)).toBe("500k-750k");
  });

  it("returns null (no band, no chip) for a non-public price", () => {
    expect(saleBandFor(false, 620000)).toBeNull();
    expect(saleBandFor(true, 0)).toBeNull();
    expect(saleBandFor(true, null)).toBeNull();
  });
});

describe("composeAddress", () => {
  it("builds a full street line when address_display is true", () => {
    const out = composeAddress({
      addressDisplay: true,
      suburbDisplay: true,
      unitNumber: "5",
      streetNumber: "12",
      streetName: "Northbourne Avenue",
      suburb: "Braddon",
      state: "ACT",
      postcode: "2612",
    });
    expect(out).toBe("5/12 Northbourne Avenue, Braddon ACT 2612");
  });

  it("never shows a street when address_display is false", () => {
    const out = composeAddress({
      addressDisplay: false,
      suburbDisplay: true,
      streetNumber: "12",
      streetName: "Northbourne Avenue",
      suburb: "Braddon",
      state: "ACT",
      postcode: "2612",
    });
    expect(out).toBe("Braddon, ACT");
    expect(out).not.toContain("Northbourne");
    expect(out).not.toContain("12");
  });

  it("hides the suburb too when suburb_display is false", () => {
    const out = composeAddress({
      addressDisplay: false,
      suburbDisplay: false,
      suburb: "Braddon",
      state: "ACT",
      regionFallback: "Canberra region",
    });
    expect(out).toBe("Canberra region");
    expect(out).not.toContain("Braddon");
  });

  it("uses Lot for a lot-only address", () => {
    const out = composeAddress({
      addressDisplay: true,
      suburbDisplay: true,
      lotNumber: "7",
      streetName: "Ginninderra Drive",
      suburb: "Strathnairn",
      state: "ACT",
    });
    expect(out).toContain("Lot 7 Ginninderra Drive");
  });
});

describe("safeImageAlt", () => {
  it("builds alt text from type, suburb and listing type and never a price", () => {
    const alt = safeImageAlt({
      propertyType: "Apartment",
      suburb: "Braddon",
      suburbDisplay: true,
      listingType: "sale",
    });
    expect(alt).toBe("Apartment in Braddon for sale");
    expect(alt).not.toMatch(/\$|\d{3,}/);
  });

  it("omits the suburb when suburb_display is false", () => {
    const alt = safeImageAlt({
      propertyType: "House",
      suburb: "Braddon",
      suburbDisplay: false,
      listingType: "rent",
    });
    expect(alt).not.toContain("Braddon");
  });
});

describe("descriptionToHtml", () => {
  it("escapes feed text before inserting line breaks (no raw HTML survives)", () => {
    const html = descriptionToHtml("<script>alert(1)</script>\nLine two");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("<br>");
  });
});

describe("normaliseImages / normaliseFeatures", () => {
  it("orders images by their order key and drops non-http urls", () => {
    const urls = normaliseImages([
      { url: "https://example.com/2.jpg", order: 2 },
      { url: "javascript:alert(1)", order: 0 },
      { url: "https://example.com/1.jpg", order: 1 },
    ]);
    expect(urls).toEqual(["https://example.com/1.jpg", "https://example.com/2.jpg"]);
  });

  it("flattens a features array to plain strings", () => {
    expect(normaliseFeatures(["Ducted heating", "  ", "Solar"])).toEqual([
      "Ducted heating",
      "Solar",
    ]);
  });
});
