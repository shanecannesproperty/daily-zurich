// Public, no-auth GET of The Lawson's network featured-development feed for
// THIS site's slug. Server-side only so a slow or absent upstream never
// blocks the page; every failure mode degrades to an empty list.
//
// Editorial rules enforced downstream by the component, not here:
// - Surrounding copy is written locally for a Canberra NEWS / city-lifestyle
//   audience. The feed's facts/images are used; the feed's words are not.
// - "Price on application" only. Dollar values are never rendered.
// - Canonical for the page hosting this section stays self-referential; the
//   single contextual link out to The Lawson is the only outbound link.
import { createServerFn } from "@tanstack/react-start";

const FEED_URL =
  "https://zrsrvnxbcxjzrzxifodn.supabase.co/functions/v1/public-featured-development-feed?site=dailycanberra";
const FETCH_TIMEOUT_MS = 3_000;

export type FeaturedDevelopmentSlot = "house_display" | "newsletter_sponsor";

export type FeaturedDevelopmentPlacement = {
  id: string;
  slot_type: FeaturedDevelopmentSlot;
  project_name: string;
  suburb: string | null;
  developer: string | null;
  image_url: string | null;
  // Short factual snippet from the feed (e.g. typology, beds, completion).
  // We use facts only; surrounding editorial voice is written locally.
  fact_summary: string | null;
  // Self-referential canonical for THIS site (Daily Canberra). Used to assert
  // we are the canonical home of this placement on our domain.
  self_canonical_url: string;
  // The single contextual in-content link out to The Lawson.
  lawson_link_url: string;
  // Required sponsorship disclosure label exactly as supplied by the feed.
  disclosure_label: string;
};

function asStr(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}
function isHttp(u: string | null): u is string {
  return !!u && /^https?:\/\//i.test(u);
}
function asSlot(v: unknown): FeaturedDevelopmentSlot | null {
  return v === "house_display" || v === "newsletter_sponsor" ? v : null;
}

function normalise(raw: unknown): FeaturedDevelopmentPlacement | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (asStr(r.status) && asStr(r.status) !== "live") return null;
  const slot = asSlot(r.slot_type);
  if (!slot) return null;
  const self = asStr(r.self_canonical_url);
  const lawson = asStr(r.lawson_link_url);
  const disclosure = asStr(r.disclosure_label);
  const project = asStr(r.project_name) ?? asStr(r.title);
  if (!isHttp(self) || !isHttp(lawson) || !disclosure || !project) return null;
  const img = asStr(r.image_url) ?? asStr(r.thumbnail);
  return {
    id: asStr(r.id) ?? `${slot}:${project}`,
    slot_type: slot,
    project_name: project,
    suburb: asStr(r.suburb) ?? asStr(r.location),
    developer: asStr(r.developer) ?? asStr(r.brand),
    image_url: isHttp(img) ? img : null,
    fact_summary: asStr(r.fact_summary) ?? asStr(r.summary),
    self_canonical_url: self,
    lawson_link_url: lawson,
    disclosure_label: disclosure,
  };
}

export const getFeaturedDevelopment = createServerFn({ method: "GET" }).handler(async () => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(FEED_URL, {
      method: "GET",
      redirect: "follow",
      signal: ctrl.signal,
      headers: {
        accept: "application/json",
        "user-agent": "DailyNetwork-FeaturedDevelopment/1.0",
      },
    });
    if (!res.ok) return [] as FeaturedDevelopmentPlacement[];
    const payload = (await res.json()) as unknown;
    const list =
      payload && typeof payload === "object" && Array.isArray((payload as { placements?: unknown }).placements)
        ? ((payload as { placements: unknown[] }).placements)
        : [];
    const out: FeaturedDevelopmentPlacement[] = [];
    for (const raw of list) {
      const p = normalise(raw);
      if (p) out.push(p);
    }
    return out;
  } catch {
    return [] as FeaturedDevelopmentPlacement[];
  } finally {
    clearTimeout(timer);
  }
});
