// Autonomous photo verification agent — the world's best photo editor in code.
// Runs a multi-stage accuracy pipeline across every article and event photo:
//   1. HTTP liveness probe (HEAD → GET fallback)
//   2. Content-type & byte-size validation
//   3. Dimension / aspect-ratio gate
//   4. Retired-host detection
//   5. Vision LLM relevance scoring with editorial rubric (Gemini 2.5 Flash)
//   6. Auto-prune of failing images + immediate replacement via Openverse/Wikimedia
//
// Designed to be called by pg_cron every 5 minutes until coverage is complete,
// then daily for maintenance. Each run processes a bounded batch to stay within
// Cloudflare Worker CPU limits.
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/integrations/supabase/config";
import { citySlug, cityName, cityRegion, siteDomain } from "@/lib/city";
import { visionJudge } from "@/lib/vision-judge.server";

// ─── Constants ────────────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 8000;
const VISION_TIMEOUT_MS = 15000;
const MIN_WIDTH = 800;
const MIN_ASPECT = 1.2;
const MIN_CONTENT_LENGTH = 8 * 1024; // 8 KB
// Computed per call, NOT at module load: the per-request city (set via
// runWithCity in the cron hook) is only present in AsyncLocalStorage at call
// time. A module-level constant would freeze the default city's domain into
// every city's User-Agent.
function botUa(): string {
  return `DailyNetworkVerifier/2.0 (+${siteDomain()})`;
}

// Vision relevance threshold on a 0–10 scale. Images scoring below this are
// pruned and re-acquired. 6 = "plausibly related", 8 = "clearly relevant".
const VISION_SCORE_THRESHOLD = 6;

// Max vision LLM calls per run — each call costs tokens.
const VISION_BUDGET_ARTICLES = 30;
const VISION_BUDGET_EVENTS = 20;

const RETIRED_HOSTS = new Set(["source.unsplash.com"]);

const BAD_FILENAME_RE =
  /\b(?:logo|icon|map|coat of arms|flag|book|cover|page|scan|manuscript|document|letter|title page|frontispiece|plate|plan|diagram|chart|poster|stamp|seal|engraving|drawing|sketch|woodcut|lithograph|pdf)\b/i;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VerificationSummary {
  ok: boolean;
  ran_at: string;
  articles_checked: number;
  articles_pruned: number;
  articles_replaced: number;
  events_checked: number;
  events_pruned: number;
  events_replaced: number;
  remaining_articles_needing: number;
  remaining_events_needing: number;
  detail?: string;
}

interface ProbeResult {
  ok: boolean;
  status: number | null;
  contentType: string | null;
  reason?: string;
}

interface ImageHit {
  url: string;
  credit: string | null;
  source: string | null;
}

interface VisionScore {
  score: number; // 0–10
  reason: string;
  keep: boolean;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function isRetiredHost(url: string): boolean {
  try {
    return RETIRED_HOSTS.has(new URL(url).hostname.toLowerCase());
  } catch {
    return true;
  }
}

function isBadFilename(fname: string): boolean {
  const norm = fname.toLowerCase().replace(/[^a-z0-9]+/g, " ");
  return BAD_FILENAME_RE.test(norm);
}

function isAcceptableSize(w?: number, h?: number): boolean {
  if (!w || !h) return true;
  if (w < MIN_WIDTH) return false;
  if (w / h < MIN_ASPECT) return false;
  return true;
}

function isFallbackUrl(url: string): boolean {
  const city = citySlug();
  const lower = url.toLowerCase();
  return lower.includes(`${city}-fallback-tile`) || lower.includes(`/branding/${city}`);
}

// ─── HTTP probe ───────────────────────────────────────────────────────────────

async function timedFetch(url: string, init?: RequestInit): Promise<Response | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      signal: ctrl.signal,
      headers: { "User-Agent": botUa(), Accept: "*/*", ...((init?.headers as Record<string, string>) ?? {}) },
    });
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function probeImage(imageUrl: string): Promise<ProbeResult> {
  if (isRetiredHost(imageUrl)) {
    return { ok: false, status: null, contentType: null, reason: "retired_host" };
  }
  if (isFallbackUrl(imageUrl)) {
    return { ok: false, status: null, contentType: null, reason: "fallback_url" };
  }
  try {
    let res = await timedFetch(imageUrl, { method: "HEAD", redirect: "follow" });
    if (!res || !res.ok || !res.headers.get("content-type")) {
      res = await timedFetch(imageUrl, { method: "GET", redirect: "follow" });
    }
    if (!res) return { ok: false, status: null, contentType: null, reason: "timeout" };
    const ct = (res.headers.get("content-type") ?? "").toLowerCase();
    if (!res.ok) return { ok: false, status: res.status, contentType: ct || null, reason: `http_${res.status}` };
    if (!ct.startsWith("image/") || ct.includes("svg")) {
      return { ok: false, status: res.status, contentType: ct || null, reason: "not_image" };
    }
    const len = Number(res.headers.get("content-length") ?? "0");
    if (len > 0 && len < MIN_CONTENT_LENGTH) {
      return { ok: false, status: res.status, contentType: ct, reason: "too_small" };
    }
    return { ok: true, status: res.status, contentType: ct };
  } catch (err) {
    return { ok: false, status: null, contentType: null, reason: err instanceof Error ? err.message : "fetch_error" };
  }
}

