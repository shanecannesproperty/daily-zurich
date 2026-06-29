// Friday/Saturday-only popup promoting the Saturday Weekend Edition.
// Same subscribe flow as the main newsletter form (source: 'weekend-popup').
// Suppressed for 7 days after dismiss and for confirmed subscribers.
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useLocation } from "@tanstack/react-router";
import { X } from "lucide-react";
import { cityName } from "@/lib/city";
import { subscribeNewsletter } from "@/lib/forms.functions";
import { acquirePopupLock, releasePopupLock } from "@/lib/popup-lock";

const DISMISS_KEY = "dc_weekend_popup_dismissed_at";
const SUBSCRIBED_KEYS = ["dn_subscribed", "tdc_nl_subscribed"];
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
const SHOW_DELAY_MS = 30_000;
const EXCLUDED_PREFIXES = ["/admin", "/privacy", "/terms", "/newsletter", "/unsubscribe", "/auth"];

export function WeekendEditionPopup() {
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const subscribe = useServerFn(subscribeNewsletter);
  const startedAt = useRef(0);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const day = new Date().getDay();
    if (day !== 5 && day !== 6) return;
    if (EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p))) return;

    try {
      for (const k of SUBSCRIBED_KEYS) if (localStorage.getItem(k)) return;
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (dismissed && Date.now() - Number(dismissed) < SEVEN_DAYS) return;
    } catch {
      return;
    }

    const t = setTimeout(() => {
      if (!acquirePopupLock()) return;
      setVisible(true);
    }, SHOW_DELAY_MS);
    return () => clearTimeout(t);
  }, [pathname]);

  function dismiss() {
    releasePopupLock();
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !email) return;
    setBusy(true);
    try {
      await subscribe({
        data: { email, source: "weekend-popup", startedAt: startedAt.current },
      });
      try {
        localStorage.setItem("dn_subscribed", "1");
        localStorage.setItem("tdc_nl_subscribed", "1");
      } catch {
        /* ignore */
      }
      setDone(true);
      setTimeout(() => setVisible(false), 3000);
    } catch {
      /* swallow — keep popup open */
    } finally {
      setBusy(false);
    }
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="weekend-popup-h"
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/40 p-4 sm:items-center"
    >
      <div className="relative w-full max-w-md border-2 border-[var(--ink,#2d2d2d)] bg-[var(--bg,#f5f3ee)] p-6 shadow-xl">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="absolute right-2 top-2 p-1 text-[var(--ink-grey,#6b6b6b)] hover:text-[var(--ink,#2d2d2d)]"
        >
          <X size={18} aria-hidden />
        </button>
        <p className="kicker text-[var(--accent,#A32D2D)]">Saturday 6am</p>
        <h2 id="weekend-popup-h" className="serif text-2xl mt-1">
          Get the {cityName()} Weekend Edition
        </h2>
        <p className="meta mt-2 leading-relaxed">
          Your Saturday morning read — top stories, weekend events, what's on, and more.
          Free every Saturday at 6am.
        </p>

        {done ? (
          <p className="mt-4 border border-[var(--accent,#A32D2D)] bg-[var(--surface,#e8e4dd)] px-4 py-3 text-sm">
            You're in. Check your inbox Saturday morning.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full border border-[var(--hairline,#d6d2c9)] bg-[var(--bg,#f5f3ee)] px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full bg-[var(--accent,#A32D2D)] px-4 py-2.5 text-sm font-semibold uppercase tracking-[0.14em] text-white hover:opacity-90 disabled:opacity-60"
            >
              {busy ? "Sending…" : "Send me the weekend edition"}
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="w-full text-xs text-[var(--ink-grey,#6b6b6b)] hover:underline"
            >
              No thanks
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
