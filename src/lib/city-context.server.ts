// Server-only request-scoped city context. Imported only by src/start.ts,
// never by isomorphic modules — `node:async_hooks` must stay out of the
// client bundle. Registers the AsyncLocalStorage instance on globalThis so
// the isomorphic getter in `@/lib/city` can read it SYNCHRONOUSLY without
// importing this file.

import { AsyncLocalStorage } from "node:async_hooks";

import { CITY_BRANDING, DEFAULT_CITY, resolveCityFromHost } from "./city-config";

interface CityContext {
  slug: string;
}

const GLOBAL_KEY = "__DN_CITY_ALS__";

type GlobalWithCityAls = typeof globalThis & {
  [GLOBAL_KEY]?: AsyncLocalStorage<CityContext>;
};

function getStore(): AsyncLocalStorage<CityContext> {
  const g = globalThis as GlobalWithCityAls;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = new AsyncLocalStorage<CityContext>();
  }
  return g[GLOBAL_KEY]!;
}

// Initialise eagerly so the isomorphic getter can find the ALS as soon as
// this module is loaded (start.ts imports it at server boot).
const cityStore = getStore();

export function runWithCity<T>(slug: string, fn: () => T): T {
  const safe = CITY_BRANDING[slug] ? slug : DEFAULT_CITY;
  return cityStore.run({ slug: safe }, fn);
}

export function runWithCityFromHost<T>(host: string | null | undefined, fn: () => T): T {
  return runWithCity(resolveCityFromHost(host), fn);
}

export function getCityFromContext(): string | undefined {
  return cityStore.getStore()?.slug;
}
