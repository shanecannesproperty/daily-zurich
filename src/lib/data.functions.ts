// Server functions for all public reads. Components call these via TanStack Query.
// All reads go through src/lib/db.server.ts which enforces city=citySlug().
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type {
  ArticleRow,
  AudioBriefingRow,
  CityRow,
  CommentRow,
  CourtJudgmentRow,
  DailyEditionRow,
  EventRow,
  GuideEntryRow,
  GuideRow,
  JobRow,
  ListingRow,
  LiveFeedRow,
  ObituaryRow,
  PropertyListingRow,
  PropertyListingDTO,
  RecentlySoldRow,
  RecentlySoldDTO,
  ArticleCategory,
} from "./schema";
import { ARTICLE_CATEGORIES } from "./schema";
import { cityToCourtState, FEDERAL_COURT_STATES } from "./court-state";
import { citySlug, cityName } from "./city";
import { decodeEntities } from "./decode-entities";
import {
  priceDisplay,
  soldPriceDisplay,
  composeAddress,
  safeImageAlt,
  normaliseImages,
  normaliseFeatures,
  normaliseInspections,
  saleBandFor,
  formatAud,
} from "./listings";

const slugSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[a-z0-9-]+$/);

function hasSource(url: string | null | undefined): url is string {
  return typeof url === "string" && url.trim().length > 0;
}

// Some ingested rows arrive with HTML-encoded text in title/dek/venue/etc.
// (e.g. "The City&#39;s"). JSX would then escape the ampersand again and the
// raw entity would appear on the page. Decode any string field whose name
// suggests it carries display text, leaving URLs, slugs and ids untouched.
const TEXT_FIELDS = new Set([
  "title",
  "dek",
  "subtitle",
  "headline",
  "summary",
  "excerpt",
  "description",
  "body",
  "body_html",
  "venue",
  "suburb",
  "category",
  "business_name",
  "weather_text",
  "name",
  "author",
  "byline",
  // court_feed display fields (the court's own published metadata).
  "case_name",
  "court",
  "catchwords",
]);

function decodeRow<T>(row: T): T {
  if (!row || typeof row !== "object") return row;
  const out: Record<string, unknown> = { ...(row as Record<string, unknown>) };
  for (const key of Object.keys(out)) {
    const v = out[key];
    if (typeof v === "string" && TEXT_FIELDS.has(key)) {
      out[key] = decodeEntities(v);
    }
  }
  return out as T;
}

function decodeRows<T>(rows: T[]): T[] {
  return rows.map((r) => decodeRow(r));
}

async function safePublicRead<T>(label: string, fallback: T, read: () => Promise<T>): Promise<T> {
  try {
    return await read();
  } catch (err) {
    console.error(`${label} failed, returning fallback:`, err);
    return fallback;
  }
}

export const getCity = createServerFn({ method: "GET" }).handler(async () => {
  const { cityTable } = await import("@/lib/db.server");
  const { data, error } = await cityTable("cities").eq("is_live", true).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const { slug, name, domain, state, timezone, is_live, launched_at } = data as Record<
    string,
    unknown
  > &
    CityRow;
  return { slug, name, domain, state, timezone, is_live, launched_at } as CityRow;
});

export const getHomepage = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { cityTable, guideEntries } = await import("@/lib/db.server");
    // Use start of UTC day so SSR and any client refetch within the same day
    // return identical event sets (prevents hydration mismatch on the diary).
    const nowIso = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z").toISOString();
    const [articlesRes, eventsRes, guidesRes] = await Promise.all([
      cityTable("articles")
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(7),
      cityTable("events")
        .eq("is_published", true)
        .not("source_url", "is", null)
        .gte("start_at", nowIso)
        .order("start_at", { ascending: true })
        .limit(30),
      cityTable("guides").eq("is_published", true).order("title", { ascending: true }).limit(6),
    ]);
    if (articlesRes.error) throw new Error(articlesRes.error.message);
    if (eventsRes.error) throw new Error(eventsRes.error.message);
    if (guidesRes.error) throw new Error(guidesRes.error.message);

    const articles = decodeRows((articlesRes.data ?? []) as ArticleRow[]);
    const guides = decodeRows((guidesRes.data ?? []) as GuideRow[]);
    const guideEntryLists = await Promise.all(
      guides.map(async (g) => {
        const { data } = await guideEntries(g.id)
          .order("is_featured", { ascending: false })
          .order("rank", { ascending: true })
          .limit(1);
        return { guide: g, top: decodeRows((data ?? []) as GuideEntryRow[])[0] ?? null };
      }),
    );

    return {
      articles,
      events: decodeRows((eventsRes.data ?? []) as EventRow[]).filter((e) => hasSource(e.source_url)),
      guides: guideEntryLists,
    };
  } catch (err) {
    // Graceful degrade: an upstream backend outage (e.g. Cloudflare 522 to the
    // database) must not turn the homepage into a 500. Render the empty-state
    // path instead and let the next request retry.
    console.error("getHomepage failed, returning empty payload:", err);
    return { articles: [], events: [], guides: [] };
  }
});

export const getArticlesByCategory = createServerFn({ method: "GET" })
  .inputValidator((d: { category: string; page?: number }) =>
    z
      .object({
        category: z.enum(ARTICLE_CATEGORIES as [string, ...string[]]),
        page: z.number().int().min(1).max(500).default(1),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    return safePublicRead(
      "getArticlesByCategory",
      { rows: [] as ArticleRow[], page: data.page, perPage: 18 },
      async () => {
        const PER = 18;
        const from = (data.page - 1) * PER;
        const to = from + PER - 1;
        const { cityTable } = await import("@/lib/db.server");
        const res = await cityTable("articles")
          .eq("is_published", true)
          .eq("category", data.category)
          .order("published_at", { ascending: false })
          .range(from, to);
        if (res.error) throw new Error(res.error.message);
        return { rows: decodeRows((res.data ?? []) as ArticleRow[]), page: data.page, perPage: PER };
      },
    );
  });

export const getArticleBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => z.object({ slug: slugSchema }).parse(d))
  .handler(async ({ data }) => {
    return safePublicRead(
      "getArticleBySlug",
      { article: null as ArticleRow | null, related: [] as ArticleRow[] },
      async () => {
        const { cityTable, nationalArticlesTable } = await import("@/lib/db.server");
        const res = await cityTable("articles")
          .eq("slug", data.slug)
          .eq("is_published", true)
          .maybeSingle();
        if (res.error) throw new Error(res.error.message);
        // If no city-specific article found, check the national desk
        if (!res.data) {
          const natRes = await nationalArticlesTable()
            .eq("slug", data.slug)
            .eq("is_published", true)
            .maybeSingle();
          if (natRes.error) throw new Error(natRes.error.message);
          if (!natRes.data) return { article: null, related: [] as ArticleRow[] };
          const article = decodeRow(natRes.data as ArticleRow);
          const relRes = await nationalArticlesTable()
            .eq("is_published", true)
            .eq("category", article.category)
            .neq("id", article.id)
            .order("published_at", { ascending: false })
            .limit(5);
          return { article, related: decodeRows((relRes.data ?? []) as ArticleRow[]) };
        }
        const article = decodeRow(res.data as ArticleRow);
        const relRes = await cityTable("articles")
          .eq("is_published", true)
          .eq("category", article.category)
          .neq("id", article.id)
          .order("published_at", { ascending: false })
          .limit(5);
        return { article, related: decodeRows((relRes.data ?? []) as ArticleRow[]) };
      },
    );
  });

