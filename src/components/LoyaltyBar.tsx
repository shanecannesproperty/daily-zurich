// Reader loyalty bar. Increments a visit counter on every page load (capped
// at 20) and, once the visitor has hit 3+ visits, shows a subtle inbox CTA
// above the footer. Dismiss is persistent; hidden entirely if the visitor is
// already marked as subscribed elsewhere in the app (tdc_nl_subscribed).
import { useEffect, useState } from "react";
import { cityName } from "@/lib/city";

const VISIT_KEY = "tdc_visit_count";
const DISMISS_KEY = "tdc_loyalty_dismissed";
const SUBSCRIBED_KEY = "tdc_nl_subscribed";
const SHOW_AT = 3;
const CAP = 20;

export function LoyaltyBar() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (localStorage.getItem(SUBSCRIBED_KEY)) return;
      if (localStorage.getItem(DISMISS_KEY)) return;
      const raw = Number(localStorage.getItem(VISIT_KEY) ?? 0);
      const next = Math.min(CAP, (Number.isFinite(raw) ? raw : 0) + 1);
      localStorage.setItem(VISIT_KEY, String(next));
      if (next >= SHOW_AT) setShow(true);
    } catch {
      /* storage disabled */
    }
  }, []);

  if (!show) return null;

  return (
    <div
      className="border-t border-b border-[var(--accent,#A32D2D)] bg-[var(--surface,#e8e4dd)]"
      role="region"
      aria-label="Subscribe prompt"
    >
      <div className="container-news flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
        <p className="serif">
          You&apos;re one of our regular readers. Get {cityName()} news in your inbox.
        </p>
        <div className="flex items-center gap-3">
          <a
            href="/subscribe?source=loyalty"
            className="inline-block bg-[var(--accent,#A32D2D)] text-white px-3 py-1.5 no-underline text-xs uppercase tracking-[0.14em]"
          >
            Subscribe free
          </a>
          <button
            type="button"
            onClick={() => {
              try {
                localStorage.setItem(DISMISS_KEY, "1");
              } catch {
                /* ignore */
              }
              setShow(false);
            }}
            className="text-[var(--ink-muted,#6b6b6b)] hover:text-[var(--ink)]"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
