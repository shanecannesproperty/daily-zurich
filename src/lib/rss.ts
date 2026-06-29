// RSS feed helper. Renders an Atom-ish RSS 2.0 document for a given query.
import { siteDomain, siteName, siteTagline } from "@/lib/city";

function xmlEscape(s: string) {
  return s.replace(/[<>&'"]/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c === "'" ? "&apos;" : "&quot;",
  );
}

export function rssResponse(args: {
  title: string;
  description: string;
  feedPath: string;
  items: Array<{
    title: string;
    link: string;
    description?: string | null;
    pubDate?: string | null;
    guid?: string;
  }>;
}) {
  const itemsXml = args.items
    .map((it) => {
      const date = it.pubDate ? new Date(it.pubDate).toUTCString() : new Date().toUTCString();
      return [
        "    <item>",
        `      <title>${xmlEscape(it.title)}</title>`,
        `      <link>${xmlEscape(it.link)}</link>`,
        `      <guid isPermaLink="true">${xmlEscape(it.guid ?? it.link)}</guid>`,
        `      <pubDate>${date}</pubDate>`,
        it.description ? `      <description>${xmlEscape(it.description)}</description>` : "",
        "    </item>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  const body = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">`,
    `  <channel>`,
    `    <title>${xmlEscape(args.title)}</title>`,
    `    <link>${siteDomain()}</link>`,
    `    <description>${xmlEscape(args.description)}</description>`,
    `    <language>en-au</language>`,
    `    <atom:link href="${siteDomain()}${args.feedPath}" rel="self" type="application/rss+xml" />`,
    `    <generator>${xmlEscape(siteName())} (${xmlEscape(siteTagline())})</generator>`,
    itemsXml,
    `  </channel>`,
    `</rss>`,
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=900",
    },
  });
}
