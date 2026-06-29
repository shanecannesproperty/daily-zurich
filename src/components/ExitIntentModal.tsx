import { useEffect, useRef, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { cityName } from "@/lib/city";
import { NewsletterForm } from "./NewsletterForm";
import { acquirePopupLock, releasePopupLock } from "@/lib/popup-lock";

const STORAGE_KEY = "tdc_exit_dismissed";
const SUBSCRIBED_KEY = "tdc_nl_subscribed";
const COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000;
const ARM_DELAY_MS = 30000;
const EXCLUDED_PREFIXES = ["/admin", "/privacy", "/terms", "/newsletter", "/unsubscribe"];


export function ExitIntentModal() {
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const shownThisSession = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (shownThisSession.current) return;
    if (EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p))) return;

    try {
      if (localStorage.getItem(SUBSCRIBED_KEY)) return;
      const dismissedAt = Number(localStorage.getItem(STORAGE_KEY) ?? 0);
      if (dismissedAt && Date.now() - dismissedAt < COOLDOWN_MS) return;
    } catch {
      /* SSR / disabled storage */
    }

    let armed = false;
    const trigger = () => {
      if (!armed || shownThisSession.current) return;
      if (!acquirePopupLock()) return;
      shownThisSession.current = true;
      setMounted(true);
      requestAnimationFrame(() => setVisible(true));
    };
    const onMouseLeave = (e: MouseEvent) => {
      if (e.clientY >= 5) return;
      trigger();
    };
    const armTimer = window.setTimeout(() => {
      armed = true;
      document.addEventListener("mouseleave", onMouseLeave);
    }, ARM_DELAY_MS);

    return () => {
      window.clearTimeout(armTimer);
      document.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [pathname]);


  const dismiss = () => {
    releasePopupLock();
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    window.setTimeout(() => setMounted(false), 250);
  };

  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mounted]);

  if (!mounted) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 w-full max-w-sm border border-[var(--ink)] bg-[var(--bg)] shadow-2xl transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-intent-title"
    >
      <div
        className="relative p-6"
      >
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-3 top-3 p-1 text-[var(--ink-muted)] hover:text-[var(--ink)]"
          aria-label="Close"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <p className="kicker">Stay informed</p>
        <h2 id="exit-intent-title" className="h-display mt-2 text-3xl">
          Get {cityName()} news free every morning
        </h2>
        <p className="dek mt-2">
          Join {cityName()} locals who start their day with the daily briefing. Free, weekdays.
        </p>
        <div className="mt-5">
          <NewsletterForm source="exit-intent" variant="compact" />
        </div>
      </div>
    </div>
  );
}

