// Server-only social publishing via the Meta Graph API. Auto-posts a published
// article to a Facebook Page and/or an Instagram Business account. Every entry
// point is a no-op (skipped) when its tokens are absent, so the site never
// breaks if Meta credentials are not configured.
//
// Required env (set in the deploy / Supabase function secrets):
//   FB_PAGE_ID            — numeric Facebook Page ID
//   FB_PAGE_ACCESS_TOKEN  — long-lived Page access token (also used for IG)
//   IG_USER_ID            — Instagram Business account ID (linked to the Page)
//   META_GRAPH_VERSION    — optional, defaults below
//
// Getting tokens: create a Meta app (business type), add the Facebook Login and
// Instagram Graph API products, connect the Page + linked IG Business account,
// then exchange for a long-lived Page token. See docs/search-social-distribution.md.
//
// The *.server.ts extension blocks client imports.

const DEFAULT_GRAPH_VERSION = "v21.0";

function graphVersion(): string {
  return (process.env.META_GRAPH_VERSION || "").trim() || DEFAULT_GRAPH_VERSION;
}

function graphBase(): string {
  return `https://graph.facebook.com/${graphVersion()}`;
}

export interface SocialArticle {
  slug: string;
  title: string;
  url: string;
  dek?: string | null;
  hero_image?: string | null;
  category?: string | null;
}

export interface SocialResult {
  channel: "facebook" | "instagram";
  ok: boolean;
  skipped?: boolean;
  id?: string;
  detail?: string;
}

/** Compose the caption/message body shared by both networks. */
function composeCaption(article: SocialArticle): string {
  const parts = [article.title.trim()];
  const dek = (article.dek || "").trim();
  if (dek) parts.push(dek);
  parts.push(article.url);
  return parts.join("\n\n");
}

/**
 * Post an article to the configured Facebook Page as a link post. Facebook pulls
 * the headline image/description from the page's Open Graph tags. No-op when
 * FB_PAGE_ID / FB_PAGE_ACCESS_TOKEN are unset. Never throws.
 */
export async function postArticleToFacebook(article: SocialArticle): Promise<SocialResult> {
  const pageId = (process.env.FB_PAGE_ID || "").trim();
  const token = (process.env.FB_PAGE_ACCESS_TOKEN || "").trim();
  if (!pageId || !token) {
    return { channel: "facebook", ok: true, skipped: true, detail: "FB_PAGE_ID/token not configured" };
  }
  try {
    const body = new URLSearchParams({
      message: composeCaption(article),
      link: article.url,
      access_token: token,
    });
    const res = await fetch(`${graphBase()}/${pageId}/feed`, { method: "POST", body });
    const data = (await res.json().catch(() => ({}))) as { id?: string; error?: { message?: string } };
    if (res.ok && data.id) return { channel: "facebook", ok: true, id: data.id };
    return { channel: "facebook", ok: false, detail: data.error?.message || `HTTP ${res.status}` };
  } catch (e) {
    return { channel: "facebook", ok: false, detail: String(e) };
  }
}

/**
 * Post an article to the configured Instagram Business account. Instagram REQUIRES
 * an image, so articles without an absolute hero_image URL are skipped. Two-step
 * Graph flow: create a media container, then publish it. No-op when IG_USER_ID /
 * FB_PAGE_ACCESS_TOKEN are unset. Never throws.
 */
export async function postArticleToInstagram(article: SocialArticle): Promise<SocialResult> {
  const igUserId = (process.env.IG_USER_ID || "").trim();
  const token = (process.env.FB_PAGE_ACCESS_TOKEN || "").trim();
  if (!igUserId || !token) {
    return { channel: "instagram", ok: true, skipped: true, detail: "IG_USER_ID/token not configured" };
  }
  const image = (article.hero_image || "").trim();
  if (!/^https?:\/\//i.test(image)) {
    return { channel: "instagram", ok: true, skipped: true, detail: "no absolute hero_image" };
  }
  try {
    // 1. Create the media container. IG captions cannot contain clickable links,
    // so we surface the URL as plain text ("link in bio" is the platform norm).
    const createBody = new URLSearchParams({
      image_url: image,
      caption: composeCaption(article),
      access_token: token,
    });
    const createRes = await fetch(`${graphBase()}/${igUserId}/media`, {
      method: "POST",
      body: createBody,
    });
    const createData = (await createRes.json().catch(() => ({}))) as {
      id?: string;
      error?: { message?: string };
    };
    if (!createRes.ok || !createData.id) {
      return {
        channel: "instagram",
        ok: false,
        detail: createData.error?.message || `container HTTP ${createRes.status}`,
      };
    }
    // 2. Publish the container.
    const publishBody = new URLSearchParams({
      creation_id: createData.id,
      access_token: token,
    });
    const pubRes = await fetch(`${graphBase()}/${igUserId}/media_publish`, {
      method: "POST",
      body: publishBody,
    });
    const pubData = (await pubRes.json().catch(() => ({}))) as {
      id?: string;
      error?: { message?: string };
    };
    if (pubRes.ok && pubData.id) return { channel: "instagram", ok: true, id: pubData.id };
    return {
      channel: "instagram",
      ok: false,
      detail: pubData.error?.message || `publish HTTP ${pubRes.status}`,
    };
  } catch (e) {
    return { channel: "instagram", ok: false, detail: String(e) };
  }
}
