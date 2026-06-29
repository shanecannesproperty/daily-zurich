// Admin-only server route. POST triggers a batch image acquisition pass for
// events with missing / empty / branded-fallback image_url.
// Caller must send Authorization: Bearer <supabase access token> for the
// signed-in admin user (shane@spexperts.com.au).
//
// Body (all optional):
//   event_id    string         single-event acquisition (force re-acquire)
//   event_ids   string[]       restrict to a known set (used for "re-run failed")
//   force       boolean        ignore existing image_url when single-event
//   limit       number         batch size (default 25, max 100)
//
// Acquisition pipeline (per skill/event-cover-images):
//   1. Fetch source_url
//   2. Extract og:image and twitter:image candidates
//   3. Probe candidate URL (HEAD/GET): must be image/* with reasonable size
//   4. Reject branded fallback URLs and duplicates already in use
//   5. Write image_url back to events table (city-scoped via citySlug())
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { siteDomain, citySlug } from "@/lib/city";

const ADMIN_EMAIL = "shane@spexperts.com.au";
const BATCH_LIMIT = 25;
const FALLBACK_MARKERS = [`/branding/${citySlug()}-fallback-tile`, `${citySlug()}-fallback-tile`];

function imageBotUa(): string {
  return `DailyNetworkBot/1.0 (+${siteDomain()})`;
}

interface EventLite {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  source_url: string | null;
  image_url: string | null;
}

type OutcomeStatus =
  | "updated"
  | "no-source"
  | "no-og"
  | "free-image"
  | "rejected"
  | "duplicate"
  | "fetch-error"
  | "skipped";

interface Candidate {
  kind: "og:image" | "twitter:image" | "og:image:secure_url" | "openverse" | "wikimedia";
  url: string;
  accepted?: boolean;
  reject_reason?: string;
}

interface Outcome {
  id: string;
  slug: string;
  title: string;
  source_url: string | null;
  status: OutcomeStatus;
  detail?: string;
  image_url?: string;
  candidates: Candidate[];
  ts: string;
}

