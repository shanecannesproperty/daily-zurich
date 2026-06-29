import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useTrackEvent } from "@/hooks/useTrackEvent";
import { citySlug } from "@/lib/city";

const SESSION_KEY = "tdc_anon_session";

function readSessionId(): string | undefined {
  try {
    return localStorage.getItem(SESSION_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

// Fires a first-party "pageview" event on the initial load and on every
// client-side route change. If the POST fails (blocked by an ad-blocker,
// offline, or 5xx), a beacon is sent to /api/public/track-failure so the
// reconciliation panel can quantify the under-count.
export function PageViewTracker() {
  const track = useTrackEvent();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    // Do not track admin pages: that is operator traffic, not audience.
    if (pathname.startsWith("/admin")) return;
    void (async () => {
      try {
        await track("pageview", { path: pathname });
      } catch (err) {
        // POST blocked, offline, or 5xx — beacon the failure for reconciliation.
        try {
          navigator.sendBeacon?.(
            "/api/public/track-failure",
            new Blob(
              [
                JSON.stringify({
                  path: pathname,
                  reason: String(err).slice(0, 120),
                  anonSessionId: readSessionId(),
                  city: citySlug(),
                }),
              ],
              { type: "application/json" },
            ),
          );
        } catch {
          /* best-effort: never block the UI on analytics */
        }
      }
    })();
  }, [pathname, track]);

  return null;
}
