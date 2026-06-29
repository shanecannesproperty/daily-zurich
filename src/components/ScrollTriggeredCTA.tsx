import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useLocation } from "@tanstack/react-router";
import { cityName, citySlug, isCityAustralian } from "@/lib/city";
import { subscribeNewsletter } from "@/lib/forms.functions";
import { useTrackEvent } from "@/hooks/useTrackEvent";

const STORAGE_KEY = "dc_scroll_cta_dismissed";
const SUBSCRIBED_KEY = "tdc_nl_subscribed";
const EXCLUDED_PREFIXES = ["/admin", "/privacy", "/terms"];

export function ScrollTriggeredCTA() {
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const subscribe = useServerFn(subscribeNewsletter);
  const track = useTrackEvent();
  const shown = useRef(false);
  const startedAt = useRef(0);
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* SSR */
    }
  }, []);

  useEffect(() => {
    try {
      if (localStorage.getItem(SUBSCRIBED_KEY)) return;
      if (sessionStorage.getItem(STORAGE_KEY)) return;
    } catch {
      /* SSR */
    }

    const onScroll = () => {
      if (shown.current) return;
      if (EXCLUDED_PREFIXES.some((p) => pathnameRef.current.startsWith(p))) return;
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll <= 0) return;
      const scrollPct = window.scrollY / totalScroll;
      if (scrollPct > 0.45) {
        shown.current = true;
        setVisible(true);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || busy) return;
    setBusy(true);
    const companyEl = e.currentTarget.elements.namedItem("company") as HTMLInputElement | null;
    const company = companyEl?.value ?? "";
    try {
      await subscribe({
        data: {
          email,
          source: "scroll-cta",
          company,
          startedAt: startedAt.current,
        },
      });
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).dataLayer?.push({
          event: "newsletter_signup",
          source: "scroll-cta",
          city: citySlug(),
        });
      } catch {
        /* ignore */
      }
      track("newsletter_signup", { ref: "scroll-cta" });
      setDone(true);
      try {
        localStorage.setItem(SUBSCRIBED_KEY, "1");
      } catch {
        /* ignore */
      }
      setTimeout(dismiss, 3000);
    } catch {
      /* silent — user can use main form */
    } finally {
      setBusy(false);
    }
  };

  if (!visible) return null;
  if (EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--ink)] bg-[var(--ink)] text-white shadow-2xl"
      style={{ animation: "slideUp 0.4s ease-out" }}
    >
      <div className="mx-auto flex max-w-[1180px] items-center gap-3 px-5 py-3 sm:gap-4">
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 p-1 text-white/60 hover:text-white"
          aria-label="Dismiss"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {done ? (
          <p className="flex-1 text-sm font-medium" style={{ color: "#e8d5b5" }}>
            You&apos;re in. Check your inbox.
          </p>
        ) : (
          <>
            <p className="hidden flex-1 text-sm font-medium sm:block">
              The day&apos;s {cityName()} news in a 2-minute read.{" "}
              <span style={{ color: "#e8d5b5" }}>Free, weekday mornings.</span>
            </p>
            <p className="flex-1 text-sm font-medium sm:hidden">
              <span style={{ color: "#e8d5b5" }}>Free daily {cityName()} brief</span>
            </p>
            <form onSubmit={onSubmit} className="flex shrink-0 items-center gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isCityAustralian() ? "you@example.com.au" : "you@example.com"}
                autoComplete="email"
                inputMode="email"
                className="w-40 border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none placeholder:text-white/50 focus:border-[var(--ink-red)] sm:w-56"
              />
              <div className="honeypot" aria-hidden="true">
                <label>
                  Do not fill in
                  <input type="text" name="company" tabIndex={-1} autoComplete="off" />
                </label>
              </div>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-1 bg-[var(--ink-red)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--ink-red-hover)] disabled:opacity-60"
              >
                {busy ? "..." : "Subscribe"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
