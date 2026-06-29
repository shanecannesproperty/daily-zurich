import { createServerFn } from "@tanstack/react-start";
import { siteDomain } from "@/lib/city";

const MAX_HOPS = 6;
const TIMEOUT_MS = 10_000;

function hostsForCurrentCity(): readonly string[] {
  const bare = siteDomain().replace(/^https?:\/\//, "");
  return [bare, `www.${bare}`] as const;
}

export type Hop = {
  url: string;
  status: number;
  location: string | null;
};

export type HostResult = {
  host: string;
  url: string;
  ok: boolean;
  tlsOk: boolean;
  finalUrl: string | null;
  finalStatus: number | null;
  finalHost: string | null;
  hops: Hop[];
  error: string | null;
  durationMs: number;
};

export type DomainHealthResult = {
  checkedAt: string;
  hosts: HostResult[];
};

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: ctrl.signal,
      headers: { "user-agent": "DailyNetwork-DomainHealth/1.0" },
    });
  } finally {
    clearTimeout(t);
  }
}

async function checkHost(host: string): Promise<HostResult> {
  const start = Date.now();
  const startUrl = `https://${host}/`;
  const hops: Hop[] = [];
  let currentUrl = startUrl;
  let tlsOk = false;
  let error: string | null = null;

  try {
    for (let i = 0; i < MAX_HOPS; i++) {
      const res = await fetchWithTimeout(currentUrl, TIMEOUT_MS);
      tlsOk = true;
      const location = res.headers.get("location");
      hops.push({ url: currentUrl, status: res.status, location });
      if (res.status >= 300 && res.status < 400 && location) {
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }
      break;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  const last = hops[hops.length - 1] ?? null;
  let finalHost: string | null = null;
  try {
    finalHost = last ? new URL(last.url).host : null;
  } catch {
    finalHost = null;
  }

  return {
    host,
    url: startUrl,
    ok: tlsOk && !!last && last.status > 0 && last.status < 400,
    tlsOk,
    finalUrl: last?.url ?? null,
    finalStatus: last?.status ?? null,
    finalHost,
    hops,
    error,
    durationMs: Date.now() - start,
  };
}

export const runDomainHealth = createServerFn({ method: "POST" }).handler(
  async (): Promise<DomainHealthResult> => {
    const hosts = await Promise.all(hostsForCurrentCity().map((h) => checkHost(h)));
    return { checkedAt: new Date().toISOString(), hosts };
  },
);
