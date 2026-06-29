import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { siteDomain, siteName } from "@/lib/city";
import { listAllPublishedArticleSlugs } from "@/lib/data.functions";

function xmlEscape(s: string) {
  return (s ?? "").replace(/[<>&'"]/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c === "'" ? "&apos;" : "&quot;"
  );
}

export const Route = createFileRoute("/feed.xml")({
  server: {
    handlers: {
      GET: async () => {
        const domain = siteDomain();
        const publication = siteName();
        const articles = await listAllPublishedArticleSlugs();
        const recent = articles.slice(0, 20);
        const items = recent
          .map((a: any) => {
            const pubDate = a.published_at
              ? new Date(a.published_at).toUTCString()
              : new Date().toUTCString();
            return `  <item>
    <title>${xmlEscape(a.title ?? "")}</title>
    <link>${xmlEscape(`${domain}/article/${a.slug}`)}</link>
    <guid isPermaLink="true">${xmlEscape(`${domain}/article/${a.slug}`)}</guid>
    <pubDate>${pubDate}</pubDate>
    <description>${xmlEscape(a.dek ?? a.title ?? "")}</description>
  </item>`;
          })
          .join("\n");

        const body = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<rss version="2.0">`,
          `<channel>`,
          `  <title>${xmlEscape(publication)}</title>`,
          `  <link>${xmlEscape(domain)}</link>`,
          `  <description>Latest local news from ${xmlEscape(publication)}</description>`,
          `  <language>en-au</language>`,
          `  <ttl>60</ttl>`,
          items || `  <!-- No articles yet -->`,
          `</channel>`,
          `</rss>`,
        ].join("\n");

        return new Response(body, {
          headers: {
            "Content-Type": "application/rss+xml; charset=utf-8",
            "Cache-Control": "public, max-age=300",
          },
        });
      },
    },
  },
});
