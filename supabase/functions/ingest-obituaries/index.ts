// ingest-obituaries: scrapes per-city funeral home "recent notices" pages and
// saves new notices as pending (status='pending', is_published=false) for human
// review. NEVER auto-publishes. NEVER fabricates a notice. Real deaths only —
// all content comes from the funeral home's own public website.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Per-city list of funeral home "recent notices" pages to scrape.
// Format: { city, url, source_name, parser }
// All URLs are public-facing pages on the funeral home's own website.
const SOURCES: Array<{
  city: string;
  url: string;
  source_name: string;
}> = [
  // Canberra
  {
    city: "canberra",
    url: "https://www.tobinbrothers.com.au/recent-notices/canberra",
    source_name: "Tobin Brothers Funerals",
  },
  {
    city: "canberra",
    url: "https://www.whiteladyfunerals.com.au/recent-notices/canberra",
    source_name: "White Lady Funerals",
  },
  {
    city: "canberra",
    url: "https://www.gregorys.com.au/recent-notices",
    source_name: "Gregorys Funerals",
  },
  // Sydney
  {
    city: "sydney",
    url: "https://www.tobinbrothers.com.au/recent-notices/sydney",
    source_name: "Tobin Brothers Funerals",
  },
  {
    city: "sydney",
    url: "https://www.whiteladyfunerals.com.au/recent-notices/sydney",
    source_name: "White Lady Funerals",
  },
  {
    city: "sydney",
    url: "https://www.simplicityfunerals.com.au/recent-notices/sydney",
    source_name: "Simplicity Funerals",
  },
  // Melbourne
  {
    city: "melbourne",
    url: "https://www.nationalfunerals.com.au/recent-notices/melbourne",
    source_name: "National Funerals",
  },
  {
    city: "melbourne",
    url: "https://www.whiteladyfunerals.com.au/recent-notices/melbourne",
    source_name: "White Lady Funerals",
  },
  // Brisbane
  {
    city: "brisbane",
    url: "https://www.simplicityfunerals.com.au/recent-notices/brisbane",
    source_name: "Simplicity Funerals",
  },
  // Adelaide
  {
    city: "adelaide",
    url: "https://www.simplicityfunerals.com.au/recent-notices/adelaide",
    source_name: "Simplicity Funerals",
  },
  // Perth
  {
    city: "perth",
    url: "https://www.simplicityfunerals.com.au/recent-notices/perth",
    source_name: "Simplicity Funerals",
  },
];

// Extract name + basic details from a funeral home notice page.
// This uses simple heuristics — real names appear in <h1>/<h2> tags.
// We extract the raw text only; body_html is NOT scraped (family privacy).
function extractNoticesFromHtml(
  html: string,
  source_name: string,
  source_url: string,
  city: string,
): Array<{
  city: string;
  full_name: string;
  notice_type: string;
  funeral_director: string;
  funeral_director_url: string;
  source_url: string;
  status: string;
  is_published: boolean;
}> {
  const notices: ReturnType<typeof extractNoticesFromHtml> = [];

  // Match name headings — h1/h2/h3 tags with person names
  const headingPattern = /<h[123][^>]*>\s*([A-Z][a-zA-Z]+(?: [A-Z][a-zA-Z]+){1,4})\s*<\/h[123]>/g;
  const seen = new Set<string>();
  let m: RegExpExecArray | null;

  while ((m = headingPattern.exec(html)) !== null) {
    const name = m[1].trim();
    // Skip generic headings (short, all-caps section titles)
    if (name.length < 5 || name === name.toUpperCase()) continue;
    // Skip duplicates
    if (seen.has(name)) continue;
    seen.add(name);

    notices.push({
      city,
      full_name: name,
      notice_type: "death_notice",
      funeral_director: source_name,
      funeral_director_url: new URL(source_url).origin,
      source_url,
      status: "pending",
      is_published: false,
    });
  }

  return notices;
}

Deno.serve(async (req) => {
  // Only accept POST or cron trigger
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), { status: 405 });
  }

  const results: { city: string; source: string; inserted: number; skipped: number; error?: string }[] = [];

  for (const source of SOURCES) {
    try {
      const res = await fetch(source.url, {
        headers: {
          "User-Agent": "DailyNetworkBot/1.0 (community notice aggregation; contact@dailycanberra.com.au)",
          Accept: "text/html",
        },
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        results.push({ city: source.city, source: source.source_name, inserted: 0, skipped: 0, error: `HTTP ${res.status}` });
        continue;
      }

      const html = await res.text();
      const notices = extractNoticesFromHtml(html, source.source_name, source.url, source.city);

      let inserted = 0;
      let skipped = 0;

      for (const notice of notices) {
        // Check if we already have this name+city+funeral_director combo
        const { data: existing } = await supabase
          .from("obituaries")
          .select("id")
          .eq("city", notice.city)
          .eq("full_name", notice.full_name)
          .eq("funeral_director", notice.funeral_director)
          .limit(1);

        if (existing && existing.length > 0) {
          skipped++;
          continue;
        }

        // Also check obituary_submissions to avoid double-queuing
        const { data: existingSub } = await supabase
          .from("obituary_submissions")
          .select("id")
          .eq("city", notice.city)
          .eq("full_name", notice.full_name)
          .eq("funeral_director", notice.funeral_director)
          .limit(1);

        if (existingSub && existingSub.length > 0) {
          skipped++;
          continue;
        }

        const { error: insErr } = await supabase.from("obituaries").insert(notice);
        if (insErr) {
          console.error(`[ingest-obituaries] insert error for ${notice.full_name}:`, insErr.message);
          skipped++;
        } else {
          inserted++;
        }
      }

      results.push({ city: source.city, source: source.source_name, inserted, skipped });
    } catch (err) {
      results.push({
        city: source.city,
        source: source.source_name,
        inserted: 0,
        skipped: 0,
        error: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  const totalInserted = results.reduce((s, r) => s + r.inserted, 0);
  console.log(`[ingest-obituaries] done — ${totalInserted} new notices queued for review`);

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { "Content-Type": "application/json" },
  });
});