export const getNationalArticles = createServerFn({ method: "GET" }).handler(async () => {
  return safePublicRead("getNationalArticles", [] as ArticleRow[], async () => {
    const { nationalArticlesTable } = await import("@/lib/db.server");
    const res = await nationalArticlesTable()
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .limit(8);
    if (res.error) throw new Error(res.error.message);
    return decodeRows((res.data ?? []) as ArticleRow[]);
  });
});

// Public "Have Your Say" comments for an article: ONLY approved, non-author-hidden
// rows, served by the list_approved_comments rpc (city + status asserted in the
// DB). The author's own optimistic pending row is NEVER returned here — it lives
// in component-local state only, so this shared/SSR payload other readers receive
// can never leak a pending comment. body + author_name are user-submitted plain
// text and are rendered as text in the component; we do NOT entity-decode them
// (that would mangle literal characters a reader typed) and there is no body_html.
export const listArticleComments = createServerFn({ method: "GET" })
  .inputValidator((d: { articleId: string }) => z.object({ articleId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { listApprovedCommentsRpc } = await import("@/lib/db.server");
    const res = await listApprovedCommentsRpc(data.articleId);
    if (res.error) throw new Error(res.error.message);
    return (res.data ?? []) as CommentRow[];
  });

export const listEvents = createServerFn({ method: "GET" }).handler(async () => {
  return safePublicRead("listEvents", [] as EventRow[], async () => {
    const { cityTable } = await import("@/lib/db.server");
    const nowIso = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z").toISOString();
    const res = await cityTable("events")
      .eq("is_published", true)
      .not("source_url", "is", null)
      .gte("start_at", nowIso)
      .order("start_at", { ascending: true })
      .limit(200);
    if (res.error) throw new Error(res.error.message);
    return decodeRows((res.data ?? []) as EventRow[]).filter((e) => hasSource(e.source_url));
  });
});

export const getEventBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => z.object({ slug: slugSchema }).parse(d))
  .handler(async ({ data }) => {
    const { cityTable } = await import("@/lib/db.server");
    const res = await cityTable("events")
      .eq("slug", data.slug)
      .eq("is_published", true)
      .not("source_url", "is", null)
      .maybeSingle();
    if (res.error) throw new Error(res.error.message);
    return decodeRow(res.data as EventRow | null) ?? null;
  });

export const getGuideBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => z.object({ slug: slugSchema }).parse(d))
  .handler(async ({ data }) => {
    return safePublicRead(
      "getGuideBySlug",
      { guide: null as GuideRow | null, entries: [] as GuideEntryRow[] },
      async () => {
        const { cityTable, guideEntries } = await import("@/lib/db.server");
        const gRes = await cityTable("guides")
          .eq("slug", data.slug)
          .eq("is_published", true)
          .maybeSingle();
        if (gRes.error) throw new Error(gRes.error.message);
        if (!gRes.data) return { guide: null, entries: [] as GuideEntryRow[] };
        const guide = decodeRow(gRes.data as GuideRow);
        const eRes = await guideEntries(guide.id)
          .order("is_featured", { ascending: false })
          .order("rank", { ascending: true });
        if (eRes.error) throw new Error(eRes.error.message);
        return { guide, entries: decodeRows((eRes.data ?? []) as GuideEntryRow[]) };
      },
    );
  });

export const listDirectory = createServerFn({ method: "GET" }).handler(async () => {
  return safePublicRead("listDirectory", [] as ListingRow[], async () => {
    const { cityTable } = await import("@/lib/db.server");
    const res = await cityTable("listings")
      .not("source_url", "is", null)
      .order("is_featured", { ascending: false })
      .order("business_name", { ascending: true })
      .limit(500);
    if (res.error) throw new Error(res.error.message);
    return decodeRows((res.data ?? []) as ListingRow[]).filter((l) => hasSource(l.source_url));
  });
});

export const listAllPublishedArticleSlugs = createServerFn({ method: "GET" }).handler(async () => {
  const { cityTable } = await import("@/lib/db.server");
  const res = await cityTable("articles")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(5000);
  if (res.error) throw new Error(res.error.message);
  return decodeRows((res.data ?? []) as ArticleRow[]).map((a) => ({
    slug: a.slug,
    updated_at: a.updated_at,
    published_at: a.published_at,
    title: a.title,
    category: a.category as ArticleCategory,
    hero_image: a.hero_image,
    dek: a.dek,
  }));
});

export const listAllPublishedEventSlugs = createServerFn({ method: "GET" }).handler(async () => {
  const { cityTable } = await import("@/lib/db.server");
  const res = await cityTable("events")
    .eq("is_published", true)
    .not("source_url", "is", null)
    .limit(5000);
  if (res.error) throw new Error(res.error.message);
  return ((res.data ?? []) as EventRow[]).map((e) => ({ slug: e.slug, start_at: e.start_at }));
});

export const listAllPublishedGuideSlugs = createServerFn({ method: "GET" }).handler(async () => {
  const { cityTable } = await import("@/lib/db.server");
  const res = await cityTable("guides").eq("is_published", true).limit(5000);
  if (res.error) throw new Error(res.error.message);
  return ((res.data ?? []) as GuideRow[]).map((g) => ({ slug: g.slug }));
});

export const listPublishedGuides = createServerFn({ method: "GET" }).handler(async () => {
  return safePublicRead("listPublishedGuides", [] as GuideRow[], async () => {
    const { cityTable } = await import("@/lib/db.server");
    const res = await cityTable("guides")
      .eq("is_published", true)
      .order("title", { ascending: true })
      .limit(500);
    if (res.error) throw new Error(res.error.message);
    return decodeRows((res.data ?? []) as GuideRow[]);
  });
});

// Events within the next Fri 00:00 to Sun 23:59 window (Australia/Sydney).
export const listThisWeekendEvents = createServerFn({ method: "GET" }).handler(async () => {
  return safePublicRead("listThisWeekendEvents", [] as EventRow[], async () => {
    const { cityTable } = await import("@/lib/db.server");
    // Compute next Friday and following Sunday in UTC for query bounds.
    const now = new Date();
    const day = now.getUTCDay(); // 0 Sun .. 6 Sat
    // Days until upcoming Friday (5). If today is Sat (6) or Sun (0), include current weekend.
    const daysToFri = day <= 5 ? 5 - day : -1; // -1 means Sat: this weekend's Fri was yesterday
    const start = new Date(now);
    start.setUTCHours(0, 0, 0, 0);
    if (day === 0 || day === 6) {
      start.setUTCDate(start.getUTCDate() - (day === 0 ? 2 : 1));
    } else {
      start.setUTCDate(start.getUTCDate() + daysToFri);
    }
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 3); // Fri + 3 days = Mon 00:00
    const res = await cityTable("events")
      .eq("is_published", true)
      .not("source_url", "is", null)
      .gte("start_at", start.toISOString())
      .lt("start_at", end.toISOString())
      .order("start_at", { ascending: true })
      .limit(100);
    if (res.error) throw new Error(res.error.message);
    return decodeRows((res.data ?? []) as EventRow[]).filter((e) => hasSource(e.source_url));
  });
});

