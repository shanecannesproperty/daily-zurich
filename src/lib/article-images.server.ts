// Server-only: background article image acquisition. When the homepage loads
// and discovers articles missing hero_image, this module searches free image
// sources (Openverse, Wikimedia) for relevant photos and writes them back to
// the articles table. Runs fire-and-forget so it never blocks page rendering.
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/integrations/supabase/config";
import { citySlug, cityName, cityRegion, siteDomain } from "@/lib/city";
import { visionJudge } from "@/lib/vision-judge.server";

const FETCH_TIMEOUT_MS = 6000;

// Quality gates for candidate images. Hero images render in wide card headers,
// so portrait scans (book covers, posters, documents) are never appropriate —
// even when they are valid, large JPEGs. The 1917 library-book scan that landed
// on the rates/land-tax article (1280x2278) is exactly what these reject.
const MIN_WIDTH = 800;
const MIN_ASPECT = 1.2; // width / height — reject portrait/square images

// Whole words in a filename that signal scanned text or non-photographic
// assets rather than a usable photo. Matched against a normalized filename
// (see isBadFilename) where separators like "_" become spaces, so word
// boundaries work and substrings such as "recovery"/"documentary" don't
// trigger false positives.
const BAD_FILENAME_RE =
  /\b(?:logo|icon|map|coat of arms|flag|book|cover|page|scan|manuscript|document|letter|title page|frontispiece|plate|plan|diagram|chart|poster|stamp|seal|engraving|drawing|sketch|woodcut|lithograph|pdf)\b/i;
const RETIRED_IMAGE_HOSTS = new Set(["source.unsplash.com"]);

function isRetiredImageUrl(imageUrl: string): boolean {
  try {
    return RETIRED_IMAGE_HOSTS.has(new URL(imageUrl).hostname.toLowerCase());
  } catch {
    return true;
  }
}

function isBadFilename(fname: string): boolean {
  const normalized = fname.toLowerCase().replace(/[^a-z0-9]+/g, " ");
  return BAD_FILENAME_RE.test(normalized);
}

function isAcceptableSize(width?: number, height?: number): boolean {
  if (!width || !height) return true; // unknown dimensions — defer to probe
  if (width < MIN_WIDTH) return false;
  if (width / height < MIN_ASPECT) return false;
  return true;
}

interface ArticleStub {
  id: string;
  title: string;
  category: string | null;
  hero_image: string | null;
}

// A found image plus its CC/public-domain attribution. credit is the display
// string (e.g. "Conall / CC BY 2.0"); source is the licence/source page URL.
interface ImageHit {
  url: string;
  credit: string | null;
  source: string | null;
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
function buildCredit(creator?: string, licenseLabel?: string): string | null {
  const name = (creator ?? "").trim();
  const lic = (licenseLabel ?? "").trim();
  if (name && lic) return `${name} / ${lic}`;
  return name || lic || null;
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

// Category-appropriate search phrases for when title keywords are too specific.
function categoryFallbackQueries(): Record<string, string[]> {
  const city = cityName();
  return {
    finance: ["money finance budget", "property house australia"],
    community: ["people community neighbourhood", `${city} suburb street`],
    news: ["newspaper headlines press", `${city} city centre`],
    sport: ["sports stadium field", "australian sport athlete"],
    federal: ["parliament house canberra", "government building australia"],
    property: ["australian house suburb", "residential neighbourhood aerial"],
    wellness: ["people walking park wellness", "fitness group outdoors australia"],
    longevity: ["healthy older adults walking", "wellness exercise outdoors"],
    business: ["shopfront office modern", "business meeting workspace"],
  };
}

function buildQueries(title: string, category: string | null): string[] {
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
    "city",
  ]);
  const tokens = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stopwords.has(w));

  const queries: string[] = [];
  if (tokens.length >= 3) queries.push(tokens.slice(0, 3).join(" "));
  if (tokens.length >= 2) queries.push(tokens.slice(0, 2).join(" "));
  const cfq = categoryFallbackQueries();
  if (category && cfq[category]) {
    queries.push(...cfq[category]);
  }
  if (tokens.length >= 1) queries.push(tokens[0]);

  const seen = new Set<string>();
  return queries.filter((q) => {
    const norm = q.trim().toLowerCase();
    if (!norm || seen.has(norm)) return false;
    seen.add(norm);
    return true;
  });
}

