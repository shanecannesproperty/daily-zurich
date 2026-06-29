// Server-only RSS ingest implementation. Used by:
//   - The public cron hook (/api/public/hooks/rss-ingest) — gated by a
//     shared-secret header.
//   - The admin UI server function (adminRunRssIngest) — gated by an
//     authenticated admin session.
import { slugify } from "@/lib/syndication";
import { decodeEntities } from "@/lib/decode-entities";
import { siteDomain } from "@/lib/city";

interface ParsedItem {
  title: string;
  link: string;
  guid: string;
  description: string | null;
  pubDate: string | null;
}

function stripCdata(s: string): string {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
}

function stripHtml(s: string): string {
  return decodeEntities(decodeEntities(stripCdata(s).replace(/<[^>]+>/g, " ")))
    .replace(/\s+/g, " ")
    .trim();
}

function pick(block: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = block.match(re);
  return m ? decodeEntities(m[1]) : null;
}

function pickAtomLink(block: string): string | null {
  const m = block.match(/<link[^>]+href=["']([^"']+)["'][^>]*\/?>/i);
  return m ? decodeEntities(m[1]) : null;
}

function normaliseLink(raw: string): string {
  let s = raw.trim();
  try {
    const u = new URL(s);
    u.hash = "";
    const drop = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "gclid"];
    drop.forEach((k) => u.searchParams.delete(k));
    s = u.toString();
  } catch {
    /* fall through */
  }
  return s.replace(/\/+$/, "");
}

function parseFeed(xml: string): ParsedItem[] {
  const items: ParsedItem[] = [];
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>|<entry[\s>][\s\S]*?<\/entry>/gi) ?? [];
  for (const block of blocks.slice(0, 50)) {
    const title = pick(block, "title");
    const link = pick(block, "link") || pickAtomLink(block);
    if (!title || !link) continue;
    const guidRaw = pick(block, "guid") || pick(block, "id") || link;
    const description = pick(block, "description") || pick(block, "summary") || pick(block, "content");
    const pubDate = pick(block, "pubDate") || pick(block, "published") || pick(block, "updated");
    items.push({
      title: stripHtml(title).slice(0, 300),
      link: normaliseLink(link),
      guid: guidRaw.trim(),
      description: description ? stripHtml(description).slice(0, 600) : null,
      pubDate: pubDate ? pubDate.trim() : null,
    });
  }
  return items;
}

function toIso(s: string | null): string | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

async function ingestOne(
  supabaseAdmin: any,
  source: { id: string; name: string; feed_url: string },
) {
  let fetched = 0;
  let inserted = 0;
  try {
    const res = await fetch(source.feed_url, {
      headers: {
        "User-Agent": `DailyNetworkBot/1.0 (+${siteDomain()})`,
        Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.5",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    const parsed = parseFeed(xml);

    const seen = new Set<string>();
    const items = parsed.filter((it) => {
      if (seen.has(it.link)) return false;
      seen.add(it.link);
      return true;
    });
    fetched = items.length;

    if (items.length > 0) {
      const links = items.map((i) => i.link);
      const guids = items.map((i) => i.guid);
      const { data: existing } = await supabaseAdmin
        .from("syndicated_stories")
        .select("link,guid")
        .eq("source_id", source.id)
        .or(`link.in.(${links.map((l) => `"${l.replace(/"/g, '\\"')}"`).join(",")}),guid.in.(${guids.map((g) => `"${g.replace(/"/g, '\\"')}"`).join(",")})`);
      const existingLinks = new Set<string>((existing ?? []).map((r: any) => r.link));
      const existingGuids = new Set<string>((existing ?? []).map((r: any) => r.guid));

      for (const it of items) {
        if (existingLinks.has(it.link) || existingGuids.has(it.guid)) continue;
        const slugBase = slugify(it.title) || "story";
        const slug = `${slugify(source.name)}-${slugBase}-${it.guid.slice(-8).replace(/[^a-z0-9]/gi, "")}`;
        const row = {
          source_id: source.id,
          guid: it.guid,
          title: it.title,
          dek: it.description,
          link: it.link,
          source_published_at: toIso(it.pubDate),
          slug,
          status: "live" as const,
        };
        const { error } = await supabaseAdmin.from("syndicated_stories").insert(row);
        if (!error) {
          inserted += 1;
          existingLinks.add(it.link);
          existingGuids.add(it.guid);
        }
      }
    }

    await supabaseAdmin
      .from("syndication_sources")
      .update({
        last_fetched_at: new Date().toISOString(),
        last_error: null,
        last_fetched_count: fetched,
        last_inserted_count: inserted,
      })
      .eq("id", source.id);
    return { source: source.name, fetched, inserted, error: null };
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    await supabaseAdmin
      .from("syndication_sources")
      .update({
        last_fetched_at: new Date().toISOString(),
        last_error: msg,
        last_fetched_count: fetched,
        last_inserted_count: inserted,
      })
      .eq("id", source.id);
    return { source: source.name, fetched, inserted, error: msg };
  }
}

export async function runRssIngest() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: sources, error } = await supabaseAdmin
    .from("syndication_sources")
    .select("id,name,feed_url,active")
    .eq("active", true);
  if (error) throw new Error(error.message);
  const results = await Promise.all(
    (sources ?? []).map((s: any) => ingestOne(supabaseAdmin, s)),
  );
  return { ok: true, ran_at: new Date().toISOString(), results };
}