export const listTrendingArticles = createServerFn({ method: "GET" }).handler(async () => {
  return safePublicRead("listTrendingArticles", [] as ArticleRow[], async () => {
    const { cityTable } = await import("@/lib/db.server");
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const res = await cityTable("articles")
      .eq("is_published", true)
      .gte("published_at", sevenDaysAgo)
      .order("published_at", { ascending: false })
      .limit(30);
    if (res.error) throw new Error(res.error.message);
    return decodeRows((res.data ?? []) as ArticleRow[]);
  });
});

const trendingTodayInput = z.object({ excludeSlug: slugSchema.optional() });
export const listTrendingToday = createServerFn({ method: "GET" })
  .inputValidator((d: { excludeSlug?: string }) => trendingTodayInput.parse(d))
  .handler(async ({ data }) => {
    const { cityTableSelect } = await import("@/lib/db.server");
    const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    let q = cityTableSelect("articles", "slug,title,category,published_at")
      .eq("is_published", true)
      .gte("published_at", since)
      .order("published_at", { ascending: false })
      .limit(6);
    if (data.excludeSlug) q = q.neq("slug", data.excludeSlug);
    const res = await q;
    if (res.error) throw new Error(res.error.message);
    const rows = (res.data ?? []) as unknown as Array<{
      slug: string;
      title: string;
      category: string;
      published_at: string | null;
    }>;
    return rows.slice(0, 5).map((r) => ({
      slug: r.slug,
      title: decodeEntities(r.title),
      category: r.category,
      published_at: r.published_at,
    }));
  });


const searchInputSchema = z.object({ q: z.string().trim().min(1).max(200) });

export const searchSite = createServerFn({ method: "GET" })
  .inputValidator((d: { q: string }) => searchInputSchema.parse(d))
  .handler(async ({ data }) => {
    const { cityTableSelect } = await import("@/lib/db.server");
    const tokens = data.q
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1)
      .slice(0, 5);
    if (!tokens.length) return { articles: [], events: [], listings: [] };
    const titleOr = tokens.map((t) => `title.ilike.%${t}%`).join(",");
    const dekOr = tokens.map((t) => `dek.ilike.%${t}%`).join(",");
    const bizOr = tokens.map((t) => `business_name.ilike.%${t}%`).join(",");
    const [articles, events, listings] = await Promise.all([
      cityTableSelect("articles", "id,slug,title,dek,category,published_at,hero_image")
        .eq("is_published", true)
        .or([titleOr, dekOr].join(","))
        .order("published_at", { ascending: false })
        .limit(20),
      cityTableSelect("events", "id,slug,title,venue,suburb,start_at,category,image_url")
        .eq("is_published", true)
        .not("source_url", "is", null)
        .or([titleOr, `venue.ilike.%${tokens[0]}%`, `suburb.ilike.%${tokens[0]}%`].join(","))
        .order("start_at", { ascending: true })
        .limit(20),
      cityTableSelect("listings", "id,business_name,category,suburb,website_url,image_url")
        .not("source_url", "is", null)
        .or(bizOr)
        .limit(20),
    ]);
    type ArticleHit = {
      id: string;
      slug: string;
      title: string;
      dek: string | null;
      category: string;
      published_at: string | null;
      hero_image: string | null;
    };
    type EventHit = {
      id: string;
      slug: string;
      title: string;
      venue: string | null;
      suburb: string | null;
      start_at: string | null;
      category: string | null;
      image_url: string | null;
    };
    type ListingHit = {
      id: string;
      business_name: string;
      category: string | null;
      suburb: string | null;
      website_url: string | null;
      image_url: string | null;
    };
    return {
      articles: (articles.data ?? []) as unknown as ArticleHit[],
      events: (events.data ?? []) as unknown as EventHit[],
      listings: (listings.data ?? []) as unknown as ListingHit[],
    };
  });

const suburbSlugSchema = z
  .string()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9-]+$/);

function suburbFromSlug(slug: string): string {
  return slug
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

export const listSuburbContent = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => z.object({ slug: suburbSlugSchema }).parse(d))
  .handler(async ({ data }) => {
    const { cityTable } = await import("@/lib/db.server");
    const name = suburbFromSlug(data.slug);
    const nowIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [eventsRes, listingsRes] = await Promise.all([
      cityTable("events")
        .eq("is_published", true)
        .not("source_url", "is", null)
        .ilike("suburb", name)
        .gte("start_at", nowIso)
        .order("start_at", { ascending: true })
        .limit(50),
      cityTable("listings")
        .not("source_url", "is", null)
        .ilike("suburb", name)
        .order("is_featured", { ascending: false })
        .order("business_name", { ascending: true })
        .limit(50),
    ]);
    return {
      name,
      events: decodeRows((eventsRes.data ?? []) as EventRow[]).filter((e) =>
        hasSource(e.source_url),
      ),
      listings: decodeRows((listingsRes.data ?? []) as ListingRow[]).filter((l) =>
        hasSource(l.source_url),
      ),
    };
  });

// Latest "City in 5 minutes" audio briefing for this city. Returns null when
// none exists or the most recent row has no playable audio_url.
export const getDailyBriefing = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { cityTable } = await import("@/lib/db.server");
    const res = await cityTable("audio_briefings")
      .order("briefing_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (res.error) throw new Error(res.error.message);
    const row = decodeRow(res.data as AudioBriefingRow | null);
    if (!row || !hasSource(row.audio_url)) return null;
    return row;
  } catch (err) {
    // Graceful degrade so the homepage never 500s on a transient backend outage.
    console.error("getDailyBriefing failed, returning null:", err);
    return null;
  }
});

// List recent daily audio briefings for this city (podcast archive). Drops rows
// without a playable audio_url. Newest first. Empty array when none exist.
export const listAudioBriefings = createServerFn({ method: "GET" }).handler(async () => {
  const { cityTable } = await import("@/lib/db.server");
  const res = await cityTable("audio_briefings")
    .order("briefing_date", { ascending: false })
    .limit(30);
  if (res.error) throw new Error(res.error.message);
  const rows = ((res.data ?? []) as AudioBriefingRow[])
    .map((r) => decodeRow(r))
    .filter((r): r is AudioBriefingRow => !!r && hasSource(r.audio_url));
  return rows;
});



// The latest READY daily edition for this city (the "Today" morning briefing).
// One row per city per day, written by the backend compose-edition job. RLS only
// returns rows where status in ('ready','sent'); we additionally pin status to
// 'ready' here so the page shows the composed-and-checked edition, newest first.
// Returns null when no ready edition exists so the page can render a calm
// "being prepared" state. The `sections` jsonb is the array the compose job
// wrote; we surface it as-is for the page to render section by section. All
// edition text is rendered as PLAIN TEXT in the component.
export const getTodaysEdition = createServerFn({ method: "GET" }).handler(
  async (): Promise<DailyEditionRow | null> => {
    const { cityTable } = await import("@/lib/db.server");
    const res = await cityTable("daily_editions")
      .eq("status", "ready")
      .order("edition_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (res.error) throw new Error(res.error.message);
    return decodeRow(res.data as DailyEditionRow | null) ?? null;
  },
);

// Newsletter archive: all sent editions for this city, newest first.
export const listSentEditions = createServerFn({ method: "GET" }).handler(
  async (): Promise<DailyEditionRow[]> => {
    const { cityTable } = await import("@/lib/db.server");
    const res = await cityTable("daily_editions")
      .in("status", ["sent", "ready"])
      .order("edition_date", { ascending: false })
      .limit(50);
    if (res.error) throw new Error(res.error.message);
    return decodeRows((res.data ?? []) as DailyEditionRow[]);
  },
);

const editionByIdInput = z.object({ id: z.string().uuid() });
export const getEditionById = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => editionByIdInput.parse(d))
  .handler(async ({ data }): Promise<DailyEditionRow | null> => {
    const { cityTable } = await import("@/lib/db.server");
    const res = await cityTable("daily_editions")
      .eq("id", data.id)
      .in("status", ["sent", "ready"])
      .maybeSingle();
    if (res.error) throw new Error(res.error.message);
    return decodeRow(res.data as DailyEditionRow | null) ?? null;
  });