// ─── Vision LLM: editorial rubric ─────────────────────────────────────────────
//
// Uses Gemini 2.5 Flash via the Lovable AI Gateway. Scores the image on a
// 0–10 editorial rubric designed to match what a professional news photo desk
// would approve:
//   10 = Perfect: subject matches headline, professional composition, no artifacts
//    8 = Good: clearly related, minor issues
//    6 = Acceptable: broadly on-topic but generic stock or marginal quality
//    4 = Poor: subject is tangential, generic, or misleading
//    2 = Bad: wrong subject, document scan, logo, map, meme
//    0 = Reject: completely unrelated or technically broken

// City/region-aware editorial rubric. The LOCATION RULE is the important
// addition: the model must read on-image signage and reject photos that show a
// landmark/business/suburb from somewhere other than this article's city — the
// failure that put a Sydney "Woollahra Hotel" photo on a Canberra article.
function visionSystemPrompt(): string {
  const city = cityName();
  const region = cityRegion();
  return `You are an expert news photo desk editor for The Daily ${city}, a local news site for ${city}, ${region}, Australia. You decide whether a photo is suitable to illustrate a specific article headline.

Score the photo from 0 to 10:
10 = Perfect: shows the exact subject of the headline, newsworthy
8  = Good: clearly related to the headline topic, suitable for publication
6  = Acceptable: on-topic but generic stock; passes minimum standard
4  = Poor: tangential, misleading, or low editorial value
2  = Very poor: wrong subject, document scan, logo, diagram, screenshot, or meme
0  = Reject: unrelated, technically broken, or wrong location

LOCATION RULE (critical): This article is for ${city}, ${region}. Read ALL text visible in the photo — business/building names, street and suburb signs, sports teams, posters, number plates. If anything identifies a DIFFERENT city, suburb, or state, score 0-2 and set keep=false, EVEN IF the subject type fits. Example: a pub/hotel/building whose sign names another suburb or city (e.g. "Woollahra Hotel", a Sydney venue) is WRONG for a ${city} article. A generic, unlabelled scene that could plausibly be ${city} is acceptable; a recognisable landmark from somewhere else is not.

Other rules:
- A solid black, white, grey, or otherwise blank/featureless image scores 0
- Generic "Australian city street" or "parliament building" photos score 4 or less for specific event/person headlines
- Photos of documents, scans, maps, logos, or text always score 0-2
- Reject if the photo appears to be from a different country

Return JSON only: {"score": <0-10>, "reason": "<15 words max>", "keep": <true only if score>=6 AND the location is not wrong>}`;
}

// Pull the first {...} JSON object out of a model reply (handles code fences
// or stray prose around the JSON).
function extractJsonObject(s: string): string {
  const a = s.indexOf("{");
  const b = s.lastIndexOf("}");
  return a >= 0 && b > a ? s.slice(a, b + 1) : s;
}

async function visionScore(headline: string, category: string | null, imageUrl: string): Promise<VisionScore> {
  const userText = `Headline: "${headline}"\nCategory: ${category ?? "general"}\nArticle city: ${cityName()}, ${cityRegion()}\nScore this photo:`;
  const content = await visionJudge(visionSystemPrompt(), userText, imageUrl, {
    maxTokens: 90,
    jsonObject: true,
    timeoutMs: VISION_TIMEOUT_MS,
  });
  // null => no model available or it errored: keep the existing photo so a
  // transient outage never churns good images.
  if (!content) return { score: 7, reason: "vision_unavailable", keep: true };
  try {
    const parsed = JSON.parse(extractJsonObject(content)) as {
      score?: number;
      reason?: string;
      keep?: boolean;
    };
    const score = typeof parsed.score === "number" ? Math.max(0, Math.min(10, parsed.score)) : 5;
    // Honour an explicit keep=false (wrong location) even if the score is high.
    const keep = parsed.keep !== false && score >= VISION_SCORE_THRESHOLD;
    return { score, reason: (parsed.reason ?? "").trim().slice(0, 100), keep };
  } catch {
    return { score: 7, reason: "vision_parse_error", keep: true };
  }
}

