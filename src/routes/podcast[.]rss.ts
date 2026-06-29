import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { citySlug, siteDomain, siteName } from "@/lib/city";

function xmlEscape(s: string) {
  return (s ?? "").replace(/[<>&'"]/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c === "'" ? "&apos;" : "&quot;"
  );
}

export const Route = createFileRoute("/podcast.rss")({
  server: {
    handlers: {
      GET: async () => {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        const domain = siteDomain();
        const publication = siteName();
        const cityKey = citySlug();

        let episodes: any[] = [];
        try {
          const res = await fetch(
            `${supabaseUrl}/rest/v1/audio_briefings?city=eq.${cityKey}&order=briefing_date.desc&limit=30&select=title,audio_url,duration_sec,briefing_date,script_text`,
            { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
          );
          if (res.ok) episodes = await res.json();
        } catch {
          /* network error — return empty episodes list */
        }

        const items = episodes
          .map((ep: any) => {
            const pubDate = new Date(
              (ep.briefing_date ?? new Date().toISOString().slice(0, 10)) + "T06:00:00+10:00"
            ).toUTCString();
            const durationSec = ep.duration_sec ?? 90;
            const duration = `${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, "0")}`;
            const length = durationSec * 16000;
            const title = ep.title ?? `${publication} Briefing — ${ep.briefing_date}`;
            const desc = ep.script_text?.slice(0, 300) ?? `Your daily ${publication} news briefing.`;
            return `  <item>
    <title>${xmlEscape(title)}</title>
    <description>${xmlEscape(desc)}</description>
    <pubDate>${pubDate}</pubDate>
    <enclosure url="${xmlEscape(ep.audio_url ?? "")}" type="audio/mpeg" length="${length}"/>
    <guid isPermaLink="false">${xmlEscape(ep.audio_url ?? ep.briefing_date)}</guid>
    <itunes:duration>${duration}</itunes:duration>
    <itunes:summary>${xmlEscape(desc)}</itunes:summary>
  </item>`;
          })
          .join("\n");

        const body = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">`,
          `<channel>`,
          `  <title>${xmlEscape(publication)} Daily Briefing</title>`,
          `  <link>${xmlEscape(domain)}</link>`,
          `  <description>Your daily local news briefing from ${xmlEscape(publication)}, fresh every morning.</description>`,
          `  <language>en-au</language>`,
          `  <itunes:author>${xmlEscape(publication)} Newsroom</itunes:author>`,
          `  <itunes:category text="News"/>`,
          `  <itunes:explicit>false</itunes:explicit>`,
          `  <itunes:image href="${xmlEscape(domain)}/og-image.png"/>`,
          items || `  <!-- No episodes yet -->`,
          `</channel>`,
          `</rss>`,
        ].join("\n");

        return new Response(body, {
          headers: {
            "Content-Type": "application/rss+xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