// News-style kinds shown in the "Live now" list. 'weather' is handled separately
// as the conditions chip; 'traffic' is intentionally excluded from the brief.
const LIVE_FEED_LIST_KINDS = ["news", "breaking", "sport", "community"] as const;

// Live feed for this city: the newest publishable items plus the most recent
// weather row for the conditions chip. Every list item must carry a real source
// url (Voller rule), so url-less rows are dropped. Returns empty arrays when the
// feed is empty so callers can render nothing.
export const listLiveFeed = createServerFn({ method: "GET" }).handler(async () => {
  return safePublicRead(
    "listLiveFeed",
    { items: [] as LiveFeedRow[], weather: null as LiveFeedRow | null },
    async () => {
      const { cityTable } = await import("@/lib/db.server");
      const [itemsRes, weatherRes] = await Promise.all([
        cityTable("live_feed")
          .eq("is_published", true)
          .in("kind", LIVE_FEED_LIST_KINDS as unknown as string[])
          .not("url", "is", null)
          .order("published_at", { ascending: false })
          .limit(30),
        cityTable("live_feed")
          .eq("is_published", true)
          .eq("kind", "weather")
          .order("published_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (itemsRes.error) throw new Error(itemsRes.error.message);
      if (weatherRes.error) throw new Error(weatherRes.error.message);
      const items = decodeRows((itemsRes.data ?? []) as LiveFeedRow[]).filter((r) => hasSource(r.url));
      const weather = decodeRow(weatherRes.data as LiveFeedRow | null) ?? null;
      return { items, weather };
    },
  );
});

// Local "Canberra on video" strip: published video rows from live_feed that
// carry a YouTube watch url, newest first. EMBED / LINK-OUT ONLY: we surface the
// publisher's own thumbnail and player (or a link out to their watch page) and
// never re-host the video. To stop one busy channel (e.g. Capital Football or
// the War Memorial) flooding the strip, we diversify in JS: at most 2 videos per
// `source` channel, keeping recency order, then return the first 12.
export const getVideos = createServerFn({ method: "GET" }).handler(
  async (): Promise<LiveFeedRow[]> => {
    return safePublicRead("getVideos", [] as LiveFeedRow[], async () => {
      const { cityTable } = await import("@/lib/db.server");
      const res = await cityTable("live_feed")
        .eq("kind", "video")
        .eq("is_published", true)
        .not("video_url", "is", null)
        .order("published_at", { ascending: false })
        .limit(40);
      if (res.error) throw new Error(res.error.message);
      const rows = decodeRows((res.data ?? []) as LiveFeedRow[]).filter((r) =>
        hasSource(r.video_url),
      );

      const perSourceCount = new Map<string, number>();
      const diversified: LiveFeedRow[] = [];
      for (const row of rows) {
        const key = (row.source ?? "").trim().toLowerCase() || "unknown";
        const seen = perSourceCount.get(key) ?? 0;
        if (seen >= 2) continue;
        perSourceCount.set(key, seen + 1);
        diversified.push(row);
        if (diversified.length >= 12) break;
      }
      return diversified;
    });
  },
);

// Full "City on video" page feed. Same EMBED / LINK-OUT rule as the homepage
// rail, but a wider window and a looser per-channel cap (4 instead of 2) so the
// /watch page can offer a useful split by section (live_feed.video_category) and
// by date. Rows carry video_category, assigned in the DB by the
// dn_video_category() rule, so the page never has to classify anything itself.
export const getWatchVideos = createServerFn({ method: "GET" }).handler(
  async (): Promise<LiveFeedRow[]> => {
    const { cityTable } = await import("@/lib/db.server");
    const res = await cityTable("live_feed")
      .eq("kind", "video")
      .eq("is_published", true)
      .not("video_url", "is", null)
      .order("published_at", { ascending: false })
      .limit(160);
    if (res.error) throw new Error(res.error.message);
    const rows = decodeRows((res.data ?? []) as LiveFeedRow[]).filter((r) =>
      hasSource(r.video_url),
    );

    const perSourceCount = new Map<string, number>();
    const diversified: LiveFeedRow[] = [];
    for (const row of rows) {
      const key = (row.source ?? "").trim().toLowerCase() || "unknown";
      const seen = perSourceCount.get(key) ?? 0;
      if (seen >= 4) continue;
      perSourceCount.set(key, seen + 1);
      diversified.push(row);
      if (diversified.length >= 72) break;
    }
    return diversified;
  },
);

// Single source of truth for city-scoped content counts. `cityCount` is
// imported from db.server which enforces .eq('city', citySlug()) on
// every query — callers MUST go through this helper instead of building
// their own count queries so the city filter can never be forgotten.
export async function getCityContentCounts(): Promise<{
  eventsThisWeek: number;
  articlesPublishedLast7Days: number;
}> {
  const { cityCount } = await import("@/lib/db.server");
  const nowIso = new Date().toISOString();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const weekAhead = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const [eventsRes, articlesRes] = await Promise.all([
    cityCount("events")
      .eq("is_published", true)
      .not("source_url", "is", null)
      .gte("start_at", nowIso)
      .lte("start_at", weekAhead),
    cityCount("articles").eq("is_published", true).gte("published_at", weekAgo),
  ]);
  return {
    eventsThisWeek: eventsRes.error ? 0 : (eventsRes.count ?? 0),
    articlesPublishedLast7Days: articlesRes.error ? 0 : (articlesRes.count ?? 0),
  };
}

// Public stats surfaced in the social proof banner. By product decision the
// banner shows ONLY confirmed subscriber count — events and articles counts
// were removed and must not be added back here. See SocialProofBanner.tsx
// and the social-proof-banner regression test.
export const getPublicStats = createServerFn({ method: "GET" }).handler(async () => {
  const { dbInsertClient } = await import("@/lib/db.server");
  const CITY = (await import("@/lib/city")).citySlug();
  const db = dbInsertClient();
  const subsRes = await db
    .from("subscribers")
    .select("id", { count: "exact", head: true })
    .eq("city", CITY)
    // Subscribers are stored with status='active' (single opt-in); there is no
    // `confirmed` column. The old .eq("confirmed", true) threw "column
    // subscribers.confirmed does not exist" on every homepage load, so the
    // social-proof banner silently fell back to 0.
    .eq("status", "active");
  if (subsRes.error) console.warn(`getPublicStats subscribers: ${subsRes.error.message || "rls"}`);
  const subscriberCount = subsRes.error ? 0 : (subsRes.count ?? 0);
  return { subscriberCount };

});

// Published, approved obituaries and death notices for this city, newest first.
// Every notice is submitted by a family member or a funeral director and is
// moderated (status='approved') and published before it appears here. RLS only
// returns rows where is_published and status='approved'; we filter on the same
// conditions for defence in depth. Returns an empty array when none exist so the
// page can render a dignified empty state. We never seed or fabricate a notice.
export const listObituaries = createServerFn({ method: "GET" }).handler(async () => {
  const { cityTable } = await import("@/lib/db.server");
  const res = await cityTable("obituaries")
    .eq("is_published", true)
    .eq("status", "approved")
    .order("published_at", { ascending: false })
    .limit(200);
  if (res.error) throw new Error(res.error.message);
  return decodeRows((res.data ?? []) as ObituaryRow[]);
});

// Fetch a single published, approved obituary by slug. Returns null when the
// slug is not found or the notice is not yet published.
export const getObituary = createServerFn({ method: "GET" })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const { cityTable } = await import("@/lib/db.server");
    const res = await cityTable("obituaries")
      .eq("slug", slug)
      .eq("is_published", true)
      .eq("status", "approved")
      .maybeSingle();
    if (res.error) throw new Error(res.error.message);
    if (!res.data) return null;
    return decodeRow(res.data as ObituaryRow);
  });

// Submit a death notice or obituary. The notice is held for human review before
// it is published. Submitter PII goes to obituary_submissions; the public
// obituaries table is only written by an admin approval action.
export const submitObituaryNotice = createServerFn({ method: "POST" })
  .validator(
    (d: {
      city: string;
      full_name: string;
      preferred_name?: string;
      date_of_death?: string;
      age?: number;
      suburb?: string;
      notice_type: string;
      body_text?: string;
      service_details?: string;
      funeral_director?: string;
      funeral_director_url?: string;
      submitter_name: string;
      submitter_email: string;
      submitter_phone?: string;
      submitter_relationship?: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    const { rawSupabase } = await import("@/lib/db.server");
    const { citySlug } = await import("@/lib/city");
    const res = await rawSupabase.from("obituary_submissions").insert({
      ...data,
      city: data.city || citySlug(),
      status: "pending",
    });
    if (res.error) throw new Error(res.error.message);
    return { ok: true };
  });

// Published court judgment references for THIS city's state plus the national
// federal tiers, newest first. court_feed is STATE-scoped, not city-scoped (see
// src/lib/court-state.ts), so we resolve the city's court states and filter by
// state. This feature is LINK-OUT ONLY: each row carries only the court's own
// published metadata and an outbound url to the OFFICIAL judgment. We never
// store or reproduce judgment text. RLS only returns rows where is_published;
// the helper also filters is_published for defence in depth. Returns an empty
// array when none exist so callers can render a calm empty state. We never seed
// or fabricate a judgment.
export const listCourtJudgments = createServerFn({ method: "GET" }).handler(async () => {
  const { courtFeedByStates } = await import("@/lib/db.server");
  const { citySlug } = await import("@/lib/city");
  // Query the city's own state and the national tiers SEPARATELY so the local
  // court always appears, even when a state's feed is less fresh than the busy
  // federal courts (a single date-ordered LIMIT would otherwise bury older but
  // genuinely-local judgments under the most recent federal ones).
  const own = cityToCourtState(citySlug());
  const [ownRes, fedRes] = await Promise.all([
    own
      ? courtFeedByStates([own])
          .order("decision_date", { ascending: false, nullsFirst: false })
          .limit(25)
      : Promise.resolve({ data: [] as CourtJudgmentRow[], error: null }),
    courtFeedByStates(FEDERAL_COURT_STATES)
      .order("decision_date", { ascending: false, nullsFirst: false })
      .limit(25),
  ]);
  if (ownRes.error) throw new Error(ownRes.error.message);
  if (fedRes.error) throw new Error(fedRes.error.message);
  // Local court first (most relevant to a local paper), then the national tiers.
  const rows = [
    ...((ownRes.data ?? []) as CourtJudgmentRow[]),
    ...((fedRes.data ?? []) as CourtJudgmentRow[]),
  ];
  return decodeRows(rows);
});

// Published jobs for the active city, newest first. LINK-OUT ONLY: each row
// carries an outbound url to apply on the official source; we never re-host the
// ad. Sourced from legal feeds (ACT Government, and Adzuna when a key is set).
// Returns an empty array when none exist so callers can render a calm state.
export const listJobs = createServerFn({ method: "GET" }).handler(async () => {
  const { cityTable } = await import("@/lib/db.server");
  const res = await cityTable("jobs")
    .eq("is_published", true)
    .order("posted_date", { ascending: false, nullsFirst: false })
    .limit(50);
  if (res.error) throw new Error(res.error.message);
  return decodeRows((res.data ?? []) as JobRow[]);
});

// ---------------------------------------------------------------------------
// Property listings (REAXML-fed). Read ONLY the two PUBLIC VIEWS, never the
// base table. Both reads are city-guarded via cityTable() (which injects
// .eq('city', CITY)). The view already gates status/availability and nulls any
// not-public numeric price; the mappers below are belt-and-braces: they build a
// single pre-sanitised priceDisplay string and NEVER copy a raw price numeric
// onto the client DTO when the matching public flag is false. The raw row is
// never returned to the client.
// ---------------------------------------------------------------------------

function regionFallback(): string {
  return `${cityName()} region`;
}

const PROPERTY_DEVELOPER_NAMES = new Set(["sp experts", "sap canberra pty ltd"]);
const LISTING_AGENCY_NAME = "Apartment Collective";
const LISTING_AGENT_NAME = "Gaurav";

function normaliseListingAgency(name: string | null): string | null {
  if (!name) return null;
  return PROPERTY_DEVELOPER_NAMES.has(name.trim().toLowerCase()) ? LISTING_AGENCY_NAME : name;
}

function normaliseListingAgent(agencyName: string | null, agentName: string | null): string | null {
  if (!agencyName) return agentName;
  return PROPERTY_DEVELOPER_NAMES.has(agencyName.trim().toLowerCase())
    ? LISTING_AGENT_NAME
    : agentName;
}

// Map a raw view row to the sanitised client DTO. The raw price numerics are
// consulted ONLY by priceDisplay/saleBandFor through the public flag; they are
// never assigned onto the DTO, so a generic field dump cannot leak them.
function toListingDTO(row: PropertyListingRow): PropertyListingDTO {
  const listingType = (row.listing_type ?? "").trim() || "sale";
  const isRent = listingType === "rent";
  const rawAgencyName = row.agency_name ? decodeEntities(row.agency_name) : null;
  const rawAgentName = row.agent_name ? decodeEntities(row.agent_name) : null;

  const addressLine = composeAddress({
    addressDisplay: row.address_display,
    suburbDisplay: row.suburb_display,
    unitNumber: row.unit_number,
    lotNumber: row.lot_number,
    streetNumber: row.street_number,
    streetName: row.street_name,
    suburb: row.suburb,
    state: row.state,
    postcode: row.postcode,
    displayAddress: row.display_address,
    regionFallback: regionFallback(),
  });

  // For rentals the public price comes from the rent fields; for everything
  // else from the sale price fields. We pass the right public flag so the
  // numeric is only ever read when it is publicly displayable.
  const display = isRent
    ? priceDisplay({
        isPublic: row.rent_is_public,
        numeric: row.rent_numeric,
        viewText: row.price_view_text,
        period: row.rent_period,
      })
    : priceDisplay({
        isPublic: row.price_is_public,
        numeric: row.price_numeric,
        viewText: row.price_view_text,
      });

  // Bond is a numeric: show it only when the rent is public AND it is positive.
  const bondDisplay =
    isRent && row.rent_is_public === true && typeof row.bond === "number" && row.bond > 0
      ? formatAud(row.bond)
      : null;

  return {
    id: row.id,
    slug: row.slug,
    listingType,
    propertyType: row.property_type ?? null,
    category: row.category ?? null,
    underOffer: row.under_offer === true,
    isFeatured: row.is_featured === true,
    isOwnerStock: row.is_owner_stock === true,
    placementType: row.placement_type ?? null,
    addressLine,
    suburb: row.suburb ?? null,
    suburbDisplay: row.suburb_display !== false,
    priceDisplay: display,
    priceViewText: (row.price_view_text ?? "").trim() || null,
    priceTax: (row.price_tax ?? "").trim() || null,
    priceBand: isRent ? null : saleBandFor(row.price_is_public, row.price_numeric),
    rentPeriod: isRent ? (row.rent_period ?? "").trim() || null : null,
    bondDisplay,
    dateAvailable: row.date_available ?? null,
    bedrooms: typeof row.bedrooms === "number" ? row.bedrooms : null,
    bathrooms: typeof row.bathrooms === "number" ? row.bathrooms : null,
    carspaces: typeof row.carspaces === "number" ? row.carspaces : null,
    landArea: typeof row.land_area === "number" ? row.land_area : null,
    buildingArea: typeof row.building_area === "number" ? row.building_area : null,
    headline: row.headline ? decodeEntities(row.headline) : null,
    description: row.description ? decodeEntities(row.description) : null,
    features: normaliseFeatures(row.features),
    images: normaliseImages(row.images),
    floorplans: normaliseImages(row.floorplans),
    inspectionTimes: normaliseInspections(row.inspection_times),
    imageAlt: safeImageAlt({
      propertyType: row.property_type,
      suburb: row.suburb,
      suburbDisplay: row.suburb_display,
      listingType,
    }),
    agencyName: normaliseListingAgency(rawAgencyName),
    agencyLicence: (row.agency_licence ?? "").trim() || null,
    agencyKey: (row.agency_key ?? "").trim() || null,
    agentName: normaliseListingAgent(rawAgencyName, rawAgentName),
    agentPhone: (row.agent_phone ?? "").trim() || null,
    agentEmail: (row.agent_email ?? "").trim() || null,
    modTime: row.mod_time ?? null,
  };
}

function toSoldDTO(row: RecentlySoldRow): RecentlySoldDTO {
  const listingType = (row.listing_type ?? "").trim() || "sale";
  const rawAgencyName = row.agency_name ? decodeEntities(row.agency_name) : null;
  const rawAgentName = row.agent_name ? decodeEntities(row.agent_name) : null;
  return {
    id: row.id,
    slug: row.slug,
    listingType,
    propertyType: row.property_type ?? null,
    status: row.status ?? null,
    addressLine: composeAddress({
      addressDisplay: row.address_display,
      suburbDisplay: row.suburb_display,
      suburb: row.suburb,
      state: row.state,
      postcode: row.postcode,
      displayAddress: row.display_address,
      regionFallback: regionFallback(),
    }),
    suburb: row.suburb ?? null,
    suburbDisplay: row.suburb_display !== false,
    soldPriceDisplay: soldPriceDisplay({
      isPublic: row.sold_price_is_public,
      numeric: row.sold_price,
      displayText: row.sold_price_display,
      range: row.sold_price_range,
    }),
    soldDate: row.sold_date ?? null,
    bedrooms: typeof row.bedrooms === "number" ? row.bedrooms : null,
    bathrooms: typeof row.bathrooms === "number" ? row.bathrooms : null,
    carspaces: typeof row.carspaces === "number" ? row.carspaces : null,
    landArea: typeof row.land_area === "number" ? row.land_area : null,
    headline: row.headline ? decodeEntities(row.headline) : null,
    features: normaliseFeatures(row.features),
    images: normaliseImages(row.images),
    imageAlt: safeImageAlt({
      propertyType: row.property_type,
      suburb: row.suburb,
      suburbDisplay: row.suburb_display,
      listingType,
    }),
    agencyName: normaliseListingAgency(rawAgencyName),
    agencyLicence: (row.agency_licence ?? "").trim() || null,
    agentName: normaliseListingAgent(rawAgencyName, rawAgentName),
    isOwnerStock: row.is_owner_stock === true,
  };
}

// Active on-market for-sale/for-rent stock for this city. Reads the
// public_available_property_listings view (which already restricts to
// status='current' and is_available). Ordered featured-first then newest by
// mod_time so the UI can render the mandatory paid-placement label and the
// "current as at" stamp. Returns sanitised DTOs only.
export const getPropertyListings = createServerFn({ method: "GET" }).handler(
  async (): Promise<PropertyListingDTO[]> => {
    const { cityTable } = await import("@/lib/db.server");
    const res = await cityTable("public_available_property_listings")
      .order("is_featured", { ascending: false, nullsFirst: false })
      .order("mod_time", { ascending: false, nullsFirst: false })
      .limit(200);
    if (res.error) throw new Error(res.error.message);
    return ((res.data ?? []) as PropertyListingRow[]).map(toListingDTO);
  },
);

// Paginated, filterable listings for the /property hub. Reads the same
// city-scoped public view as getPropertyListings (current/available only)
// and returns sanitised DTOs. Filter by listing_type when not "all".
export const listPropertyHubPage = createServerFn({ method: "GET" })
  .inputValidator((d: { type?: "sale" | "rent" | "all"; page?: number }) =>
    z
      .object({
        type: z.enum(["sale", "rent", "all"]).default("all"),
        page: z.number().int().min(1).max(500).default(1),
      })
      .parse(d),
  )
  .handler(
    async ({
      data,
    }): Promise<{ rows: PropertyListingDTO[]; page: number; perPage: number }> => {
      const PER = 18;
      const from = (data.page - 1) * PER;
      const to = from + PER - 1;
      const { cityTable } = await import("@/lib/db.server");
      let q = cityTable("public_available_property_listings")
        .order("is_featured", { ascending: false, nullsFirst: false })
        .order("mod_time", { ascending: false, nullsFirst: false })
        .range(from, to);
      if (data.type !== "all") {
        q = q.eq("listing_type", data.type);
      }
      const res = await q;
      if (res.error) throw new Error(res.error.message);
      return {
        rows: ((res.data ?? []) as PropertyListingRow[]).map(toListingDTO),
        page: data.page,
        perPage: PER,
      };
    },
  );



// Single active listing by slug. Returns null when no row matches the
// displayable gate (the view only contains current/available stock), so a
// withdrawn/sold/off-market listing 404s by direct URL rather than rendering.
export const getPropertyListingBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => z.object({ slug: slugSchema }).parse(d))
  .handler(async ({ data }): Promise<PropertyListingDTO | null> => {
    const { cityTable } = await import("@/lib/db.server");
    const res = await cityTable("public_available_property_listings")
      .eq("slug", data.slug)
      .maybeSingle();
    if (res.error) throw new Error(res.error.message);
    if (!res.data) return null;
    return toListingDTO(res.data as PropertyListingRow);
  });

// Recently sold/leased stock (status sold/leased within the view's recency
// cap), newest first by sold_date. Surfaced ONLY in the clearly-labelled
// Recently Sold section, never mixed into active results. Returns sanitised
// DTOs with no raw sold price numeric.
export const getRecentlySold = createServerFn({ method: "GET" }).handler(
  async (): Promise<RecentlySoldDTO[]> => {
    const { cityTable } = await import("@/lib/db.server");
    const res = await cityTable("public_recently_sold")
      .order("sold_date", { ascending: false, nullsFirst: false })
      .limit(60);
    if (res.error) throw new Error(res.error.message);
    return ((res.data ?? []) as RecentlySoldRow[]).map(toSoldDTO);
  },
);

// All active listing slugs for sitemap generation. Returns slug + mod_time
// only, no price or address detail.
export const listAllPropertyListingSlugs = createServerFn({ method: "GET" }).handler(async () => {
  const { cityTableSelect } = await import("@/lib/db.server");
  const res = await cityTableSelect("public_available_property_listings", "slug,mod_time").limit(
    5000,
  );
  if (res.error) throw new Error(res.error.message);
  return ((res.data ?? []) as unknown as { slug: string; mod_time: string | null }[]).map((r) => ({
    slug: r.slug,
    mod_time: r.mod_time,
  }));
});

export const getWorldArticles = createServerFn({ method: "GET" })
  .inputValidator((d: { page?: number }) =>
    z.object({ page: z.number().int().min(1).max(500).default(1) }).parse(d),
  )
  .handler(async ({ data }) => {
    const PER = 18;
    const from = (data.page - 1) * PER;
    const to = from + PER - 1;
    const { deskTable } = await import("@/lib/db.server");
    const res = await deskTable("world")
      .order("published_at", { ascending: false })
      .range(from, to);
    if (res.error) throw new Error(res.error.message);
    return { rows: decodeRows((res.data ?? []) as ArticleRow[]), page: data.page, perPage: PER };
  });

export const getWorldArticleBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => z.object({ slug: slugSchema }).parse(d))
  .handler(async ({ data }) => {
    const { deskTable } = await import("@/lib/db.server");
    const res = await deskTable("world").eq("slug", data.slug).maybeSingle();
    if (res.error) throw new Error(res.error.message);
    if (!res.data) return { article: null, related: [] as ArticleRow[] };
    const article = decodeRow(res.data as ArticleRow);
    const relRes = await deskTable("world")
      .neq("id", article.id)
      .order("published_at", { ascending: false })
      .limit(5);
    return { article, related: decodeRows((relRes.data ?? []) as ArticleRow[]) };
  });