export const Route = createFileRoute("/api/admin/acquire-images")({
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
          event_id?: string;
          event_ids?: string[];
          force?: boolean;
          limit?: number;
        } = {};
        try {
          body = (await request.json()) as typeof body;
        } catch {
          /* no body */
        }
        const limit = Math.max(1, Math.min(100, body.limit ?? BATCH_LIMIT));

        const { data: rows, error: pullErr } = await userClient
          .from("events")
          .select("id,slug,title,category,source_url,image_url")
          .eq("city", CITY)
          .order("start_at", { ascending: true })
          .limit(1000);
        if (pullErr) return Response.json({ error: pullErr.message }, { status: 500 });
        const events = (rows ?? []) as EventLite[];

        const used = new Set<string>();
        for (const e of events) {
          if (e.image_url && !isFallback(e.image_url)) used.add(e.image_url);
        }

        let needs: EventLite[];
        if (body.event_id) {
          const target = events.find((e) => e.id === body.event_id);
          needs = target ? [target] : [];
          if (target && body.force && target.image_url && !isFallback(target.image_url)) {
            used.delete(target.image_url);
          }
        } else if (body.event_ids && body.event_ids.length > 0) {
          const set = new Set(body.event_ids);
          needs = events.filter((e) => set.has(e.id)).slice(0, limit);
        } else {
          needs = events
            .filter((e) => !e.image_url || e.image_url.trim() === "" || isFallback(e.image_url))
            .slice(0, limit);
        }

        const outcomes: Outcome[] = [];
        for (const ev of needs) {
          const ts = new Date().toISOString();
          if (!ev.source_url) {
            outcomes.push({
              id: ev.id,
              slug: ev.slug,
              title: ev.title,
              source_url: ev.source_url,
              status: "no-source",
              candidates: [],
              ts,
            });
            continue;
          }
          try {
            let candidates = await fetchCandidates(ev.source_url);
            // When og:image extraction finds nothing, try free image search
            // (Openverse) as a fallback using the event title + category.
            if (candidates.length === 0) {
              const freeCandidates = await searchFreeImageFallback(ev.title, ev.category);
              if (freeCandidates.length > 0) {
                candidates = freeCandidates;
              } else {
                outcomes.push({
                  id: ev.id,
                  slug: ev.slug,
                  title: ev.title,
                  source_url: ev.source_url,
                  status: "no-og",
                  candidates: [],
                  ts,
                });
                continue;
              }
            }
            let accepted: string | undefined;
            let lastDetail: string | undefined;
            for (const c of candidates) {
              if (isFallback(c.url)) {
                c.reject_reason = "branded fallback";
                continue;
              }
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
              break;
            }
            if (!accepted) {
              const dupOnly = candidates.every((c) => c.reject_reason === "duplicate");
              outcomes.push({
                id: ev.id,
                slug: ev.slug,
                title: ev.title,
                source_url: ev.source_url,
                status: dupOnly ? "duplicate" : "rejected",
                detail: lastDetail ?? candidates[0]?.reject_reason,
                candidates,
                ts,
              });
              continue;
            }
            const { error: upErr } = await userClient
              .from("events")
              .update({ image_url: accepted })
              .eq("city", CITY)
              .eq("id", ev.id);
            if (upErr) {
              outcomes.push({
                id: ev.id,
                slug: ev.slug,
                title: ev.title,
                source_url: ev.source_url,
                status: "fetch-error",
                detail: upErr.message,
                candidates,
                ts,
              });
              continue;
            }
            used.add(accepted);
            outcomes.push({
              id: ev.id,
              slug: ev.slug,
              title: ev.title,
              source_url: ev.source_url,
              status: "updated",
              image_url: accepted,
              candidates,
              ts,
            });
          } catch (err) {
            outcomes.push({
              id: ev.id,
              slug: ev.slug,
              title: ev.title,
              source_url: ev.source_url,
              status: "fetch-error",
              detail: err instanceof Error ? err.message : String(err),
              candidates: [],
              ts,
            });
          }
        }

        const updated = outcomes.filter((o) => o.status === "updated").length;
        const failed = outcomes.length - updated;
        return Response.json({
          processed: outcomes.length,
          updated,
          failed,
          remaining_needing: Math.max(
            0,
            events.filter(
              (e) => !e.image_url || e.image_url.trim() === "" || isFallback(e.image_url),
            ).length - updated,
          ),
          outcomes,
        });
      },
    },
  },
});

// --------------- Free image fallback (Openverse + Wikimedia) ---------------
// No API key required. Used when og:image extraction from the source page
// fails. Searches by event title keywords + category.

const FREE_IMG_TIMEOUT_MS = 8000;

function buildFreeQueries(title: string, category: string | null): string[] {
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
    "under",
    "free",
    "new",
    "best",
    "live",
    "all",
    "day",
    "week",
    "weekend",
    citySlug(),
    "act",
    "australia",
  ]);
  const tokens = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stopwords.has(w));
  const queries: string[] = [];
  if (tokens.length > 0) queries.push(tokens.join(" "));
  if (tokens.length >= 2) queries.push(tokens.slice(0, 2).join(" "));
  if (tokens.length >= 1) queries.push(tokens[0]);
  if (category) {
    const cat = category.toLowerCase().trim();
    if (cat) queries.push(cat);
  }
  const seen = new Set<string>();
  return queries.filter((q) => {
    const norm = q.toLowerCase().trim();
    if (!norm || seen.has(norm)) return false;
    seen.add(norm);
    return true;
  });
}

async function timedFetchFree(url: string): Promise<Response | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FREE_IMG_TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": imageBotUa(),
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

async function openverseSearch(query: string): Promise<Candidate[]> {
  const u = new URL("https://api.openverse.org/v1/images/");
  u.searchParams.set("q", query);
  u.searchParams.set("page_size", "6");
  u.searchParams.set("aspect_ratio", "wide");
  u.searchParams.set("license_type", "commercial,modification");
  const r = await timedFetchFree(u.toString());
  if (!r || !r.ok) return [];
  const json = (await r.json().catch(() => null)) as {
    results?: Array<{ url?: string; thumbnail?: string }>;
  } | null;
  return (json?.results ?? [])
    .filter((x) => typeof x.url === "string")
    .map((x) => ({ kind: "openverse" as const, url: x.url! }));
}

