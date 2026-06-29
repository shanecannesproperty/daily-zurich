import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { siteDomain } from "@/lib/city";
import { ARTICLE_CATEGORIES } from "@/lib/schema";
import { GUIDES } from "@/lib/guides-config";
import {
  listAllPublishedArticleSlugs,
  listAllPublishedEventSlugs,
  listAllPublishedGuideSlugs,
} from "@/lib/data.functions";

const URLS_PER_SITEMAP = 50000;

function xmlEscape(s: string) {
  return s.replace(/[<>&'"]/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c === "'" ? "&apos;" : "&quot;",
  );
}

function toIsoDate(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function absImage(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return `${siteDomain()}${url.startsWith("/") ? "" : "/"}${url}`;
}

interface UrlEntry {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: number;
  image?: string;
}

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function urlsetXml(entries: UrlEntry[]): string {
  const hasImages = entries.some((e) => e.image);
  const ns = hasImages
    ? `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`
    : `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    ns,
    ...entries.map((u) => {
      const parts = [`<loc>${xmlEscape(u.loc)}</loc>`];
      if (u.lastmod) parts.push(`<lastmod>${u.lastmod}</lastmod>`);
      if (u.changefreq) parts.push(`<changefreq>${u.changefreq}</changefreq>`);
      if (u.priority != null) parts.push(`<priority>${u.priority.toFixed(1)}</priority>`);
      if (u.image) parts.push(`<image:image><image:loc>${xmlEscape(u.image)}</image:loc></image:image>`);
      return `  <url>${parts.join("")}</url>`;
    }),
    `</urlset>`,
  ].join("\n");
}

function indexXml(count: number): string {
  const now = new Date().toISOString();
  const parts = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
  ];
  for (let i = 1; i <= count; i++) {
    parts.push(
      `  <sitemap><loc>${siteDomain()}/sitemap-page/${i}</loc><lastmod>${now}</lastmod></sitemap>`,
    );
  }
  parts.push(`</sitemapindex>`);
  return parts.join("\n");
}

export async function buildAllSitemapEntries(): Promise<UrlEntry[]> {
  const [articles, events, guides] = await Promise.all([
    listAllPublishedArticleSlugs(),
    listAllPublishedEventSlugs(),
    listAllPublishedGuideSlugs(),
  ]);
  const statics = [
    "/",
    "/events",
    "/this-weekend",
    "/things-to-do",
    "/trending",
    "/search",
    "/ask",
    "/weather",
    "/submit-event",
    "/puzzles",
    "/best",
    "/directory",
    "/property",
    "/advertise",
    "/media-kit",
    "/network",
    "/watch",
    "/jobs",
    "/about",
    "/archive",
    "/classifieds",
    "/contribute",
    "/contact",
    "/privacy",
    "/terms",
    "/faq",
    "/podcast",
    "/newsletters",
    "/editions",
    "/this-week",
    "/tips",
    "/subscribe",
    "/sponsored-content-policy",
    "/editorial-standards",
    "/guides",
    "/wellness",
    "/longevity",
    "/courts",
    "/world",
    "/newsroom",
    "/sport",
    "/saved",
    "/confirmed",
    "/email-preferences",
    "/best/day-trips-from-canberra",
    "/article/canberra-vs-sydney-cost-of-living",
    ...ARTICLE_CATEGORIES.map((c) => `/${c}`),
    ...ARTICLE_CATEGORIES.map((c) => `/category/${c}`),
    ...ARTICLE_CATEGORIES.map((c) => `/news/${c}`),
    ...GUIDES.map((g) => `/guide/${g.slug}`),
  ];
  const urls: UrlEntry[] = [];
  statics.forEach((p) => {
    if (p === "/weather") {
      urls.push({ loc: `${siteDomain()}${p}`, changefreq: "hourly", priority: 0.9 });
    } else {
      urls.push({ loc: `${siteDomain()}${p}` });
    }
  });
  articles.forEach((a) =>
    urls.push({
      loc: `${siteDomain()}/article/${a.slug}`,
      lastmod: toIsoDate(a.updated_at ?? a.published_at),
      image: absImage(a.hero_image),
    }),
  );
  events.forEach((e) =>
    urls.push({
      loc: `${siteDomain()}/event/${e.slug}`,
      lastmod: toIsoDate(e.start_at),
    }),
  );
  guides.forEach((g) => urls.push({ loc: `${siteDomain()}/best/${g.slug}` }));
  return urls;
}

function respond(body: string, request: Request): Response {
  const etag = `"W/${hash(body)}"`;
  const inm = request.headers.get("if-none-match");
  const headers: Record<string, string> = {
    "Content-Type": "application/xml; charset=utf-8",
    "Cache-Control": "public, max-age=900, s-maxage=900",
    ETag: etag,
  };
  if (inm && inm === etag) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(body, { headers });
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const entries = await buildAllSitemapEntries();
        if (entries.length <= URLS_PER_SITEMAP) {
          return respond(urlsetXml(entries), request);
        }
        const count = Math.ceil(entries.length / URLS_PER_SITEMAP);
        return respond(indexXml(count), request);
      },
    },
  },
});