export const getAllArticles = createServerFn({ method: "GET" })
  .inputValidator((d: { page?: number }) =>
    z.object({ page: z.number().int().min(1).max(500).default(1) }).parse(d),
  )
  .handler(async ({ data }) => {
    const PER = 18;
    const from = (data.page - 1) * PER;
    const to = from + PER - 1;
    const { cityTable } = await import("@/lib/db.server");
    const res = await cityTable("articles")
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .range(from, to);
    if (res.error) throw new Error(res.error.message);
    return { rows: decodeRows((res.data ?? []) as ArticleRow[]), page: data.page, perPage: PER };
  });

// Articles filtered by topic/tag. Tags are derived from the `category` field
// (case-insensitive match). Returns up to 20 published articles per page.
export const getArticlesByTopic = createServerFn({ method: "GET" })
  .inputValidator((d: { tag: string; page?: number }) =>
    z
      .object({
        tag: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/),
        page: z.number().int().min(1).max(500).default(1),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const PER = 20;
    const from = (data.page - 1) * PER;
    const to = from + PER - 1;
    const { cityTable } = await import("@/lib/db.server");
    const res = await cityTable("articles")
      .eq("is_published", true)
      .eq("category", data.tag)
      .order("published_at", { ascending: false })
      .range(from, to);
    if (res.error) throw new Error(res.error.message);
    return {
      rows: decodeRows((res.data ?? []) as ArticleRow[]),
      page: data.page,
      perPage: PER,
      tag: data.tag,
    };
  });

