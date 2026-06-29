import { describe, expect, it } from "vitest";

import {
  CITY_BRANDING,
  DEFAULT_CITY,
  DRAFT_CITY_SLUGS,
  isCityLaunched,
  resolveCityFromHost,
} from "@/lib/city-config";
// Import for side effect: registers the AsyncLocalStorage on globalThis so the
// isomorphic cityLaunched() getter can resolve the active city during tests.
import { runWithCity } from "@/lib/city-context.server";
import { cityLaunched } from "@/lib/city";

describe("content-readiness gate", () => {
  it("treats a city as launched unless it is in DRAFT_CITY_SLUGS", () => {
    for (const slug of Object.keys(CITY_BRANDING)) {
      expect(isCityLaunched(slug)).toBe(slug === DEFAULT_CITY || !DRAFT_CITY_SLUGS.has(slug));
    }
  });

  it("keeps the canberra flagship indexable no matter what", () => {
    // Canberra is the fallback for localhost, previews and unknown hosts, so it
    // must never be de-indexed even if its slug is added to DRAFT_CITY_SLUGS.
    expect(isCityLaunched(DEFAULT_CITY)).toBe(true);
    expect(isCityLaunched("canberra")).toBe(true);
  });

  it("never drafts the default city via the set", () => {
    expect(DRAFT_CITY_SLUGS.has(DEFAULT_CITY)).toBe(false);
  });

  it("every branding entry carries a launched flag matching the gate", () => {
    for (const [slug, branding] of Object.entries(CITY_BRANDING)) {
      expect(branding.launched).toBe(isCityLaunched(slug));
    }
  });

  it("cityLaunched() reflects the active request city", () => {
    runWithCity("canberra", () => {
      expect(cityLaunched()).toBe(true);
    });
    runWithCity("sydney", () => {
      expect(cityLaunched()).toBe(isCityLaunched("sydney"));
    });
  });
});

describe("international (draft) cities", () => {
  const FLAGSHIPS = [
    { slug: "london", name: "London", host: "dailylondon.news" },
    { slug: "singapore", name: "Singapore", host: "dailysingapore.news" },
    { slug: "hongkong", name: "Hong Kong", host: "dailyhongkong.news" },
  ];

  it("are registered in the network with their pinned domains", () => {
    for (const f of FLAGSHIPS) {
      const brand = CITY_BRANDING[f.slug];
      expect(brand).toBeDefined();
      expect(brand.name).toBe(f.name);
      expect(brand.domain).toBe(`https://${f.host}`);
    }
  });

  it("resolve from their hostnames", () => {
    for (const f of FLAGSHIPS) {
      expect(resolveCityFromHost(f.host)).toBe(f.slug);
      expect(resolveCityFromHost(`www.${f.host}`)).toBe(f.slug);
    }
  });

  it("are accessible on their pinned domains", () => {
    for (const f of FLAGSHIPS) {
      expect(resolveCityFromHost(f.host)).toBe(f.slug);
      expect(CITY_BRANDING[f.slug]).toBeDefined();
    }
  });

  it("international .news cities are launched alongside Australian cities", () => {
    // All cities with dedicated .news or .com.au domains are considered launched.
    // Only cities without a custom domain remain in DRAFT_CITY_SLUGS.
    for (const f of FLAGSHIPS) {
      expect(isCityLaunched(f.slug)).toBe(true);
      expect(CITY_BRANDING[f.slug].launched).toBe(true);
    }
  });
});
