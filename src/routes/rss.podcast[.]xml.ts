import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { cityName, siteDomain, siteName } from "@/lib/city";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function rfc822(date: string, createdAt: string | null): string {
  return new Date(createdAt || `${date}T07:00:00+11:00`).toUTCString();
}

export const Route = createFileRoute("/rss/podcast.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { cityTable } = await import("@/lib/db.server");
        const res = await cityTable("audio_briefings")
          .not("audio_url", "is", null)
          .order("briefing_date", { ascending: false })
          .limit(60);
        if (res.error) return new Response(res.error.message, { status: 500 });

        const feedTitle = `${siteName()} in 5`;
        const feedDesc = `Your daily audio briefing on ${cityName()}. News, events and stories, fresh each morning.`;

        const items = (res.data ?? [])
          .map((row) => {
            const b = row as {
              briefing_date: string;
              title: string | null;
              script_text: string | null;
              audio_url: string | null;
              duration_sec: number | null;
              created_at: string | null;
            };
            if (!b.audio_url) return "";
            const desc = (b.script_text ?? "").slice(0, 400);
            const dur = b.duration_sec ?? 90;
            return `    <item>
      <title>${esc(b.title ?? `${cityName()} in 5 minutes`)}</title>
      <description>${esc(desc)}</description>
      <pubDate>${rfc822(b.briefing_date, b.created_at)}</pubDate>
      <guid isPermaLink="false">tdc-briefing-${b.briefing_date}</guid>
      <enclosure url="${esc(b.audio_url)}" length="0" type="audio/mpeg" />
      <itunes:duration>${dur}</itunes:duration>
      <itunes:explicit>false</itunes:explicit>
    </item>`;
          })
          .filter(Boolean)
          .join("\n");

        const lastBuild = new Date().toUTCString();
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(feedTitle)}</title>
    <link>${siteDomain()}</link>
    <description>${esc(feedDesc)}</description>
    <language>en-au</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <atom:link href="${siteDomain()}/rss/podcast.xml" rel="self" type="application/rss+xml" />
    <itunes:author>${esc(siteName())}</itunes:author>
    <itunes:summary>${esc(feedDesc)}</itunes:summary>
    <itunes:owner>
      <itunes:name>${esc(siteName())}</itunes:name>
      <itunes:email>hello@${siteDomain().replace(/^https?:\/\//, "")}</itunes:email>
    </itunes:owner>
    <itunes:image href="${siteDomain()}/og-default.jpg" />
    <itunes:category text="News" />
    <itunes:explicit>false</itunes:explicit>
${items}
  </channel>
</rss>`;
        return new Response(xml, {
          status: 200,
          headers: {
            "Content-Type": "application/rss+xml; charset=utf-8",
            "Cache-Control": "public, max-age=900",
          },
        });
      },
    },
  },
});
