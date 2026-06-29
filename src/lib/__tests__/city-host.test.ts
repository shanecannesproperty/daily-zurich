import { describe, expect, it } from "vitest";

import { resolveCityFromHost } from "@/lib/city-config";
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
  it("exposes the slug inside runWithCity", () => {
    runWithCity("sydney", () => {
      expect(getCityFromContext()).toBe("sydney");
      expect(citySlug()).toBe("sydney");
      expect(cityName()).toBe("Sydney");
      expect(siteName()).toBe("The Daily Sydney");
      expect(siteDomain()).toBe("https://dailysydney.com.au");
    });
  });

  it("resolves canberra outside any request context", () => {
    expect(getCityFromContext()).toBeUndefined();
    expect(citySlug()).toBe("canberra");
    expect(siteName()).toBe("The Daily Canberra");
  });

  it("runWithCityFromHost normalises and pins the slug", () => {
    runWithCityFromHost("www.dailymelbourne.com.au:443", () => {
      expect(citySlug()).toBe("melbourne");
      expect(siteDomain()).toBe("https://dailymelbourne.com.au");
    });
    runWithCityFromHost("id-preview--abc.lovable.app", () => {
      expect(citySlug()).toBe("canberra");
    });
  });

  it("falls back to canberra for unknown slugs passed to runWithCity", () => {
    runWithCity("atlantis", () => {
      expect(citySlug()).toBe("canberra");
    });
  });
});
