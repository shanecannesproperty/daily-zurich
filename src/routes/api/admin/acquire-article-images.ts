// Admin-only server route. POST triggers a batch image acquisition pass for
// articles with missing / empty hero_image.
// Caller must send Authorization: Bearer <supabase access token> for the
// signed-in admin user (shane@spexperts.com.au).
//
// Body (all optional):
//   article_id  string         single-article acquisition (force re-acquire)
//   force       boolean        ignore existing hero_image when single-article
//   limit       number         batch size (default 10, max 50)
//
// Acquisition pipeline:
//   1. Build search queries from article title + category
//   2. Search Openverse (CC-licensed landscape photos)
//   3. Fallback to Wikimedia Commons
//   4. Probe candidate URL: must be image/* with reasonable size
//   5. Reject duplicates already in use
//   6. Write hero_image back to articles table (city-scoped via citySlug())
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { citySlug, cityName, siteDomain } from "@/lib/city";

const ADMIN_EMAIL = "shane@spexperts.com.au";
const BATCH_LIMIT = 10;

interface ArticleLite {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  hero_image: string | null;
}

type OutcomeStatus = "updated" | "no-candidates" | "rejected" | "duplicate" | "fetch-error";

interface Candidate {
  kind: "openverse" | "wikimedia" | "pexels";
  url: string;
  // CC/public-domain attribution captured from the source provider so the
  // article page can display the required credit. credit is the display string
  // (e.g. "Conall / CC BY 2.0"); source is the licence/source page URL.
  credit?: string;
  source?: string;
  accepted?: boolean;
  reject_reason?: string;
}

interface Outcome {
  id: string;
  slug: string;
  title: string;
  status: OutcomeStatus;
  detail?: string;
  hero_image?: string;
  candidates: Candidate[];
  ts: string;
}

export const Route = createFileRoute("/api/admin/acquire-article-images")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const CITY = citySlug();
        const url = process.env.SUPABASE_URL!;
        const publishable = process.env.SUPABASE_PUBLISHABLE_KEY!;
        const auth = request.headers.get("authorization") ?? "";
        const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : "";
        if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const userClient = createClient(url, publishable, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
        });
        const { data: userRes, error: userErr } = await userClient.auth.getUser(token);
        if (userErr || userRes.user?.email !== ADMIN_EMAIL) {
          return Response.json({ error: "Forbidden" }, { status: 403 });
        }

        let body: {
          article_id?: string;
          force?: boolean;
          limit?: number;
        } = {};
        try {
          body = (await request.json()) as typeof body;
        } catch {
          /* no body */
        }
        const limit = Math.max(1, Math.min(50, body.limit ?? BATCH_LIMIT));

        const { data: rows, error: pullErr } = await userClient
          .from("articles")
          .select("id,slug,title,category,hero_image")
          .eq("city", CITY)
          .eq("is_published", true)
          .order("published_at", { ascending: false })
          .limit(200);
        if (pullErr) return Response.json({ error: pullErr.message }, { status: 500 });
        const articles = (rows ?? []) as ArticleLite[];

        const used = new Set<string>();
        for (const a of articles) {
          if (a.hero_image) used.add(a.hero_image);
        }

        let needs: ArticleLite[];
        if (body.article_id) {
          const target = articles.find((a) => a.id === body.article_id);
          needs = target ? [target] : [];
          if (target && body.force && target.hero_image) {
            used.delete(target.hero_image);
          }
        } else {
          needs = articles
            .filter((a) => !a.hero_image || a.hero_image.trim() === "")
            .slice(0, limit);
        }

        const outcomes: Outcome[] = [];
        for (const art of needs) {
          const ts = new Date().toISOString();
          try {
            const candidates = await searchArticleImages(art.title, art.category);
            if (candidates.length === 0) {
              outcomes.push({
                id: art.id,
                slug: art.slug,
                title: art.title,
                status: "no-candidates",
                candidates: [],
                ts,
              });
              continue;
            }
            let accepted: string | undefined;
            let acceptedCredit: string | undefined;
            let acceptedSource: string | undefined;
            let lastDetail: string | undefined;
            for (const c of candidates) {
              if (used.has(c.url)) {
                c.reject_reason = "duplicate";
                continue;
              }
              const probe = await probeImage(c.url);
              if (!probe.ok) {
                c.reject_reason = probe.reason;
                lastDetail = probe.reason;
                continue;
              }
              c.accepted = true;
              accepted = c.url;
              acceptedCredit = c.credit;
              acceptedSource = c.source;
              break;
            }
            if (!accepted) {
              const dupOnly = candidates.every((c) => c.reject_reason === "duplicate");
              outcomes.push({
                id: art.id,
                slug: art.slug,
                title: art.title,
                status: dupOnly ? "duplicate" : "rejected",
                detail: lastDetail ?? candidates[0]?.reject_reason,
                candidates,
                ts,
              });
              continue;
            }
            const { error: upErr } = await userClient
              .from("articles")
              .update({
                hero_image: accepted,
                hero_image_credit: acceptedCredit ?? null,
                hero_image_source: acceptedSource ?? null,
              })
              .eq("city", CITY)
              .eq("id", art.id);
            if (upErr) {
              outcomes.push({
                id: art.id,
                slug: art.slug,
                title: art.title,
                status: "fetch-error",
                detail: upErr.message,
                candidates,
                ts,
              });
              continue;
            }
            used.add(accepted);
            outcomes.push({
              id: art.id,
              slug: art.slug,
              title: art.title,
              status: "updated",
              hero_image: accepted,
              candidates,
              ts,
            });
          } catch (err) {
            outcomes.push({
              id: art.id,
              slug: art.slug,
              title: art.title,
              status: "fetch-error",
              detail: err instanceof Error ? err.message : String(err),
              candidates: [],
              ts,
            });
          }
        }

        const updated = outcomes.filter((o) => o.status === "updated").length;
        return Response.json({
          processed: outcomes.length,
          updated,
          failed: outcomes.length - updated,
          remaining_needing: Math.max(
            0,
            articles.filter((a) => !a.hero_image || a.hero_image.trim() === "").length - updated,
          ),
          outcomes,
        });
      },
    },
  },
});

