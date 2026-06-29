import { createFileRoute, notFound } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { buildAllSitemapEntries } from "./sitemap[.]xml";

const URLS_PER_SITEMAP = 50000;

function xmlEscape(s: string) {
  return s.replace(/[<>&'"]/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c === "'" ? "&apos;" : "&quot;",
  );
}

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export const Route = createFileRoute("/sitemap-page/$page")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const page = Number(params.page);
        if (!Number.isFinite(page) || page < 1) throw notFound();
        const all = await buildAllSitemapEntries();
        const totalPages = Math.max(1, Math.ceil(all.length / URLS_PER_SITEMAP));
        if (page > totalPages) throw notFound();
        const start = (page - 1) * URLS_PER_SITEMAP;
        const entries = all.slice(start, start + URLS_PER_SITEMAP);
        const hasImages = entries.some((e) => e.image);
        const ns = hasImages
          ? `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`
          : `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
        const body = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          ns,
          ...entries.map((u) => {
            const parts = [`<loc>${xmlEscape(u.loc)}</loc>`];
            if (u.lastmod) parts.push(`<lastmod>${u.lastmod}</lastmod>`);
            if (u.image)
              parts.push(
                `<image:image><image:loc>${xmlEscape(u.image)}</image:loc></image:image>`,
              );
            return `  <url>${parts.join("")}</url>`;
          }),
          `</urlset>`,
        ].join("\n");

        const etag = `"W/${hash(body)}"`;
        const inm = request.headers.get("if-none-match");
        const headers: Record<string, string> = {
          "Content-Type": "application/xml; charset=utf-8",
          "Cache-Control": "public, max-age=900, s-maxage=900",
          ETag: etag,
        };
        if (inm && inm === etag) return new Response(null, { status: 304, headers });
        return new Response(body, { headers });
      },
    },
  },
});
