// Helpers for rendering source media: recognising and embedding video URLs
// (YouTube / Vimeo) and validating image URLs. Kept framework-free and pure so
// it can be unit tested in plain Node. The image guard mirrors EventImage's
// `isRealCover`: only real http(s) photos, never a branded fallback tile.

const FALLBACK_MARKERS = ["-fallback-tile"];
const RETIRED_IMAGE_HOSTS = ["source.unsplash.com"];

// True only for a real, remote http(s) image we are willing to render.
export function isRealImage(url: string | null | undefined): url is string {
  if (typeof url !== "string") return false;
  const u = url.trim();
  if (u.length === 0) return false;
  const lower = u.toLowerCase();
  if (FALLBACK_MARKERS.some((m) => lower.includes(m))) return false;
  if (!/^https?:\/\//i.test(u)) return false;
  try {
    const host = new URL(u).hostname.toLowerCase();
    if (RETIRED_IMAGE_HOSTS.includes(host)) return false;
  } catch {
    return false;
  }
  return true;
}

export type VideoProvider = "youtube" | "vimeo";

export interface ParsedVideo {
  provider: VideoProvider;
  id: string;
  // Privacy-friendly embed URL. Never autoplays; no sound is started here.
  embedUrl: string;
  // The canonical watch URL on the provider, for the "watch on source" link.
  watchUrl: string;
  // Best-effort still thumbnail (YouTube only; null for Vimeo, which needs an
  // API call we do not make server-side). Callers fall back to a play poster.
  thumbnailUrl: string | null;
}

function parseYouTube(u: URL): ParsedVideo | null {
  const host = u.hostname.replace(/^www\./, "").toLowerCase();
  let id: string | null = null;
  if (host === "youtu.be") {
    id = u.pathname.slice(1).split("/")[0] || null;
  } else if (
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "youtube-nocookie.com"
  ) {
    if (u.pathname === "/watch") {
      id = u.searchParams.get("v");
    } else if (u.pathname.startsWith("/embed/")) {
      id = u.pathname.slice("/embed/".length).split("/")[0] || null;
    } else if (u.pathname.startsWith("/shorts/")) {
      id = u.pathname.slice("/shorts/".length).split("/")[0] || null;
    } else if (u.pathname.startsWith("/live/")) {
      id = u.pathname.slice("/live/".length).split("/")[0] || null;
    }
  }
  if (!id || !/^[A-Za-z0-9_-]{6,20}$/.test(id)) return null;
  return {
    provider: "youtube",
    id,
    // youtube-nocookie + no autoplay + modestbranding; rel=0 keeps related
    // videos to the same channel. Sound never starts on its own.
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`,
    watchUrl: `https://www.youtube.com/watch?v=${id}`,
    thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  };
}

function parseVimeo(u: URL): ParsedVideo | null {
  const host = u.hostname.replace(/^www\./, "").toLowerCase();
  if (host !== "vimeo.com" && host !== "player.vimeo.com") return null;
  // vimeo.com/123456789  or  player.vimeo.com/video/123456789
  const m = u.pathname.match(/(?:\/video)?\/(\d{6,})/);
  const id = m?.[1] ?? null;
  if (!id) return null;
  return {
    provider: "vimeo",
    id,
    embedUrl: `https://player.vimeo.com/video/${id}?dnt=1`,
    watchUrl: `https://vimeo.com/${id}`,
    thumbnailUrl: null,
  };
}

// Parse a YouTube or Vimeo URL into an embeddable shape. Returns null for any
// other URL so callers can fall back to a plain link.
export function parseVideoUrl(url: string | null | undefined): ParsedVideo | null {
  if (typeof url !== "string") return null;
  const raw = url.trim();
  if (!/^https?:\/\//i.test(raw)) return null;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  return parseYouTube(u) ?? parseVimeo(u);
}

export function isVideoUrl(url: string | null | undefined): boolean {
  return parseVideoUrl(url) !== null;
}

// Hostname for a credit line, e.g. "abc.net.au". Null when unparseable.
export function hostOf(url: string | null | undefined): string | null {
  if (typeof url !== "string" || url.trim().length === 0) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
