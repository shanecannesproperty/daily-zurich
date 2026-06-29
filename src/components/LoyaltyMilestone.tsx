// Lifetime reader-loyalty milestones. Persists a single counter in
// localStorage; on each bump, if the new total crosses 10/25/50/100, mark
// the milestone as "pending" so the next page mount renders a celebration
// card. Card is dismissible and only fires once per milestone (the marker
// is moved to "shown" after display).
import { useEffect, useState } from "react";
import { cityName, siteName, siteDomain } from "@/lib/city";

const TOTAL_KEY = "tdc_lifetime_reads";
const PENDING_KEY = "tdc_lifetime_pending";
const SHOWN_KEY = "tdc_lifetime_shown";
const MILESTONES = [10, 25, 50, 100, 250, 500] as const;

function readNumber(key: string): number {
  try {
    const v = localStorage.getItem(key);
    const n = v ? Number.parseInt(v, 10) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function readList(key: string): number[] {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as number[]).filter((n) => Number.isFinite(n)) : [];
  } catch {
    return [];
  }
}

/**
 * Bump the lifetime read counter. Called from article pages alongside the
 * existing daily nudge counter. Idempotent per-slug per-session via the
 * sessionStorage `tdc_lifetime_seen` set so reloads don't double-count.
 */
export function bumpLifetimeRead(slug: string) {
  if (typeof window === "undefined") return;
  try {
    const seenKey = "tdc_lifetime_seen";
    const seen = new Set<string>(
      (sessionStorage.getItem(seenKey) ?? "").split(",").filter(Boolean),
    );
    if (seen.has(slug)) return;
    seen.add(slug);
    sessionStorage.setItem(seenKey, [...seen].join(","));

    const next = readNumber(TOTAL_KEY) + 1;
    localStorage.setItem(TOTAL_KEY, String(next));

    const shown = new Set(readList(SHOWN_KEY));
    const hit = MILESTONES.find((m) => m === next);
    if (hit && !shown.has(hit)) {
      const pending = new Set(readList(PENDING_KEY));
      pending.add(hit);
      localStorage.setItem(PENDING_KEY, JSON.stringify([...pending]));
    }
  } catch {
    /* ignore */
  }
}

export function LoyaltyMilestone() {
  const [milestone, setMilestone] = useState<number | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const pending = readList(PENDING_KEY);
    if (pending.length === 0) return;
    const next = Math.max(...pending);
    setMilestone(next);
    setTotal(readNumber(TOTAL_KEY));
  }, []);

  function dismiss() {
    if (milestone == null) return;
    try {
      const shown = new Set(readList(SHOWN_KEY));
      shown.add(milestone);
      localStorage.setItem(SHOWN_KEY, JSON.stringify([...shown]));
      localStorage.setItem(PENDING_KEY, JSON.stringify([]));
    } catch {
      /* ignore */
    }
    setMilestone(null);
  }

  if (milestone == null) return null;

  const shareText = `I've read ${total} local news articles — try ${siteName()}!`;
  const url =
    typeof window !== "undefined" ? window.location.origin : siteDomain();
  const tweet = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${shareText} ${url}`)}`;
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${url}`)}`;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="loyalty-milestone-h"
      className="fixed bottom-6 right-6 z-40 max-w-sm border border-[var(--ink,#2d2d2d)] bg-[var(--bg,#f5f3ee)] p-5 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.35)] motion-safe:animate-[fadeInUp_0.4s_ease-out]"
    >
      <p className="kicker text-[var(--accent,#A32D2D)]">Reader milestone</p>
      <h2 id="loyalty-milestone-h" className="serif mt-1 text-xl font-semibold leading-tight">
        You&apos;ve read {total} articles on {siteName()}.
      </h2>
      <p className="serif mt-2 text-sm leading-relaxed">
        You&apos;re one of our most loyal {cityName()} readers — thank you for
        keeping local journalism alive.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={tweet}
          target="_blank"
          rel="noopener"
          aria-label="Share this milestone on X"
          className="border border-[var(--ink,#2d2d2d)] px-3 py-1.5 text-xs uppercase tracking-[0.14em] no-underline hover:bg-[var(--ink,#2d2d2d)] hover:text-[var(--bg,#f5f3ee)]"
        >
          Share on X
        </a>
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener"
          aria-label="Share this milestone on WhatsApp"
          className="border border-[var(--hairline,#d6d2c9)] px-3 py-1.5 text-xs uppercase tracking-[0.14em] no-underline hover:bg-[var(--surface,#e8e4dd)]"
        >
          WhatsApp
        </a>
        <button
          type="button"
          onClick={dismiss}
          className="ml-auto text-xs uppercase tracking-[0.14em] underline"
          aria-label="Dismiss milestone celebration"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