// Fetch published articles by an explicit slug list. Powers the client-only
// /saved page (saves live in localStorage; the server merely hydrates them).
export const getArticlesBySlugs = createServerFn({ method: "POST" })
  .inputValidator((d: { slugs: string[] }) =>
    z.object({ slugs: z.array(slugSchema).max(200) }).parse(d),
  )
  .handler(async ({ data }) => {
    if (data.slugs.length === 0) return { rows: [] as ArticleRow[] };
    const { cityTable } = await import("@/lib/db.server");
    const res = await cityTable("articles")
      .eq("is_published", true)
      .in("slug", data.slugs)
      .order("published_at", { ascending: false });
    if (res.error) throw new Error(res.error.message);
    return { rows: decodeRows((res.data ?? []) as ArticleRow[]) };
  });

// Paginated homepage article feed used by the "Load more" button on /.
// Offset-based; PER must match the offset the client tracks. We only return
// the published-article columns ArticleCard needs.
export const getMoreHomepageArticles = createServerFn({ method: "POST" })
  .inputValidator((d: { offset: number }) =>
    z.object({ offset: z.number().int().min(0).max(2000) }).parse(d),
  )
  .handler(async ({ data }) => {
    const PER = 10;
    const from = data.offset;
    const to = from + PER - 1;
    const { cityTable } = await import("@/lib/db.server");
    const res = await cityTable("articles")
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .range(from, to);
    if (res.error) throw new Error(res.error.message);
    const rows = decodeRows((res.data ?? []) as ArticleRow[]);
    return { rows, perPage: PER, hasMore: rows.length === PER };
  });