// ─── Image search: Openverse + Wikimedia ──────────────────────────────────────

function stripHtml(html?: string): string {
  return (html ?? "").replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

function formatLicense(lic?: string, ver?: string): string {
  const l = (lic ?? "").trim().toLowerCase();
  if (!l) return "";
  if (l === "pdm") return "Public Domain Mark";
  if (l === "cc0") return "CC0";
  return ver ? `CC ${l.toUpperCase()} ${ver}` : `CC ${l.toUpperCase()}`;
}

function buildCredit(creator?: string, licLabel?: string): string | null {
  const n = (creator ?? "").trim();
  const l = (licLabel ?? "").trim();
  if (n && l) return `${n} / ${l}`;
  return n || l || null;
}

async function searchOpenverse(query: string): Promise<ImageHit[]> {
  const u = new URL("https://api.openverse.org/v1/images/");
  u.searchParams.set("q", query);
  u.searchParams.set("page_size", "8");
  u.searchParams.set("aspect_ratio", "wide");
  u.searchParams.set("license_type", "commercial,modification");
  const r = await timedFetch(u.toString(), { headers: { Accept: "application/json" } });
  if (!r || !r.ok) return [];
  const json = (await r.json().catch(() => null)) as {
    results?: Array<{
      url?: string; width?: number; height?: number;
      creator?: string; license?: string; license_version?: string;
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
  su.searchParams.set("srlimit", "5");
  su.searchParams.set("srsearch", `${query} filetype:bitmap`);
  su.searchParams.set("format", "json");
  su.searchParams.set("origin", "*");
  const sr = await timedFetch(su.toString(), { headers: { Accept: "application/json" } });
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
  const ir = await timedFetch(iu.toString(), { headers: { Accept: "application/json" } });
  if (!ir || !ir.ok) return [];
  const ij = (await ir.json().catch(() => null)) as {
    query?: {
      pages?: Record<string, {
        title?: string;
        imageinfo?: Array<{
          url?: string; thumburl?: string; descriptionurl?: string;
          extmetadata?: Record<string, { value?: string }>;
          width?: number; height?: number;
        }>;
      }>;
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
    out.push({
      url: info.thumburl ?? info.url,
      credit: buildCredit(stripHtml(meta.Artist?.value), (meta.LicenseShortName?.value ?? "").trim()),
      source: info.descriptionurl ?? `https://commons.wikimedia.org/wiki/${page.title ?? ""}`,
    });
  }
  return out;
}

// ─── Query builder ────────────────────────────────────────────────────────────

// Built inside buildQueries (NOT at module load) so citySlug() resolves to the
// per-request city from AsyncLocalStorage. As a module constant it would freeze
// the default city (canberra) as the stopword for every city.
function cityStopwords(): Set<string> {
  return new Set([
    "the", "and", "for", "with", "from", "your", "this", "that", "into", "over",
    "how", "what", "why", "where", "when", "which", "guide", "explained", "complete",
    "best", "top", "new", "all", "has", "are", "was", citySlug(), "act", "australia",
    "2026", "2025", "2024", "city",
  ]);
}

function buildQueries(title: string, category: string | null): string[] {
  const city = cityName();
  const stopwords = cityStopwords();
  const tokens = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stopwords.has(w));

  const queries: string[] = [];
  if (tokens.length >= 3) queries.push(tokens.slice(0, 3).join(" "));
  if (tokens.length >= 2) queries.push(tokens.slice(0, 2).join(" "));

  // Category-specific fallback queries give geographic context
  const catFallbacks: Record<string, string[]> = {
    finance: ["money finance budget australia", "property house australia suburb"],
    community: ["people community neighbourhood australia", `${city} suburb street`],
    news: [`${city} city centre aerial`, "newspaper press media australia"],
    sport: ["sports stadium australia", "australian athlete outdoor"],
    federal: ["parliament house canberra", "government building australia"],
    property: ["australian house suburb residential", "home garden neighbourhood"],
    wellness: ["people walking park australia", "fitness outdoors australia"],
    longevity: ["healthy adults walking outdoor", "wellness exercise park"],
    business: ["office workspace modern australia", "business meeting professional"],
    education: ["school university campus australia", "students learning classroom"],
    environment: ["australian nature landscape", "environment park wildlife"],
    transport: ["road highway australia", "public transport bus train"],
  };

  if (category && catFallbacks[category]) {
    queries.push(...catFallbacks[category]);
  } else {
    queries.push(`${city} ${tokens[0] ?? "news"}`);
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

// ─── Find best replacement image ─────────────────────────────────────────────

async function findReplacement(
  title: string,
  category: string | null,
  usedUrls: Set<string>,
): Promise<(ImageHit & { probe_status: number | null; probe_ct: string | null }) | null> {
  const queries = buildQueries(title, category);
  const tried = new Set<string>();

  for (const query of queries) {
    const [ovHits, wmHits] = await Promise.all([
      searchOpenverse(query).catch(() => [] as ImageHit[]),
      searchWikimedia(query).catch(() => [] as ImageHit[]),
    ]);
    for (const hit of [...ovHits, ...wmHits]) {
      if (tried.has(hit.url) || usedUrls.has(hit.url)) continue;
      tried.add(hit.url);
      const probe = await probeImage(hit.url);
      if (!probe.ok) continue;
      // Vision check on replacement candidate
      const vision = await visionScore(title, category, hit.url);
      if (!vision.keep) continue;
      return { ...hit, probe_status: probe.status, probe_ct: probe.contentType };
    }
  }
  return null;
}

// ─── Article verification pass ────────────────────────────────────────────────

async function verifyArticles(
  client: any,
  city: string,
  limit: number,
): Promise<{ checked: number; pruned: number; replaced: number; remaining: number }> {
  let checked = 0;
  let pruned = 0;
  let replaced = 0;

  // Pull a batch weighted toward least-recently-verified articles.
  // The article_image_audit table tracks when we last probed each article;
  // we order by updated_at ascending to always work on stale records first.
  const { data: existing } = await client
    .from("articles")
    .select("id,title,category,hero_image,hero_image_source")
    .eq("city", city)
    .eq("is_published", true)
    // Never auto-manage sponsored / advertiser articles: the hero is paid
    // creative supplied by the advertiser, so it must not be pruned or replaced.
    .neq("category", "sponsored")
    .or("is_sponsored.is.null,is_sponsored.eq.false")
    // Only verify/prune/replace heroes THIS agent acquired. Agent-acquired
    // heroes always carry a hero_image_source; an editor-chosen hero (set in
    // the admin editor) has a NULL source and must be left untouched. This is
    // what stops an editor's deliberate photo vanishing after publish.
    .not("hero_image_source", "is", null)
    .not("hero_image", "is", null)
    .neq("hero_image", "")
    .order("updated_at", { ascending: true, nullsFirst: true })
    .limit(limit);

  const rows = (existing ?? []) as {
    id: string; title: string; category: string | null;
    hero_image: string | null; hero_image_source: string | null;
  }[];

  // Build used-URL set for dedup
  const { data: allUsed } = await client
    .from("articles")
    .select("hero_image")
    .eq("city", city)
    .not("hero_image", "is", null)
    .neq("hero_image", "")
    .limit(5000);
  const usedUrls = new Set<string>(
    (allUsed ?? []).map((r: { hero_image: string | null }) => r.hero_image).filter(Boolean) as string[],
  );

  const auditQueue: object[] = [];
  let visionUsed = 0;

  for (const row of rows) {
    if (!row.hero_image) continue;
    checked++;

    const probe = await probeImage(row.hero_image);
    auditQueue.push({
      article_id: row.id,
      city,
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

    let shouldPrune = !probe.ok;
    let pruneReason: string = probe.reason ?? "broken";
    let visionLabel: string | null = null;

    // Vision check for technically-alive images within budget
    if (probe.ok && visionUsed < VISION_BUDGET_ARTICLES) {
      visionUsed++;
      const vision = await visionScore(row.title, row.category, row.hero_image);
      visionLabel = String(vision.score);
      if (!vision.keep) {
        shouldPrune = true;
        pruneReason = `vision_score_${vision.score}: ${vision.reason}`;
      }
    }

    if (!shouldPrune) continue;

    // Clear the image
    await client
      .from("articles")
      .update({ hero_image: null, hero_image_credit: null, hero_image_source: null })
      .eq("city", city)
      .eq("id", row.id);

    usedUrls.delete(row.hero_image);
    pruned++;

    auditQueue.push({
      article_id: row.id,
      city,
      article_title: row.title,
      action: "prune",
      prev_url: row.hero_image,
      new_url: null,
      probe_status: probe.status,
      probe_content_type: probe.contentType,
      source: row.hero_image_source,
      reason: pruneReason,
      visual_check: visionLabel,
    });

    // Immediately find a replacement
    const replacement = await findReplacement(row.title, row.category, usedUrls);
    if (!replacement) continue;

    const { error: upErr } = await client
      .from("articles")
      .update({
        hero_image: replacement.url,
        hero_image_credit: replacement.credit,
        hero_image_source: replacement.source,
      })
      .eq("city", city)
      .eq("id", row.id);

    if (!upErr) {
      usedUrls.add(replacement.url);
      replaced++;
      auditQueue.push({
        article_id: row.id,
        city,
        article_title: row.title,
        action: "replace",
        prev_url: row.hero_image,
        new_url: replacement.url,
        probe_status: replacement.probe_status,
        probe_content_type: replacement.probe_ct,
        source: replacement.source,
        reason: "accepted",
        visual_check: "verified",
      });
    }
  }

  // Also acquire images for articles that are missing one entirely
  const { data: missing } = await client
    .from("articles")
    .select("id,title,category")
    .eq("city", city)
    .eq("is_published", true)
    // Sponsored / advertiser articles bring their own creative — never acquire.
    .neq("category", "sponsored")
    .or("is_sponsored.is.null,is_sponsored.eq.false")
    .or("hero_image.is.null,hero_image.eq.")
    .order("published_at", { ascending: false })
    .limit(Math.min(limit, 20));

  for (const art of (missing ?? []) as { id: string; title: string; category: string | null }[]) {
    const hit = await findReplacement(art.title, art.category, usedUrls);
    if (!hit) continue;
    const { error } = await client
      .from("articles")
      .update({ hero_image: hit.url, hero_image_credit: hit.credit, hero_image_source: hit.source })
      .eq("city", city)
      .eq("id", art.id);
    if (!error) {
      usedUrls.add(hit.url);
      replaced++;
      auditQueue.push({
        article_id: art.id,
        city,
        article_title: art.title,
        action: "replace",
        prev_url: null,
        new_url: hit.url,
        probe_status: hit.probe_status,
        probe_content_type: hit.probe_ct,
        source: hit.source,
        reason: "acquired_missing",
        visual_check: "verified",
      });
    }
  }

  // Flush audit log
  if (auditQueue.length > 0) {
    await client.from("article_image_audit").insert(auditQueue).catch((err: unknown) => {
      console.error("[photo-verification] audit flush failed", err);
    });
  }

  // Count remaining articles without images. Exclude sponsored articles
  // (is_sponsored=true) since the acquisition loop skips them.
  const { count: remaining } = await client
    .from("articles")
    .select("id", { count: "exact", head: true })
    .eq("city", city)
    .eq("is_published", true)
    .or("is_sponsored.is.null,is_sponsored.eq.false")
    .or("hero_image.is.null,hero_image.eq.");

  return { checked, pruned, replaced, remaining: remaining ?? 0 };
}

// ─── Event verification pass ──────────────────────────────────────────────────

async function verifyEvents(
  client: any,
  city: string,
  limit: number,
): Promise<{ checked: number; pruned: number; replaced: number; remaining: number }> {
  let checked = 0;
  let pruned = 0;
  let replaced = 0;

  const { data: eventsWithImages } = await client
    .from("events")
    .select("id,slug,title,category,image_url,source_url")
    .eq("city", city)
    .not("image_url", "is", null)
    .neq("image_url", "")
    .order("start_at", { ascending: true })
    .limit(limit);

  const rows = (eventsWithImages ?? []) as {
    id: string; slug: string; title: string; category: string | null;
    image_url: string | null; source_url: string | null;
  }[];

  const { data: allUsedEvt } = await client
    .from("events")
    .select("image_url")
    .eq("city", city)
    .not("image_url", "is", null)
    .neq("image_url", "")
    .limit(2000);
  const usedUrls = new Set<string>(
    (allUsedEvt ?? []).map((r: { image_url: string | null }) => r.image_url).filter(Boolean) as string[],
  );

  let visionUsed = 0;

  for (const ev of rows) {
    if (!ev.image_url) continue;
    if (isFallbackUrl(ev.image_url)) {
      // Treat branded fallbacks like missing images — skip prune, go straight to acquire
      const hit = await findReplacement(ev.title, ev.category, usedUrls);
      if (hit) {
        await client.from("events").update({ image_url: hit.url }).eq("city", city).eq("id", ev.id);
        usedUrls.add(hit.url);
        replaced++;
      }
      continue;
    }

    checked++;
    const probe = await probeImage(ev.image_url);
    let shouldPrune = !probe.ok;

    if (probe.ok && visionUsed < VISION_BUDGET_EVENTS) {
      visionUsed++;
      const vision = await visionScore(ev.title, ev.category, ev.image_url);
      if (!vision.keep) shouldPrune = true;
    }

    if (!shouldPrune) continue;

    await client.from("events").update({ image_url: null }).eq("city", city).eq("id", ev.id);
    usedUrls.delete(ev.image_url);
    pruned++;

    // Try og:image from source_url first, then fall back to free search
    let replacement: string | null = null;
    if (ev.source_url) {
      try {
        const pageRes = await timedFetch(ev.source_url, { method: "GET", redirect: "follow" });
        if (pageRes?.ok) {
          const html = await pageRes.text();
          const match = html.match(/<meta[^>]+(?:property=["']og:image["']|name=["']twitter:image["'])[^>]+content=["']([^"']+)["']/i)
            ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property=["']og:image["']|name=["']twitter:image["'])/i);
          if (match?.[1]) {
            const candidate = new URL(match[1].trim(), ev.source_url).toString();
            if (!usedUrls.has(candidate) && !isFallbackUrl(candidate)) {
              const p = await probeImage(candidate);
              if (p.ok) replacement = candidate;
            }
          }
        }
      } catch { /* fall through to free search */ }
    }

    if (!replacement) {
      const hit = await findReplacement(ev.title, ev.category, usedUrls);
      if (hit) replacement = hit.url;
    }

    if (replacement) {
      await client.from("events").update({ image_url: replacement }).eq("city", city).eq("id", ev.id);
      usedUrls.add(replacement);
      replaced++;
    }
  }

  // Acquire for events missing images entirely
  const { data: missingEvts } = await client
    .from("events")
    .select("id,title,category,source_url")
    .eq("city", city)
    .or("image_url.is.null,image_url.eq.")
    .order("start_at", { ascending: true })
    .limit(15);

  for (const ev of (missingEvts ?? []) as { id: string; title: string; category: string | null; source_url: string | null }[]) {
    const hit = await findReplacement(ev.title, ev.category, usedUrls);
    if (!hit) continue;
    await client.from("events").update({ image_url: hit.url }).eq("city", city).eq("id", ev.id);
    usedUrls.add(hit.url);
    replaced++;
  }

  const { count: remaining } = await client
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("city", city)
    .eq("is_published", true)
    .or("image_url.is.null,image_url.eq.");

  return { checked, pruned, replaced, remaining: remaining ?? 0 };
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function runPhotoVerification(articleLimit = 40, eventLimit = 30): Promise<VerificationSummary> {
  const ran_at = new Date().toISOString();
  const CITY = citySlug();

  const url = SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !serviceKey) {
    return {
      ok: false,
      ran_at,
      articles_checked: 0,
      articles_pruned: 0,
      articles_replaced: 0,
      events_checked: 0,
      events_pruned: 0,
      events_replaced: 0,
      remaining_articles_needing: 0,
      remaining_events_needing: 0,
      detail: "missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    };
  }

  const client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });

  const [articles, events] = await Promise.all([
    verifyArticles(client, CITY, articleLimit).catch((e) => ({
      checked: 0, pruned: 0, replaced: 0, remaining: 0,
      _err: e instanceof Error ? e.message : String(e),
    })),
    verifyEvents(client, CITY, eventLimit).catch((e) => ({
      checked: 0, pruned: 0, replaced: 0, remaining: 0,
      _err: e instanceof Error ? e.message : String(e),
    })),
  ]);

  return {
    ok: true,
    ran_at,
    articles_checked: articles.checked,
    articles_pruned: articles.pruned,
    articles_replaced: articles.replaced,
    events_checked: events.checked,
    events_pruned: events.pruned,
    events_replaced: events.replaced,
    remaining_articles_needing: articles.remaining,
    remaining_events_needing: events.remaining,
  };
}
