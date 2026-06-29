import { describe, expect, it } from "vitest";

import { resolveCityFromHost, CITY_BRANDING } from "@/lib/city-config";
// Import for side effect: registers the AsyncLocalStorage on globalThis so
// the isomorphic citySlug() getter can find it during tests.
import { getCityFromContext, runWithCity, runWithCityFromHost } from "@/lib/city-context.server";
import { citySlug, cityName, siteDomain, siteName } from "@/lib/city";

describe("resolveCityFromHost", () => {
  it("maps the canonical city domains", () => {
    expect(resolveCityFromHost("dailycanberra.com.au")).toBe("canberra");
    expect(resolveCityFromHost("dailysydney.com.au")).toBe("sydney");
    expect(resolveCityFromHost("dailymelbourne.com.au")).toBe("melbourne");
    expect(resolveCityFromHost("dailygoldcoast.com.au")).toBe("goldcoast");
  });

  it("strips www. and port and is case-insensitive", () => {
    expect(resolveCityFromHost("www.dailysydney.com.au")).toBe("sydney");
    expect(resolveCityFromHost("DailyMelbourne.com.au:443")).toBe("melbourne");
    expect(resolveCityFromHost("dailycanberra.com.au:8080")).toBe("canberra");
  });

  it("falls back to canberra for unknown/empty hosts", () => {
    expect(resolveCityFromHost("localhost")).toBe("canberra");
    expect(resolveCityFromHost("id-preview--abc.lovable.app")).toBe("canberra");
    expect(resolveCityFromHost("daily-canberra-site.lovable.app")).toBe("canberra");
    expect(resolveCityFromHost(undefined)).toBe("canberra");
    expect(resolveCityFromHost(null)).toBe("canberra");
    expect(resolveCityFromHost("")).toBe("canberra");
  });

  it("recognises the dailycanberra.online alias", () => {
    expect(resolveCityFromHost("dailycanberra.online")).toBe("canberra");
  });
});

describe("city AsyncLocalStorage", () => {
  // This project pins a city at build time via VITE_SITE_CITY (see .env). The
  // env pin takes precedence over hostname resolution and over AsyncLocalStorage
  // so a per-project deploy serves its city everywhere. Expectations are derived
  // from the pinned city's branding so this test is correct in EVERY per-city
  // repo (not just Sydney) — citySlug() returns the env pin when no ALS context
  // is active.
  const PINNED = citySlug();
  const B = CITY_BRANDING[PINNED];

  it("env pin wins over runWithCity in per-project deploys", () => {
    runWithCity("melbourne", () => {
      expect(getCityFromContext()).toBe("melbourne");
      expect(citySlug()).toBe(PINNED);
      expect(cityName()).toBe(B.name);
      expect(siteName()).toBe(B.siteName);
      expect(siteDomain()).toBe(B.domain);
    });
  });

  it("falls back to the env-pinned city outside any request context", () => {
    expect(getCityFromContext()).toBeUndefined();
    expect(citySlug()).toBe(PINNED);
    expect(siteName()).toBe(B.siteName);
  });

  it("runWithCityFromHost still normalises the ALS slug even when env pin wins", () => {
    runWithCityFromHost("www.dailymelbourne.com.au:443", () => {
      expect(getCityFromContext()).toBe("melbourne");
      expect(citySlug()).toBe(PINNED);
    });
    runWithCityFromHost("id-preview--abc.lovable.app", () => {
      expect(getCityFromContext()).toBe("canberra");
      expect(citySlug()).toBe(PINNED);
    });
  });

  it("runWithCity normalises unknown slugs to canberra in ALS", () => {
    runWithCity("atlantis", () => {
      expect(getCityFromContext()).toBe("canberra");
      expect(citySlug()).toBe(PINNED);
    });
  });
});
