// Cross-link feed: a small, curated set of OUTBOUND links to What's On Canberra
// (WoC) for the homepage "What's on this weekend" module.
//
// This is a TRAFFIC/LINK hook only. We never store, cache to the database, or
// re-publish WoC's content. We fetch their public upcoming-events feed
// server-side (in the route loader, never client-side), normalise it, and hand
// the component a list of links out to WoC. The component renders nothing when
// this returns an empty list, so a slow or absent feed never affects the page.
//
// IMPORTANT: the upstream endpoint does not exist yet (it is being built on the
// WoC side in parallel). Every failure mode here degrades to an empty list:
// wrong city, non-200, malformed JSON, timeout, or zero events.
import { createServerFn } from "@tanstack/react-start";
import { citySlug } from "@/lib/city";

// Public upcoming-events feed on the What's On Canberra site. Outbound only.
const WHATSON_FEED_URL = "https://whatsoncanberra.com.au/api/events/upcoming.json";
// Keep the feed strictly off the page critical path: time out fast so a slow
// or hanging endpoint never delays server rendering of the homepage.
const FETCH_TIMEOUT_MS = 3_000;
// We only surface a compact list; more than this is noise on the homepage.
const MAX_EVENTS = 6;

export type WhatsOnEvent = {
  // Stable-ish key for React lists. Derived from the WoC url when no id given.
  id: string;
  title: string;
  // ISO date/time string when available; used only for display, never parsed
  // for scheduling logic.
  date: string | null;
  venue: string | null;
  // Outbound deep link to the WoC event page. Always an absolute http(s) url.
  url: string;
  // Optional small thumbnail; only rendered when it is a real http(s) image.
  thumbnail: string | null;
};

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isHttpUrl(value: string | null): value is string {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

// Accepts a single raw feed entry of unknown shape and returns a normalised
// WhatsOnEvent, or null when it is unusable (no title, or no valid outbound
// url). Field names are matched leniently so small upstream naming differences
// do not break the cross-link.
export function normaliseWhatsOnEvent(raw: unknown): WhatsOnEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const url = asString(r.url) ?? asString(r.link) ?? asString(r.permalink);
  if (!isHttpUrl(url)) return null;

  const title = asString(r.title) ?? asString(r.name);
  if (!title) return null;

  const date =
    asString(r.date) ?? asString(r.start) ?? asString(r.start_at) ?? asString(r.starts_at);
  const venue = asString(r.venue) ?? asString(r.location) ?? asString(r.place);
  const thumbRaw = asString(r.thumbnail) ?? asString(r.image) ?? asString(r.image_url);
  const thumbnail = isHttpUrl(thumbRaw) ? thumbRaw : null;
  const id = asString(r.id) ?? asString(r.slug) ?? url;

  return { id, title, date, venue, url, thumbnail };
}

// Parses a raw JSON payload (already decoded) into a normalised, capped list.
// Tolerates either a bare array or an object wrapping the array under common
// keys. Returns an empty array for any unexpected shape.
export function parseWhatsOnFeed(payload: unknown): WhatsOnEvent[] {
  let list: unknown = payload;
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const obj = payload as Record<string, unknown>;
    list = obj.events ?? obj.items ?? obj.data ?? obj.results;
  }
  if (!Array.isArray(list)) return [];
  const out: WhatsOnEvent[] = [];
  for (const raw of list) {
    const ev = normaliseWhatsOnEvent(raw);
    if (ev) out.push(ev);
    if (out.length >= MAX_EVENTS) break;
  }
  return out;
}

// Fetches the WoC feed with a hard timeout. Any failure resolves to an empty
// list rather than throwing, so the homepage loader never blocks or errors on
// account of this optional, best-effort cross-link.
async function fetchWhatsOnEvents(): Promise<WhatsOnEvent[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(WHATSON_FEED_URL, {
      method: "GET",
      redirect: "follow",
      signal: ctrl.signal,
      headers: {
        accept: "application/json",
        "user-agent": "DailyNetwork-WhatsOnCrosslink/1.0",
      },
    });
    if (!res.ok) return [];
    const payload = (await res.json()) as unknown;
    return parseWhatsOnFeed(payload);
  } catch {
    // Network error, abort/timeout, or invalid JSON: degrade to nothing.
    return [];
  } finally {
    clearTimeout(timer);
  }
}

// Server function consumed by the homepage loader. Only the Canberra build has
// a What's On equivalent to link to, so every other city short-circuits to an
// empty list and the module never renders.
export const getWhatsOnEvents = createServerFn({ method: "GET" }).handler(async () => {
  if (citySlug() !== "canberra") return [] as WhatsOnEvent[];
  return fetchWhatsOnEvents();
});
