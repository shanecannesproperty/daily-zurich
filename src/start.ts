import { createStart, createMiddleware } from "@tanstack/react-start";
import { getRequest, getRequestHeader, setResponseHeader } from "@tanstack/react-start/server";

import { renderErrorPage } from "./lib/error-page";
// Side-effect import: registers the city AsyncLocalStorage on globalThis so
// the isomorphic citySlug() getter in @/lib/city can read it synchronously.
import { runWithCityFromHost } from "./lib/city-context.server";
import { resolveCityFromHost } from "./lib/city-config";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

// Resolve the active city ONCE per request and pin it in AsyncLocalStorage so
// every downstream server fn / route loader / .ts route (sitemap, rss, robots,
// og) sees the same slug. Behind Lovable's hosting proxy the PUBLIC hostname
// arrives in `x-forwarded-host`; the raw `Host` can be an internal origin, so
// we MUST prefer the forwarded host (this is why every custom domain was
// previously falling back to canberra). Unknown hosts (lovable.app previews,
// localhost) still fall back to canberra inside runWithCityFromHost.
const cityMiddleware = createMiddleware().server(async ({ next }) => {
  const forwardedHost = getRequestHeader("x-forwarded-host") ?? null;
  const rawHost = getRequestHeader("host") ?? null;
  const host = forwardedHost ?? rawHost;
  // Temporary diagnostics: surface exactly what the server saw so we can
  // confirm host routing in production. Safe to remove once verified.
  try {
    setResponseHeader("x-dn-xfh", forwardedHost ?? "(none)");
    setResponseHeader("x-dn-host", rawHost ?? "(none)");
    setResponseHeader("x-dn-city", resolveCityFromHost(host));
  } catch {
    // headers may already be flushed on streamed responses; ignore
  }
  return runWithCityFromHost(host, () => next());
});

// Edge-cache public HTML pages. All sites in the network share ONE PostgREST /
// Postgres backend; without CDN caching, every visitor request re-runs the
// homepage / section / article DB queries, so a traffic spike saturates the
// shared origin (this is the Cloudflare 522 / "exhausting resources" failure
// mode behind the recent outage). Caching the rendered document at the edge
// means repeat hits are served without touching the database.
//
// Scope: GET navigations for public *pages* only. `/admin` (operator UI) and
// `/api/*` (JSON/feeds that already set their own Cache-Control) are excluded,
// as is any path with a file extension — `/sitemap.xml`, `/robots.txt`,
// `/feed.xml`, `/logo.svg`, `/favicon.ico`, etc. set their own Cache-Control in
// their route handlers, and a browser navigation to one of those still sends
// `Accept: text/html`, so without the extension guard we'd set a second,
// conflicting Cache-Control on them. Real pages are extensionless. We only act
// on requests that accept text/html so asset/data fetches are untouched.
// `s-maxage` is the shared (CDN) TTL; `max-age=0` keeps the browser
// revalidating so editors see new stories promptly, while
// `stale-while-revalidate` lets the edge serve a slightly-stale page and
// refresh in the background instead of stampeding the origin. 5xx responses are
// not cached by shared caches, so a transient backend outage will not get
// pinned at the edge.
const PUBLIC_DOC_CACHE = "public, max-age=0, s-maxage=60, stale-while-revalidate=600";

const cacheMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    const req = typeof getRequest === "function" ? getRequest() : undefined;
    const accept = req?.headers.get("accept") ?? "";
    const path = req ? new URL(req.url).pathname : "";
    const cacheablePage =
      req?.method === "GET" &&
      accept.includes("text/html") &&
      !path.startsWith("/admin") &&
      !path.startsWith("/api") &&
      !/\.[a-z0-9]+$/i.test(path);
    if (cacheablePage) {
      setResponseHeader("Cache-Control", PUBLIC_DOC_CACHE);
    }
  } catch {
    // headers may already be flushed on streamed responses; ignore
  }
  return next();
});

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [cityMiddleware, cacheMiddleware, errorMiddleware],
}));
