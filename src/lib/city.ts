// Per-request city resolution. ONE deploy serves every Daily Network city.
// SYNCHRONOUS getters by design (~108 call sites use them in render and in
// .eq("city", citySlug()) filters). Server reads the slug via an
// AsyncLocalStorage instance the server-only module registers on globalThis
// at boot; this isomorphic file NEVER imports node:async_hooks. Client reads
// window.location.hostname. Both sides funnel through resolveCityFromHost so
// SSR and hydration agree, and unknown/preview/localhost hosts fall back to
// canberra so the existing live site stays byte-identical.

import {
  CITY_BRANDING,
  DEFAULT_CITY,
  brandingFor,
  resolveCityFromHost,
  slugToBcp47,
  type CityBranding,
  type CitySocial,
} from "./city-config";

export const SITE_LOCALE = "en_AU" as const;

interface CityStoreLike {
  getStore: () => { slug: string } | undefined;
}

// Unit tests assert host/ALS resolution and the canberra defaults. A remix
// pins VITE_SITE_CITY, which would otherwise override those during the remix's
// own `bun run test` (run by `bun run build`). The test setup sets this flag so
// the pin is ignored in tests; see src/test-setup.ts.
function cityPinDisabled(): boolean {
  return (globalThis as { __DN_DISABLE_CITY_PIN__?: boolean }).__DN_DISABLE_CITY_PIN__ === true;
}

// The build-time city pin (VITE_SITE_CITY / SITE_CITY). A remix pins exactly
// one city per deploy. Returns a known slug, or null when unset/unknown.
function envPinSlug(): string | null {
  const viteEnv =
    typeof import.meta !== "undefined"
      ? (import.meta as { env?: Record<string, string | undefined> }).env
      : undefined;
  const fromVite = viteEnv?.VITE_SITE_CITY;
  const fromNode = typeof process !== "undefined" ? process.env?.SITE_CITY : undefined;
  const raw = fromVite || fromNode;
  if (!raw) return null;
  const slug = String(raw).toLowerCase().trim();
  return CITY_BRANDING[slug] ? slug : null;
}

function envFallbackSlug(): string {
  if (cityPinDisabled()) return DEFAULT_CITY;
  return envPinSlug() ?? DEFAULT_CITY;
}

// Resolution precedence: VITE_SITE_CITY pin -> client window host -> server
// AsyncLocalStorage (x-forwarded-host) -> canberra fallback. The pin is skipped
// when cityPinDisabled() so the ALS unit tests can assert host/ALS resolution.
export function citySlug(): string {
  if (!cityPinDisabled()) {
    const pinned = envPinSlug();
    if (pinned) return pinned;
  }
  if (typeof window !== "undefined") {
    return resolveCityFromHost(window.location.hostname);
  }
  const als = (globalThis as { __DN_CITY_ALS__?: CityStoreLike }).__DN_CITY_ALS__;
  return als?.getStore()?.slug ?? envFallbackSlug();
}

export function getCity(): CityBranding {
  return brandingFor(citySlug());
}

export function cityName(): string {
  return getCity().name;
}

export function siteName(): string {
  return getCity().siteName;
}

export function siteTagline(): string {
  return getCity().tagline;
}

export function siteDomain(): string {
  return getCity().domain;
}

export function cityAccent(): string {
  return getCity().accent;
}

export function cityCoords(): [number, number] {
  return getCity().coords;
}

export function cityTimezone(): string {
  return getCity().timezone;
}

export function cityRegion(): string {
  return getCity().region;
}

export function cityBcp47(): string {
  return slugToBcp47(citySlug());
}

const AU_STATE_CODES = new Set(["ACT", "NSW", "VIC", "QLD", "WA", "SA", "NT", "TAS"]);

export function isCityAustralian(): boolean {
  return AU_STATE_CODES.has(getCity().region);
}

// Whether the active city is launched (indexable). Draft cities still render,
// but robots.txt disallows them and the document head emits `noindex` so they
// stay out of search engines until they have real local content. See
// DRAFT_CITY_SLUGS in city-config.ts.
export function cityLaunched(): boolean {
  return getCity().launched;
}

// Live social accounts for the active city, or undefined when it has none.
// Callers (footer icons, JSON-LD sameAs) MUST treat undefined as "no socials"
// and render nothing, so a remix never links to a missing/other-city account.
export function citySocial(): CitySocial | undefined {
  return getCity().social;
}

// Derive a city-aware email address from the deploy domain.
// e.g. siteEmail("hello") → "hello@dailycanberra.com.au"
export function siteEmail(local: string): string {
  const domain = siteDomain().replace(/^https?:\/\//i, "");
  return `${local}@${domain}`;
}

// The active city's social URLs as a flat list, in a stable order, for the
// JSON-LD `sameAs` array. Empty when the city has no social presence.
export function citySocialLinks(): string[] {
  const s = getCity().social;
  if (!s) return [];
  return [s.facebook, s.instagram, s.twitter].filter((u): u is string => Boolean(u));
}