async function timedFetch(url: string): Promise<Response | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": `DailyNetworkBot/1.0 (+${siteDomain()})`,
        Accept: "application/json",
      },
    });
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function searchOpenverse(query: string): Promise<ImageHit[]> {
  const u = new URL("https://api.openverse.org/v1/images/");
  u.searchParams.set("q", query);
  u.searchParams.set("page_size", "6");
  u.searchParams.set("aspect_ratio", "wide");
  u.searchParams.set("license_type", "commercial,modification");
  const r = await timedFetch(u.toString());
  if (!r || !r.ok) return [];
  const json = (await r.json().catch(() => null)) as {
    results?: Array<{
      url?: string;
      width?: number;
      height?: number;
      creator?: string;
      license?: string;
      license_version?: string;
      foreign_landing_url?: string;
    }>;
  } | null;
  return (json?.results ?? [])
    .filter((x) => isAcceptableSize(x.width, x.height))
    .filter((x): x is { url: string } & typeof x => typeof x.url === "string")
    .map((x) => ({
      url: x.url,
      credit: buildCredit(x.creator, formatLicense(x.license, x.license_version)),
      source: x.foreign_landing_url ?? null,
    }));
}

async function searchWikimedia(query: string): Promise<ImageHit[]> {
  const su = new URL("https://commons.wikimedia.org/w/api.php");
  su.searchParams.set("action", "query");
  su.searchParams.set("list", "search");
  su.searchParams.set("srnamespace", "6");
  su.searchParams.set("srlimit", "4");
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
            width?: number;
            height?: number;
          }>;
        }
      >;
    };
  } | null;
  const pages = ij?.query?.pages ?? {};
  const out: ImageHit[] = [];
  for (const page of Object.values(pages)) {
    const info = page.imageinfo?.[0];
    if (!info?.url) continue;
    const fname = (page.title ?? "").replace(/^File:/, "");
    if (/\.svg$/i.test(info.url)) continue;
    if (isBadFilename(fname)) continue;
    if (!isAcceptableSize(info.width, info.height)) continue;
    const meta = info.extmetadata ?? {};
    const credit = buildCredit(
      stripHtml(meta.Artist?.value),
      (meta.LicenseShortName?.value ?? "").trim(),
    );
    const source = info.descriptionurl ?? `https://commons.wikimedia.org/wiki/${page.title ?? ""}`;
    out.push({ url: info.thumburl ?? info.url, credit, source });
  }
  return out;
}

interface ProbeResult {
  ok: boolean;
  status: number | null;
  contentType: string | null;
  reason?: string;
}

async function probeImage(imageUrl: string): Promise<boolean> {
  const p = await probeImageDetailed(imageUrl);
  return p.ok;
}

// Fetch an image URL for probing with a descriptive User-Agent and a bounded
// timeout. Both matter: Wikimedia's upload CDN (where most hero candidates and
// existing heroes are hosted) returns 403 to requests that send no User-Agent,
// so a bare fetch() makes valid photos look "broken" — they then get rejected
// at acquisition and, worse, pruned to NULL during the maintenance pass and
// re-acquired in an endless churn. The timeout stops a single slow host from
// stalling the whole batch past the Worker CPU/time limit.
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

async function probeImageDetailed(imageUrl: string): Promise<ProbeResult> {
  if (isRetiredImageUrl(imageUrl)) {
    return { ok: false, status: null, contentType: null, reason: "retired_image_host" };
  }
  let res = await probeFetch(imageUrl, "HEAD");
  if (!res || !res.ok || !res.headers.get("content-type")) {
    res = await probeFetch(imageUrl, "GET");
  }
  if (!res) return { ok: false, status: null, contentType: null, reason: "fetch_error" };
  const ct = (res.headers.get("content-type") ?? "").toLowerCase();
  if (!res.ok) return { ok: false, status: res.status, contentType: ct || null, reason: `http_${res.status}` };
  if (!ct.startsWith("image/") || ct.includes("svg")) {
    return { ok: false, status: res.status, contentType: ct || null, reason: "not_image" };
  }
  const len = Number(res.headers.get("content-length") ?? "0");
  if (len > 0 && len < 8 * 1024) {
    return { ok: false, status: res.status, contentType: ct, reason: "too_small" };
  }
  return { ok: true, status: res.status, contentType: ct };
}