// Top 7 articles from the past 7 days for the /this-week summary page.
// Ordered by published_at desc (the most-read RPC isn't time-windowed, and
// view counts on a fresh deployment are sparse — recency is a better signal).
export const getThisWeek = createServerFn({ method: "GET" }).handler(async () => {
  const { cityTable } = await import("@/lib/db.server");
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const res = await cityTable("articles")
    .eq("is_published", true)
    .gte("published_at", since)
    .order("published_at", { ascending: false })
    .limit(7);
  if (res.error) throw new Error(res.error.message);
  return { rows: decodeRows((res.data ?? []) as ArticleRow[]) };
});

// Latest published headline for every city in the Daily Network. Used by the
// /network showcase page. Single round-trip: fetch the most-recent N rows
// across all cities, then dedupe to one headline per city in JS.
export const getNetworkLatestHeadlines = createServerFn({ method: "GET" }).handler(
  async (): Promise<Record<string, { slug: string; title: string; published_at: string | null }>> => {
    const { networkArticlesTable } = await import("@/lib/db.server");
    const { data, error } = await networkArticlesTable()
      .select("city, slug, title, published_at")
      .order("published_at", { ascending: false })
      .limit(400);
    if (error) {
      console.error("[network-headlines]", error.message);
      return {};
    }
    const out: Record<string, { slug: string; title: string; published_at: string | null }> = {};
    for (const r of (data ?? []) as Array<{ city: string; slug: string; title: string; published_at: string | null }>) {
      if (!out[r.city]) out[r.city] = { slug: r.slug, title: r.title, published_at: r.published_at };
    }
    return out;
  },
);