// --------------- Image search helpers ---------------

const FETCH_TIMEOUT_MS = 8000;

// Build topic-relevant queries from article title + category. These are
// descriptive phrases that match what stock/CC photo providers index.
function categoryQueries(): Record<string, string[]> {
  const city = cityName();
  return {
    finance: ["australian money currency", "financial planning documents"],
    community: ["community gathering people", "neighbourhood street scene"],
    news: [`${city} city skyline`, `${city} local news`],
    sport: ["australian sport stadium crowd", "outdoor sports field"],
    federal: ["parliament house canberra", "australian government building"],
    property: [`${city} suburb houses aerial`, "residential neighbourhood"],
    business: ["office workspace modern", "small business shopfront"],
  };
}

function buildSearchQueries(title: string, category: string | null): string[] {
  const stopwords = new Set([
    "the",
    "and",
    "for",
    "with",
    "from",
    "your",
    "this",
    "that",
    "into",
    "over",
    "how",
    "what",
    "why",
    "where",
    "when",
    "which",
    "guide",
    "explained",
    "practical",
    "complete",
    "best",
    "top",
    citySlug(),
    "act",
    "australia",
    "2026",
    "2025",
  ]);
  const tokens = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stopwords.has(w));

  const queries: string[] = [];
  // Full meaningful tokens
  if (tokens.length > 0) queries.push(tokens.slice(0, 4).join(" "));
  // First 2 meaningful keywords
  if (tokens.length >= 2) queries.push(tokens.slice(0, 2).join(" "));
  // Category-specific fallbacks
  const catQ = categoryQueries();
  if (category && catQ[category]) {
    queries.push(...catQ[category]);
  }
  // Single most descriptive keyword
  if (tokens.length >= 1) queries.push(tokens[0]);

  const seen = new Set<string>();
  return queries.filter((q) => {
    const norm = q.toLowerCase().trim();
    if (!norm || seen.has(norm)) return false;
    seen.add(norm);
    return true;
  });
}

async function timedFetch(url: string): Promise<Response | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": `DailyNetworkBot/1.0 (+${siteDomain()})`,
        Accept: "application/json",
      },
    });
    return r;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

// Build a human-readable licence label from Openverse's license + version
// (e.g. "by" + "2.0" -> "CC BY 2.0"; "pdm" -> "Public Domain Mark").
function formatLicense(license?: string, version?: string): string {
  const lic = (license ?? "").trim().toLowerCase();
  if (!lic) return "";
  if (lic === "pdm") return "Public Domain Mark";
  if (lic === "cc0") return "CC0";
  const label = `CC ${lic.toUpperCase().replace(/-/g, " ")}`;
  return version ? `${label} ${version}` : label;
}

// Compose the display credit string from creator + licence, omitting blanks.
function buildCredit(creator?: string, licenseLabel?: string): string {
  const name = (creator ?? "").trim();
  const lic = (licenseLabel ?? "").trim();
  if (name && lic) return `${name} / ${lic}`;
  return name || lic;
}

async function openverseSearch(query: string): Promise<Candidate[]> {
  const u = new URL("https://api.openverse.org/v1/images/");
  u.searchParams.set("q", query);
  u.searchParams.set("page_size", "8");
  u.searchParams.set("aspect_ratio", "wide");
  u.searchParams.set("license_type", "commercial,modification");
  const r = await timedFetch(u.toString());
  if (!r || !r.ok) return [];
  const json = (await r.json().catch(() => null)) as {
    results?: Array<{
      url?: string;
      thumbnail?: string;
      creator?: string;
      license?: string;
      license_version?: string;
      foreign_landing_url?: string;
    }>;
  } | null;
  return (json?.results ?? [])
    .filter((x) => typeof x.url === "string")
    .map((x) => {
      const credit = buildCredit(x.creator, formatLicense(x.license, x.license_version));
      return {
        kind: "openverse" as const,
        url: x.url!,
        ...(credit ? { credit } : {}),
        ...(x.foreign_landing_url ? { source: x.foreign_landing_url } : {}),
      };
    });
}