// LLM relevance check. Asks a vision-capable model whether the image plausibly
// illustrates the article FOR THIS CITY. Returns true when it fits, false when
// it doesn't, and true on any error/outage so we don't churn good photos.
// The location rule rejects photos showing signage/landmarks from another city
// (e.g. a Sydney "Woollahra Hotel" on a Canberra article).
async function isImageRelevant(
  title: string,
  category: string | null,
  imageUrl: string,
): Promise<boolean> {
  const city = cityName();
  const region = cityRegion();
  const system =
    `You judge whether a photo is suitable to illustrate a news article in The Daily ${city} (${city}, ${region}, Australia). ` +
    `Reply with exactly one word: YES or NO. Say NO if the photo is blank, black, white, grey, or otherwise featureless; or if it is generic stock unrelated to the headline, the wrong subject, a logo/diagram/document scan, or shows a location other than ${city}. ` +
    `Read any visible signage, business or building names, and street/suburb signs: if they name a different city, suburb, or state than ${city}, answer NO even if the subject type fits.`;
  const userText = `Headline: ${title}\nCategory: ${category ?? "n/a"}\nArticle city: ${city}, ${region}\nDoes this photo fit this ${city} article?`;
  const txt = await visionJudge(system, userText, imageUrl, { maxTokens: 8, timeoutMs: 12000 });
  // null => model unavailable/errored: keep the photo (benefit of the doubt).
  if (txt == null) return true;
  return !txt.trim().toUpperCase().startsWith("NO");
}

export interface AuditEntry {
  article_id: string | null;
  city: string;
  article_title: string | null;
  action: "probe" | "replace" | "prune" | "reject";
  prev_url: string | null;
  new_url: string | null;
  probe_status: number | null;
  probe_content_type: string | null;
  source: string | null;
  reason: string | null;
  visual_check: string | null;
}

type AuditLogger = (entry: AuditEntry) => void;

interface FoundImage extends ImageHit {
  probe_status: number | null;
  probe_content_type: string | null;
}

async function findImageForArticle(
  articleId: string,
  title: string,
  category: string | null,
  usedUrls: Set<string>,
  log: AuditLogger,
  city: string,
): Promise<FoundImage | null> {
  const queries = buildQueries(title, category);
  const seen = new Set<string>();
  for (const query of queries) {
    const [ovHits, wmHits] = await Promise.all([
      searchOpenverse(query).catch(() => [] as ImageHit[]),
      searchWikimedia(query).catch(() => [] as ImageHit[]),
    ]);
    for (const hit of [...ovHits, ...wmHits]) {
      if (seen.has(hit.url) || usedUrls.has(hit.url)) continue;
      seen.add(hit.url);
      const probe = await probeImageDetailed(hit.url);
      log({
        article_id: articleId,
        city,
        article_title: title,
        action: "probe",
        prev_url: null,
        new_url: hit.url,
        probe_status: probe.status,
        probe_content_type: probe.contentType,
        source: hit.source,
        reason: probe.reason ?? (probe.ok ? "probe_ok" : "probe_failed"),
        visual_check: null,
      });
      if (!probe.ok) continue;
      // Lightweight visual check on the candidate thumbnail. The vision model
      // inspects the actual image bytes that providers (Openverse / Wikimedia
      // thumbs) deliver and rejects mismatched crops or wrong subjects before
      // we accept the URL into the articles table.
      const fits = await isImageRelevant(title, category, hit.url);
      if (!fits) {
        log({
          article_id: articleId,
          city,
          article_title: title,
          action: "reject",
          prev_url: null,
          new_url: hit.url,
          probe_status: probe.status,
          probe_content_type: probe.contentType,
          source: hit.source,
          reason: "visual_mismatch",
          visual_check: "NO",
        });
        continue;
      }
      return {
        ...hit,
        probe_status: probe.status,
        probe_content_type: probe.contentType,
      };
    }
  }
  return null;
}


export type AcquireStatus = "updated" | "no-candidates" | "error" | "skipped";

export interface AcquireOutcome {
  id: string;
  title: string;
  status: AcquireStatus;
  hero_image?: string;
  detail?: string;
}

export interface AcquireSummary {
  ok: boolean;
  ran_at: string;
  processed: number;
  updated: number;
  failed: number;
  pruned?: number;
  pruned_broken?: number;
  pruned_irrelevant?: number;
  remaining_needing: number;
  outcomes: AcquireOutcome[];
  detail?: string;
}


