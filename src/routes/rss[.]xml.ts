import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { cityBcp47, cityName, siteDomain, siteName } from "@/lib/city";

function xmlEscape(s: string) {
  return (s ?? "").replace(/[<>&'"]/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c === "'" ? "&apos;" : "&quot;",
  );
}

function cdata(s: string) {
  return `<![CDATA[${(s ?? "").replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

function stripHtml(s: string) {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export const Route = createFileRoute("/rss.xml")({
  server: {
    handlers: {
      GET: async () => {
        const domain = siteDomain();
        const publication = siteName();
        const city = cityName();
        const feedUrl = `${domain}/rss.xml`;

        const { cityTable } = await import("@/lib/db.server");
        const res = await cityTable("articles")
          .eq("is_published", true)
          .order("published_at", { ascending: false })
          .limit(20);

        if (res.error) {
          return new Response(res.error.message, { status: 500 });
        }

        const rows = (res.data ?? []) as Array<{
          title: string;
          slug: string;
          dek: string | null;
          body_html: string | null;
          category: string;
          hero_image: string | null;
          published_at: string | null;
        }>;

        const lastBuild =
          rows[0]?.published_at != null
            ? new Date(rows[0].published_at).toUTCString()
            : new Date().toUTCString();

        const items = rows
          .map((a) => {
            const link = `${domain}/article/${a.slug}`;
            const pubDate = a.published_at
              ? new Date(a.published_at).toUTCString()
              : new Date().toUTCString();
            const summary =
              a.dek?.trim() ||
              (a.body_html ? stripHtml(a.body_html).slice(0, 200) : a.title);
            const enclosure =
              a.hero_image && /^https?:\/\//.test(a.hero_image)
                ? `      <enclosure url="${xmlEscape(a.hero_image)}" type="image/jpeg" />`
                : "";
            return [
              `    <item>`,
              `      <title>${cdata(a.title)}</title>`,
              `      <link>${xmlEscape(link)}</link>`,
              `      <guid isPermaLink="true">${xmlEscape(link)}</guid>`,
              `      <pubDate>${pubDate}</pubDate>`,
              `      <description>${cdata(summary)}</description>`,
              `      <category>${xmlEscape(a.category)}</category>`,
              enclosure,
              `    </item>`,
            ]
              .filter(Boolean)
              .join("\n");
          })
          .join("\n");

        const ogImage = `${domain}/og-image.jpg`;

        const body = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">`,
          `  <channel>`,
          `    <title>${xmlEscape(publication)}</title>`,
          `    <link>${xmlEscape(domain)}</link>`,
          `    <description>Local news for ${xmlEscape(city)}</description>`,
          `    <language>${cityBcp47()}</language>`,
          `    <lastBuildDate>${lastBuild}</lastBuildDate>`,
          `    <atom:link href="${xmlEscape(feedUrl)}" rel="self" type="application/rss+xml" />`,
          `    <image>`,
          `      <url>${xmlEscape(ogImage)}</url>`,
          `      <title>${xmlEscape(publication)}</title>`,
          `      <link>${xmlEscape(domain)}</link>`,
          `    </image>`,
          items || `    <!-- No articles yet -->`,
          `  </channel>`,
          `</rss>`,
        ].join("\n");

        return new Response(body, {
          headers: {
            "Content-Type": "application/rss+xml; charset=utf-8",
            "Cache-Control": "public, max-age=900",
          },
        });
      },
    },
  },
});