// ----- /my-feed personalization -----
// Returns the latest articles for a chosen set of categories. If the input
// list is empty the route falls back to the latest articles overall, so the
// page is useful on a brand-new device with no reading history.
export const getFeedByCategories = createServerFn({ method: "GET" })
  .inputValidator((d: { categories: string[] }) =>
    z
      .object({
        categories: z
          .array(z.enum(ARTICLE_CATEGORIES as [string, ...string[]]))
          .max(7)
          .default([]),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { cityTable } = await import("@/lib/db.server");
    let q = cityTable("articles")
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .limit(30);
    if (data.categories.length > 0) {
      q = q.in("category", data.categories);
    }
    const res = await q;
    if (res.error) throw new Error(res.error.message);
    return {
      rows: decodeRows((res.data ?? []) as ArticleRow[]),
      categories: data.categories,
      personalized: data.categories.length > 0,
    };
  });

// ----- Article inline editor's pick -----
// Returns the most-viewed article in a category over the last 7 days,
// falling back to the latest article in that category when no view rows
// exist (newly-launched cities, RLS-blocked rollups, etc.).
export const getEditorsPick = createServerFn({ method: "GET" })
  .inputValidator((d: { category: string; excludeSlug?: string }) =>
    z
      .object({
        category: z.enum(ARTICLE_CATEGORIES as [string, ...string[]]),
        excludeSlug: z.string().max(200).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { cityTable } = await import("@/lib/db.server");
    const CITY = (await import("@/lib/city")).citySlug();
    const { supabase } = await import("@/integrations/supabase/client");

    // 1. Pull the top viewed slugs for the city (RPC is read-only).
    const { data: viewRows } = await supabase.rpc("get_most_read", {
      p_city: CITY,
      p_limit: 50,
    });
    const topSlugs = (viewRows ?? [])
      .map((r: { slug: string }) => r.slug)
      .filter((s: string) => s && s !== data.excludeSlug);

    // 2. Try matching the top-viewed slugs against the category.
    if (topSlugs.length > 0) {
      const matchRes = await cityTable("articles")
        .eq("is_published", true)
        .eq("category", data.category)
        .in("slug", topSlugs)
        .limit(10);
      const matched = decodeRows((matchRes.data ?? []) as ArticleRow[]);
      if (matched.length > 0) {
        // Preserve view-count order from topSlugs.
        const ordered = topSlugs
          .map((s: string) => matched.find((m) => m.slug === s))
          .filter(Boolean) as ArticleRow[];
        if (ordered[0]) return { pick: ordered[0], source: "most-read" as const };
      }
    }

    // 3. Fallback: latest in-category article that isn't the current one.
    const fallback = cityTable("articles")
      .eq("is_published", true)
      .eq("category", data.category)
      .order("published_at", { ascending: false })
      .limit(1);
    const res = data.excludeSlug
      ? await fallback.neq("slug", data.excludeSlug)
      : await fallback;
    const rows = decodeRows((res.data ?? []) as ArticleRow[]);
    return { pick: rows[0] ?? null, source: "latest" as const };
  });

// ----- Monthly archive -----
// listArchiveMonths returns YYYY-MM buckets that contain >= 5 published
// articles. Aggregated client-side because PostgREST cannot run a SQL
// date_trunc/GROUP BY directly through the auto-generated REST surface.
export const listArchiveMonths = createServerFn({ method: "GET" }).handler(async () => {
  const { cityTableSelect } = await import("@/lib/db.server");
  const res = await cityTableSelect("articles", "published_at")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(2000);
  if (res.error) throw new Error(res.error.message);
  const buckets = new Map<string, number>();
  for (const row of (res.data ?? []) as unknown as { published_at: string | null }[]) {
    if (!row.published_at) continue;
    const d = new Date(row.published_at);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  const months = [...buckets.entries()]
    .filter(([, n]) => n >= 5)
    .map(([key, count]) => {
      const [y, m] = key.split("-");
      return { year: Number(y), month: Number(m), count };
    })
    .sort((a, b) => (b.year - a.year) || (b.month - a.month));
  return { months };
});

export const getArchiveMonth = createServerFn({ method: "GET" })
  .inputValidator((d: { year: number; month: number; page?: number }) =>
    z
      .object({
        year: z.number().int().min(2000).max(2100),
        month: z.number().int().min(1).max(12),
        page: z.number().int().min(1).max(50).default(1),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const PER = 20;
    const from = (data.page - 1) * PER;
    const to = from + PER - 1;
    const start = new Date(Date.UTC(data.year, data.month - 1, 1));
    const end = new Date(Date.UTC(data.year, data.month, 1));
    const { cityTable } = await import("@/lib/db.server");
    const res = await cityTable("articles")
      .eq("is_published", true)
      .gte("published_at", start.toISOString())
      .lt("published_at", end.toISOString())
      .order("published_at", { ascending: false })
      .range(from, to);
    if (res.error) throw new Error(res.error.message);
    return {
      rows: decodeRows((res.data ?? []) as ArticleRow[]),
      page: data.page,
      perPage: PER,
      year: data.year,
      month: data.month,
    };
  });

// ----- Cross-network trending -----
// Top 3 most-viewed articles in the last 24h from OTHER cities in the
// Daily Network. Drives discovery — every additional city in the network
// makes this widget more valuable for every other city.
export const getCrossNetworkTrending = createServerFn({ method: "GET" }).handler(
  async (): Promise<Array<{ city: string; cityLabel: string; slug: string; title: string; views: number }>> => {
    const { citySlug } = await import("@/lib/city");
    const { CITY_BRANDING } = await import("@/lib/city-config");
    const { rawSupabase, networkArticlesSelect } = await import("@/lib/db.server");
    const own = citySlug();

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const viewsRes = await rawSupabase
      .from("article_views")
      .select("city, slug, view_count, updated_at")
      .neq("city", own)
      .gte("updated_at", since)
      .order("view_count", { ascending: false })
      .limit(40);
    if (viewsRes.error) {
      console.error("[cross-trending]", viewsRes.error.message);
      return [];
    }
    type V = { city: string; slug: string; view_count: number };
    const rows = (viewsRes.data ?? []) as V[];

    // De-dupe to one row per city so a single hot story can't fill the widget.
    const perCity = new Map<string, V>();
    for (const r of rows) {
      if (!perCity.has(r.city)) perCity.set(r.city, r);
      if (perCity.size >= 10) break;
    }
    const picks = [...perCity.values()].slice(0, 3);
    if (picks.length === 0) return [];

    const slugs = [...new Set(picks.map((p) => p.slug))];
    // networkArticlesSelect is the sanctioned cross-city read helper (allow-
    // listed in db.server.ts so the source-scan-city test treats it as safe).
    const artRes = await networkArticlesSelect("city, slug, title")
      .in("slug", slugs)
      .in("city", picks.map((p) => p.city));

    if (artRes.error) return [];
    const titles = new Map<string, string>();
    for (const a of (artRes.data ?? []) as unknown as { city: string; slug: string; title: string }[]) {
      titles.set(`${a.city}|${a.slug}`, a.title);
    }
    return picks
      .map((p) => {
        const title = titles.get(`${p.city}|${p.slug}`);
        if (!title) return null;
        const brand = CITY_BRANDING[p.city];
        return {
          city: p.city,
          cityLabel: brand?.name ?? p.city,
          slug: p.slug,
          title,
          views: p.view_count,
        };
      })
      .filter(Boolean) as Array<{ city: string; cityLabel: string; slug: string; title: string; views: number }>;
  },
);
