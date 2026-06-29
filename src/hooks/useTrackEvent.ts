import { useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { trackEvent } from "@/lib/analytics.functions";
import { citySlug } from "@/lib/city";
import type { SiteEventName } from "@/lib/schema";

const SESSION_KEY = "tdc_anon_session";

// Anonymous, non-PII session id. Random per browser, stored first-party. It is
// not tied to any account or email and only lets us count unique visits.
function anonSessionId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID().replace(/-/g, "")
          : Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return undefined;
  }
}

function currentPath(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return window.location.pathname;
}

// Returns a fire-and-forget tracker. It writes a first-party event row and also
// pushes to the GA4 dataLayer, so both analytics stores stay in step. It never
// throws and is a no-op during SSR.
const ENTRY_REFERRER_KEY = "tdc_entry_referrer";
const ENTRY_UTM_KEY = "tdc_entry_utm";

// Capture the session ENTRY referrer once (external page that linked here).
// Read from sessionStorage so SPA route changes never overwrite the true source.
function entryReferrer(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    let r = sessionStorage.getItem(ENTRY_REFERRER_KEY);
    if (r === null) {
      r = document.referrer || "";
      sessionStorage.setItem(ENTRY_REFERRER_KEY, r);
    }
    return r || undefined;
  } catch {
    return document.referrer || undefined;
  }
}

// Capture UTM params from the entry URL (path itself stays clean).
function entryUtm(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    let u = sessionStorage.getItem(ENTRY_UTM_KEY);
    if (u === null) {
      const p = new URLSearchParams(window.location.search);
      u = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]
        .map((k) => (p.get(k) ? `${k}=${p.get(k)}` : null))
        .filter(Boolean)
        .join("&");
      sessionStorage.setItem(ENTRY_UTM_KEY, u);
    }
    return u || undefined;
  } catch {
    return undefined;
  }
}

export function useTrackEvent() {
  const send = useServerFn(trackEvent);
  return useCallback(
    async (eventName: SiteEventName, opts?: { ref?: string; path?: string }): Promise<void> => {
      if (typeof window === "undefined") return;
      const path = opts?.path ?? currentPath();
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).dataLayer?.push({ event: eventName, city: citySlug(), path, ref: opts?.ref });
      } catch {
        /* ignore */
      }
      await send({
        data: {
          eventName,
          path,
          ref: opts?.ref,
          anonSessionId: anonSessionId(),
          referrer: entryReferrer(),
          utm: entryUtm(),
        },
      });
    },
    [send],
  );
}
