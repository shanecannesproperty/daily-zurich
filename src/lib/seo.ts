import { cityName, cityBcp47, siteDomain, siteName } from "./city";

export function absUrl(path: string) {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${siteDomain()}${clean}`;
}

export function stripChrome(title: string, max = 60) {
  if (title.length <= max) return title;
  return title.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

export function pageTitle(headline: string) {
  const tail = ` | ${siteName()}`;
  const max = 60;
  if (headline.length + tail.length <= max) return headline + tail;
  const left = headline.slice(0, max - tail.length - 1).replace(/\s+\S*$/, "");
  return left + "…" + tail;
}

export function clampDescription(text: string | null | undefined, max = 155) {
  if (!text) return `Independent news for ${cityName()} from ${siteName()}.`;
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return flat.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

interface MetaOpts {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  type?: "website" | "article";
  publishedTime?: string | null;
  modifiedTime?: string | null;
  author?: string | null;
  section?: string | null;
}

type MetaTag =
  | { title: string }
  | { name: string; content: string }
  | { property: string; content: string };

export function buildMeta(opts: MetaOpts): MetaTag[] {
  const url = absUrl(opts.path);
  const img = opts.image ? (opts.image.startsWith("http") ? opts.image : absUrl(opts.image)) : null;
  const ogType = opts.type ?? "website";
  const tags: MetaTag[] = [
    { title: opts.title },
    { name: "description", content: opts.description },
    { property: "og:title", content: opts.title },
    { property: "og:description", content: opts.description },
    { property: "og:url", content: url },
    { property: "og:type", content: ogType },
    { property: "og:site_name", content: siteName() },
    { property: "og:locale", content: cityBcp47().replace("-", "_") },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: opts.title },
    { name: "twitter:description", content: opts.description },
  ];
  if (img) {
    tags.push({ property: "og:image", content: img });
    tags.push({ property: "og:image:width", content: "1200" });
    tags.push({ property: "og:image:height", content: "630" });
    tags.push({ name: "twitter:image", content: img });
  }
  if (opts.publishedTime) {
    tags.push({ property: "article:published_time", content: opts.publishedTime });
  }
  if (opts.modifiedTime) {
    tags.push({ property: "article:modified_time", content: opts.modifiedTime });
  }
  if (opts.author) tags.push({ property: "article:author", content: opts.author });
  if (opts.section) tags.push({ property: "article:section", content: opts.section });
  return tags;
}

export function canonicalLinks(path: string) {
  const href = absUrl(path);
  return [
    { rel: "canonical", href },
    { rel: "alternate", hrefLang: cityBcp47(), href },
    { rel: "alternate", hrefLang: "x-default", href },
  ];
}