async function wikimediaSearch(query: string): Promise<Candidate[]> {
  const su = new URL("https://commons.wikimedia.org/w/api.php");
  su.searchParams.set("action", "query");
  su.searchParams.set("list", "search");
  su.searchParams.set("srnamespace", "6");
  su.searchParams.set("srlimit", "6");
  su.searchParams.set("srsearch", `${query} filetype:bitmap`);
  su.searchParams.set("format", "json");
  su.searchParams.set("origin", "*");
  const sr = await timedFetch(su.toString());
  if (!sr || !sr.ok) return [];
  const sj = (await sr.json().catch(() => null)) as {
    query?: { search?: Array<{ title?: string }> };
  } | null;
  const titles = (sj?.query?.search ?? []).map((s) => s.title).filter((t): t is string => !!t);
  if (titles.length === 0) return [];

  const iu = new URL("https://commons.wikimedia.org/w/api.php");
  iu.searchParams.set("action", "query");
  iu.searchParams.set("prop", "imageinfo");
  iu.searchParams.set("iiprop", "url|size|extmetadata");
  iu.searchParams.set("iiurlwidth", "1280");
  iu.searchParams.set("titles", titles.join("|"));
  iu.searchParams.set("format", "json");
  iu.searchParams.set("origin", "*");
  const ir = await timedFetch(iu.toString());
  if (!ir || !ir.ok) return [];
  const ij = (await ir.json().catch(() => null)) as {
    query?: {
      pages?: Record<
        string,
        {
          title?: string;
          imageinfo?: Array<{
            url?: string;
            thumburl?: string;
            descriptionurl?: string;
            extmetadata?: Record<string, { value?: string }>;
          }>;
        }
      >;
    };
  } | null;
  const pages = ij?.query?.pages ?? {};
  const out: Candidate[] = [];
  for (const page of Object.values(pages)) {
    const info = page.imageinfo?.[0];
    if (!info?.url) continue;
    const fname = (page.title ?? "").replace(/^File:/, "");
    if (/\.svg$/i.test(info.url)) continue;
    if (/logo|icon|map|coat[_ ]of[_ ]arms|flag/i.test(fname)) continue;
    const meta = info.extmetadata ?? {};
    const artist = stripHtml(meta.Artist?.value);
    const licShort = (meta.LicenseShortName?.value ?? "").trim();
    const credit = buildCredit(artist, licShort);
    const source = info.descriptionurl ?? `https://commons.wikimedia.org/wiki/${page.title ?? ""}`;
    out.push({
      kind: "wikimedia",
      url: info.thumburl ?? info.url,
      ...(credit ? { credit } : {}),
      ...(source ? { source } : {}),
    });
  }
  return out;
}

// Wikimedia's Artist extmetadata field arrives as an HTML fragment (often an
// anchor). Reduce it to plain text for the credit string.
function stripHtml(html?: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function searchArticleImages(title: string, category: string | null): Promise<Candidate[]> {
  const queries = buildSearchQueries(title, category);
  const seen = new Set<string>();
  const all: Candidate[] = [];
  for (const query of queries) {
    const [ov, wm] = await Promise.all([
      openverseSearch(query).catch(() => [] as Candidate[]),
      wikimediaSearch(query).catch(() => [] as Candidate[]),
    ]);
    for (const c of [...ov, ...wm]) {
      if (seen.has(c.url)) continue;
      seen.add(c.url);
      all.push(c);
    }
    if (all.length >= 12) break;
  }
  return all.slice(0, 16);
}

// Probe with a User-Agent and a timeout. Wikimedia's upload CDN serves most
// hero candidates and 403s requests that send no User-Agent, so a bare fetch()
// makes valid photos probe as "broken". The timeout bounds a slow host.
async function probeFetch(imageUrl: string, method: "HEAD" | "GET"): Promise<Response | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(imageUrl, {
      method,
      redirect: "follow",
      signal: ctrl.signal,
      headers: {
        "User-Agent": `DailyNetworkBot/1.0 (+${siteDomain()})`,
        Accept: "image/*,*/*;q=0.8",
      },
    });
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function probeImage(imageUrl: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  let res = await probeFetch(imageUrl, "HEAD");
  if (!res || !res.ok || !res.headers.get("content-type")) {
    res = await probeFetch(imageUrl, "GET");
  }
  if (!res) return { ok: false, reason: "fetch failed" };
  if (!res.ok) return { ok: false, reason: `http ${res.status}` };
  const ct = (res.headers.get("content-type") ?? "").toLowerCase();
  if (!ct.startsWith("image/"))
    return { ok: false, reason: `not-image (${ct || "no content-type"})` };
  if (ct.includes("svg")) return { ok: false, reason: "svg rejected" };
  const len = Number(res.headers.get("content-length") ?? "0");
  if (len > 0 && len < 8 * 1024) return { ok: false, reason: `too-small (${len}b)` };
  return { ok: true };
}
