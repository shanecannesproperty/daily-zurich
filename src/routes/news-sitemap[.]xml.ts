import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { siteDomain, siteName, citySlug } from "@/lib/city";
import { slugToNativeLang } from "@/lib/city-config";
import { listAllPublishedArticleSlugs } from "@/lib/data.functions";

function xmlEscape(s: string) {
  return s.replace(/[<>&'"]/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c === "'" ? "&apos;" : "&quot;",
  );
}

// Google News requires a valid W3C / ISO-8601 publication_date. Normalise
// whatever the DB returns so a non-ISO or unparseable value never invalidates
// the entry (the main sitemap already does this via toIsoDate).
function toIsoDate(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

export const Route = createFileRoute("/news-sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const articles = await listAllPublishedArticleSlugs();
        const cutoff = Date.now() - 48 * 60 * 60 * 1000;
        const recent = articles
          .map((a) => ({ ...a, pubIso: toIsoDate(a.published_at) }))
          .filter(
            (a) => a.pubIso && new Date(a.pubIso).getTime() >= cutoff,
          );
        const nativeLang = slugToNativeLang(citySlug());
        const body = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">`,
          ...recent.map(
            (a) => `  <url>
    <loc>${xmlEscape(`${siteDomain()}/article/${a.slug}`)}</loc>
    <news:news>
      <news:publication>
        <news:name>${xmlEscape(siteName())}</news:name>
        <news:language>${nativeLang}</news:language>
      </news:publication>
      <news:publication_date>${xmlEscape(a.pubIso ?? "")}</news:publication_date>
      <news:title>${xmlEscape(a.title)}</news:title>
    </news:news>
  </url>`,
          ),
          `</urlset>`,
        ].join("\n");
        return new Response(body, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=300",
          },
        });
      },
    },
  },
});