/**
 * Synchronously (awaited) acquire hero images for every published article
 * in the current city that is missing one. Designed to be invoked by a scheduled job
 * (pg_cron -> /api/public/hooks/acquire-article-images) rather than as a
 * fire-and-forget background task on page render — Cloudflare Workers terminate
 * un-awaited background work before it finishes, which is why the previous
 * fire-and-forget approach only ever populated a fraction of articles.
 */
export async function acquireMissingArticleImages(limit = 20): Promise<AcquireSummary> {
  const ran_at = new Date().toISOString();
  const CITY = citySlug();
  // Always target the canonical project that backs the app's reads. Relying on
  // process.env.SUPABASE_URL silently pointed acquisition at a different project
  // (whose schema lacks the articles table), so every run failed with PGRST205
  // and no article ever got a hero image.
  const url = SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !serviceKey) {
    return {
      ok: false,
      ran_at,
      processed: 0,
      updated: 0,
      failed: 0,
      remaining_needing: 0,
      outcomes: [],
      detail: "missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    };
  }

  const client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });

  const batch = Math.max(1, Math.min(50, limit));

  // Immutable audit log: every probe, replacement, prune, and rejection is
  // queued here and flushed in a single insert at the end of the run.
  const auditQueue: AuditEntry[] = [];
  const log: AuditLogger = (e) => {
    auditQueue.push(e);
  };

  // Autonomously prune dead OR irrelevant hero images so the acquisition pass
  // below re-fetches a replacement. We probe a rolling sample of existing
  // hero images each run: HEAD request first (cheap), then a vision LLM
  // relevance check for survivors (capped per run to bound cost). Anything
  // that 404s, returns non-image content, is too small, or doesn't match
  // the headline is cleared back to NULL.
  let pruned = 0;
  let pruned_broken = 0;
  let pruned_irrelevant = 0;
  try {
    const { data: existing } = await client
      .from("articles")
      .select("id,title,category,hero_image,hero_image_source")
      .eq("city", CITY)
      .eq("is_published", true)
      // Never auto-manage sponsored / advertiser articles: their hero is paid
      // creative supplied by the advertiser (often hosted on the advertiser's
      // own domain), so the agent must not probe-prune or replace it.
      .neq("category", "sponsored")
      .or("is_sponsored.is.null,is_sponsored.eq.false")
      // Only ever prune/replace heroes THIS agent acquired. Agent-acquired
      // images always carry a hero_image_source (the licence/source URL);
      // a hero set by hand in the admin editor has a NULL source. Editorial
      // choices are sovereign — never silently null or swap an editor's photo,
      // which is what made "photos disappear when I publish" happen.
      .not("hero_image_source", "is", null)
      .not("hero_image", "is", null)
      .neq("hero_image", "")
      .order("updated_at", { ascending: true, nullsFirst: true })
      .limit(Math.max(batch * 2, 30));
    const rows = (existing ?? []) as {
      id: string;
      title: string;
      category: string | null;
      hero_image: string | null;
      hero_image_source: string | null;
    }[];
    // Hard cap on vision-LLM calls per run; HEAD probes are unbounded.
    const RELEVANCE_BUDGET = 25;
    let relevanceChecked = 0;
    for (const row of rows) {
      if (!row.hero_image) continue;
      const probe = await probeImageDetailed(row.hero_image);
      log({
        article_id: row.id,
        city: CITY,
        article_title: row.title,
        action: "probe",
        prev_url: row.hero_image,
        new_url: null,
        probe_status: probe.status,
        probe_content_type: probe.contentType,
        source: row.hero_image_source,
        reason: probe.reason ?? (probe.ok ? "probe_ok" : "probe_failed"),
        visual_check: null,
      });
      let drop = !probe.ok;
      let reason: "broken" | "irrelevant" | null = drop ? "broken" : null;
      let visualLabel: string | null = null;
      if (probe.ok && relevanceChecked < RELEVANCE_BUDGET) {
        relevanceChecked += 1;
        const fits = await isImageRelevant(row.title, row.category, row.hero_image);
        visualLabel = fits ? "YES" : "NO";
        if (!fits) {
          drop = true;
          reason = "irrelevant";
        }
      }
      if (!drop) continue;
      const { error: clearErr } = await client
        .from("articles")
        .update({ hero_image: null, hero_image_credit: null, hero_image_source: null })
        .eq("city", CITY)
        .eq("id", row.id);
      if (!clearErr) {
        pruned += 1;
        if (reason === "broken") pruned_broken += 1;
        else if (reason === "irrelevant") pruned_irrelevant += 1;
        log({
          article_id: row.id,
          city: CITY,
          article_title: row.title,
          action: "prune",
          prev_url: row.hero_image,
          new_url: null,
          probe_status: probe.status,
          probe_content_type: probe.contentType,
          source: row.hero_image_source,
          reason: reason ?? "drop",
          visual_check: visualLabel,
        });
      }
    }
  } catch {
    /* pruning is best-effort; acquisition still runs */
  }




  // Filter at the DB level so the job never starves older articles once the
  // newest N all have covers — only published articles still missing a hero are
  // fetched, newest first, capped to this run's batch size.
  const { data, error } = await client
    .from("articles")
    .select("id,title,category,hero_image")
    .eq("city", CITY)
    .eq("is_published", true)
    // Sponsored / advertiser articles bring their own creative — never acquire.
    .neq("category", "sponsored")
    .or("is_sponsored.is.null,is_sponsored.eq.false")
    .or("hero_image.is.null,hero_image.eq.")
    .order("published_at", { ascending: false })
    .limit(batch);
  if (error) {
    return {
      ok: false,
      ran_at,
      processed: 0,
      updated: 0,
      failed: 0,
      remaining_needing: 0,
      outcomes: [],
      detail: error.message,
    };
  }

  const missing = (data ?? []) as ArticleStub[];

  // Hero URLs already in use across the site, for de-duplication.
  const usedUrls = new Set<string>();
  const { data: used, error: usedErr } = await client
    .from("articles")
    .select("hero_image")
    .eq("city", CITY)
    .not("hero_image", "is", null)
    .neq("hero_image", "")
    .limit(5000);
  if (usedErr) {
    return {
      ok: false,
      ran_at,
      processed: 0,
      updated: 0,
      failed: 0,
      remaining_needing: missing.length,
      outcomes: [],
      detail: `used-urls query failed: ${usedErr.message}`,
    };
  }
  for (const a of (used ?? []) as { hero_image: string | null }[]) {
    if (a.hero_image) usedUrls.add(a.hero_image);
  }

  const outcomes: AcquireOutcome[] = [];
  for (const art of missing) {
    try {
      const hit = await findImageForArticle(art.id, art.title, art.category, usedUrls, log, CITY);
      if (!hit) {
        outcomes.push({ id: art.id, title: art.title, status: "no-candidates" });
        continue;
      }
      const { error: upErr } = await client
        .from("articles")
        .update({
          hero_image: hit.url,
          hero_image_credit: hit.credit,
          hero_image_source: hit.source,
        })
        .eq("city", CITY)
        .eq("id", art.id);
      if (upErr) {
        outcomes.push({ id: art.id, title: art.title, status: "error", detail: upErr.message });
        continue;
      }
      usedUrls.add(hit.url);
      outcomes.push({ id: art.id, title: art.title, status: "updated", hero_image: hit.url });
      log({
        article_id: art.id,
        city: CITY,
        article_title: art.title,
        action: "replace",
        prev_url: art.hero_image ?? null,
        new_url: hit.url,
        probe_status: hit.probe_status,
        probe_content_type: hit.probe_content_type,
        source: hit.source,
        reason: "accepted",
        visual_check: "YES",
      });
    } catch (err) {
      outcomes.push({
        id: art.id,
        title: art.title,
        status: "error",
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Flush the audit log. Best-effort: a failed insert never poisons the run.
  if (auditQueue.length > 0) {
    try {
      await client.from("article_image_audit").insert(auditQueue);
    } catch {
      /* audit insert failed; acquisition results still returned */
    }
  }


  const updated = outcomes.filter((o) => o.status === "updated").length;

  // Exact count of articles still missing a hero after this run.
  // Exclude sponsored articles (is_sponsored=true); the acquisition loop skips them.
  const { count: remainingCount } = await client
    .from("articles")
    .select("id", { count: "exact", head: true })
    .eq("city", CITY)
    .eq("is_published", true)
    .or("is_sponsored.is.null,is_sponsored.eq.false")
    .or("hero_image.is.null,hero_image.eq.");

  return {
    ok: true,
    ran_at,
    processed: outcomes.length,
    updated,
    failed: outcomes.length - updated,
    pruned,
    pruned_broken,
    pruned_irrelevant,
    remaining_needing: remainingCount ?? Math.max(0, missing.length - updated),
    outcomes,
  };
}