async function wikimediaSearch(query: string): Promise<Candidate[]> {
  const su = new URL("https://commons.wikimedia.org/w/api.php");
  su.searchParams.set("action", "query");
  su.searchParams.set("list", "search");
  su.searchParams.set("srnamespace", "6");
  su.searchParams.set("srlimit", "4");
  su.searchParams.set("srsearch", `${query} filetype:bitmap`);
  su.searchParams.set("format", "json");
  su.searchParams.set("origin", "*");
  const sr = await timedFetchFree(su.toString());
  if (!sr || !sr.ok) return [];
  const sj = (await sr.json().catch(() => null)) as {
    query?: { search?: Array<{ title?: string }> };
  } | null;
  const titles = (sj?.query?.search ?? []).map((s) => s.title).filter((t): t is string => !!t);
  if (titles.length === 0) return [];

  const iu = new URL("https://commons.wikimedia.org/w/api.php");
  iu.searchParams.set("action", "query");
  iu.searchParams.set("prop", "imageinfo");
  iu.searchParams.set("iiprop", "url|size");
  iu.searchParams.set("iiurlwidth", "1280");
  iu.searchParams.set("titles", titles.join("|"));
  iu.searchParams.set("format", "json");
  iu.searchParams.set("origin", "*");
  const ir = await timedFetchFree(iu.toString());
  if (!ir || !ir.ok) return [];
  const ij = (await ir.json().catch(() => null)) as {
    query?: {
      pages?: Record<
        string,
        { title?: string; imageinfo?: Array<{ url?: string; thumburl?: string }> }
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
    if (/logo|icon|map|coat[_ ]of[_ ]arms/i.test(fname)) continue;
    out.push({ kind: "wikimedia", url: info.thumburl ?? info.url });
  }
  return out;
}

async function searchFreeImageFallback(
  title: string,
  category: string | null,
): Promise<Candidate[]> {
  const queries = buildFreeQueries(title, category);
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
    if (all.length >= 8) break;
  }
  return all.slice(0, 12);
}

function isFallback(u: string): boolean {
  const lower = u.toLowerCase();
  return FALLBACK_MARKERS.some((m) => lower.includes(m));
}

async function fetchCandidates(pageUrl: string): Promise<Candidate[]> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FREE_IMG_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(pageUrl, {
      method: "GET",
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": imageBotUa() },
    });
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }
  if (!res.ok) return [];
  const html = await res.text();
  const out: Candidate[] = [];
  const patterns: Array<[Candidate["kind"], RegExp]> = [
    [
      "og:image:secure_url",
      /<meta[^>]+property=["']og:image:secure_url["'][^>]+content=["']([^"']+)["']/i,
    ],
    [
      "og:image:secure_url",
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image:secure_url["']/i,
    ],
    ["og:image", /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i],
    ["og:image", /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i],
    ["twitter:image", /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i],
    ["twitter:image", /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i],
  ];
  const seen = new Set<string>();
  for (const [kind, re] of patterns) {
    const m = html.match(re);
    if (m?.[1]) {
      const raw = m[1].trim();
      if (!raw) continue;
      try {
        const abs = new URL(raw, pageUrl).toString();
        if (seen.has(abs)) continue;
        seen.add(abs);
        out.push({ kind, url: abs });
      } catch {
        /* ignore */
      }
    }
  }
  return out;
}

// Probe with a User-Agent and a timeout. Wikimedia's upload CDN serves most
// image candidates and 403s requests that send no User-Agent, so a bare fetch()
// makes valid photos probe as "broken". The timeout bounds a slow host.
async function probeFetch(imageUrl: string, method: "HEAD" | "GET"): Promise<Response | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FREE_IMG_TIMEOUT_MS);
  try {
    return await fetch(imageUrl, {
      method,
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": imageBotUa(), Accept: "image/*,*/*;q=0.8" },
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
