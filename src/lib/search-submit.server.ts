// Server-only search-engine submission. Notifies search engines the moment new
// content is published so it gets crawled/indexed without waiting for the next
// natural crawl. Two independent channels, each a no-op when its config is
// absent so the site never breaks if a key is missing:
//
//   1. IndexNow  — Bing, Yandex, Seznam, Naver. Keyless beyond the public key
//      file already served at /<INDEXNOW_KEY>.txt. Idempotent: re-submitting a
//      URL is harmless, so callers may resubmit freely.
//   2. Google Indexing API — requires a Google service-account JSON key in the
//      GOOGLE_INDEXING_SA_KEY env var. NOTE: Google officially supports this API
//      only for JobPosting / BroadcastEvent pages; general news URLs are better
//      surfaced via the news-sitemap. It is wired here for completeness and only
//      runs when a key is configured.
//
// The *.server.ts extension blocks client imports.
import { createSign } from "node:crypto";

// Matches the key file route at src/routes/d4c7…txt.ts. Override per-deploy with
// INDEXNOW_KEY (and serve a matching <key>.txt at the domain root).
const DEFAULT_INDEXNOW_KEY = "d4c7b8e1f92c3a5e6f7b8c9d0e1fa3b4";

export interface SubmitResult {
  channel: "indexnow" | "google";
  ok: boolean;
  submitted: number;
  status?: number;
  detail?: string;
  skipped?: boolean;
}

function indexNowKey(): string {
  return (process.env.INDEXNOW_KEY || "").trim() || DEFAULT_INDEXNOW_KEY;
}

/**
 * Submit a batch of absolute URLs to IndexNow. All URLs must share one host.
 * Returns a skipped result for an empty batch; never throws.
 */
export async function submitIndexNow(urls: string[]): Promise<SubmitResult> {
  const list = [...new Set(urls.filter((u) => /^https?:\/\//i.test(u)))];
  if (list.length === 0) {
    return { channel: "indexnow", ok: true, submitted: 0, skipped: true, detail: "no urls" };
  }
  let host: string;
  try {
    host = new URL(list[0]).host;
  } catch {
    return { channel: "indexnow", ok: false, submitted: 0, detail: "invalid url" };
  }
  const key = indexNowKey();
  const payload = {
    host,
    key,
    keyLocation: `https://${host}/${key}.txt`,
    // IndexNow accepts up to 10,000 URLs per request; we stay well under.
    urlList: list.slice(0, 10000),
  };
  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    });
    // 200 (accepted) and 202 (received, validating) are both success.
    const ok = res.status === 200 || res.status === 202;
    return {
      channel: "indexnow",
      ok,
      submitted: ok ? payload.urlList.length : 0,
      status: res.status,
      detail: ok ? undefined : await res.text().catch(() => `HTTP ${res.status}`),
    };
  } catch (e) {
    return { channel: "indexnow", ok: false, submitted: 0, detail: String(e) };
  }
}

// ── Google Indexing API ──────────────────────────────────────────────────────

interface ServiceAccount {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

function loadServiceAccount(): ServiceAccount | null {
  const raw = (process.env.GOOGLE_INDEXING_SA_KEY || "").trim();
  if (!raw) return null;
  try {
    const json = JSON.parse(raw) as ServiceAccount;
    if (!json.client_email || !json.private_key) return null;
    // Allow keys pasted with literal "\n" sequences in the private key.
    json.private_key = json.private_key.replace(/\\n/g, "\n");
    return json;
  } catch {
    return null;
  }
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Mint a short-lived OAuth2 access token from the service account via a signed
// JWT bearer grant (RFC 7523). Avoids pulling in googleapis just for this.
async function googleAccessToken(sa: ServiceAccount): Promise<string | null> {
  const tokenUri = sa.token_uri || "https://oauth2.googleapis.com/token";
  const iat = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/indexing",
      aud: tokenUri,
      iat,
      exp: iat + 3600,
    }),
  );
  const signingInput = `${header}.${claim}`;
  let signature: string;
  try {
    signature = base64url(createSign("RSA-SHA256").update(signingInput).sign(sa.private_key));
  } catch {
    return null;
  }
  const assertion = `${signingInput}.${signature}`;
  try {
    const res = await fetch(tokenUri, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token?: string };
    return data.access_token ?? null;
  } catch {
    return null;
  }
}

/**
 * Notify Google's Indexing API that each URL was updated. No-op (skipped) when
 * GOOGLE_INDEXING_SA_KEY is not configured. Returns an aggregate result; never
 * throws. Each URL is one request per Google's API contract.
 */
export async function submitGoogleIndexing(urls: string[]): Promise<SubmitResult> {
  const list = [...new Set(urls.filter((u) => /^https?:\/\//i.test(u)))];
  if (list.length === 0) {
    return { channel: "google", ok: true, submitted: 0, skipped: true, detail: "no urls" };
  }
  const sa = loadServiceAccount();
  if (!sa) {
    return {
      channel: "google",
      ok: true,
      submitted: 0,
      skipped: true,
      detail: "GOOGLE_INDEXING_SA_KEY not configured",
    };
  }
  const token = await googleAccessToken(sa);
  if (!token) {
    return { channel: "google", ok: false, submitted: 0, detail: "failed to mint access token" };
  }
  let submitted = 0;
  let lastStatus = 0;
  let lastError: string | undefined;
  for (const url of list) {
    try {
      const res = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ url, type: "URL_UPDATED" }),
      });
      lastStatus = res.status;
      if (res.ok) submitted += 1;
      else lastError = await res.text().catch(() => `HTTP ${res.status}`);
    } catch (e) {
      lastError = String(e);
    }
  }
  return {
    channel: "google",
    ok: submitted > 0 || list.length === 0,
    submitted,
    status: lastStatus,
    detail: lastError,
  };
}
