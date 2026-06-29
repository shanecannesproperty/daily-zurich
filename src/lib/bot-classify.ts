// Shared User-Agent classifier. Used by the server-side trackEvent handler
// to tag each row, and by the admin UI to preview/edit the bucket list.
//
// The list is loaded from public.app_settings(key='bot_ua_patterns'). If the
// row is missing or the read fails, we fall back to FALLBACK_PATTERNS so the
// classifier never refuses to make a decision.

export type BotCategory =
  | "human"
  | "googlebot"
  | "bingbot"
  | "social"
  | "seo"
  | "headless"
  | "monitor"
  | "generic";

export const CATEGORY_LABELS: Record<BotCategory, string> = {
  human: "Human",
  googlebot: "Googlebot",
  bingbot: "Bingbot",
  social: "Social unfurlers",
  seo: "SEO crawlers",
  headless: "Headless / preview",
  monitor: "Uptime monitors",
  generic: "Generic bot",
};

export type BotPatterns = Partial<Record<Exclude<BotCategory, "human">, string[]>>;

export const FALLBACK_PATTERNS: BotPatterns = {
  googlebot: ["googlebot", "google-inspectiontool", "adsbot-google"],
  bingbot: ["bingbot", "msnbot"],
  social: [
    "facebookexternalhit", "twitterbot", "linkedinbot", "whatsapp",
    "slackbot", "discordbot", "telegrambot", "skypeuripreview",
  ],
  seo: [
    "semrushbot", "ahrefsbot", "mj12bot", "dotbot", "rogerbot",
    "yandex", "baiduspider", "duckduckbot", "applebot",
  ],
  headless: ["headlesschrome", "phantomjs", "lighthouse", "pagespeed", "playwright", "puppeteer"],
  monitor: ["pingdom", "uptimerobot", "statuscake", "gtmetrix"],
  generic: [
    "bot", "crawler", "spider", "slurp", "wget", "curl", "python-requests",
    "go-http-client", "java/", "libwww", "httpclient", "okhttp",
  ],
};

// Order matters: specific categories first, generic last. Anything that
// matches "googlebot" should be tagged googlebot, not generic, even though
// the substring "bot" would also match.
const CATEGORY_ORDER: Exclude<BotCategory, "human">[] = [
  "googlebot", "bingbot", "social", "seo", "headless", "monitor", "generic",
];

export function classifyUa(ua: string | undefined | null, patterns: BotPatterns = FALLBACK_PATTERNS): {
  isBot: boolean;
  category: BotCategory;
} {
  if (!ua) return { isBot: false, category: "human" };
  const lower = ua.toLowerCase();
  for (const cat of CATEGORY_ORDER) {
    const list = patterns[cat];
    if (!list || list.length === 0) continue;
    if (list.some((p) => p && lower.includes(p.toLowerCase()))) {
      return { isBot: true, category: cat };
    }
  }
  return { isBot: false, category: "human" };
}
