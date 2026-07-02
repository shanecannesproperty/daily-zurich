import { useCallback, useEffect, useRef, useState } from "react";
import { citySlug, isCityAustralian, siteName } from "@/lib/city";
import { subscribeNewsletter } from "@/lib/forms.functions";
import { useServerFn } from "@tanstack/react-start";
import { SubscriberCount, bumpSubscriberCount } from "./SubscriberCount";
import { acquirePopupLock, releasePopupLock } from "@/lib/popup-lock";

const DISMISS_KEY = "tdc_scroll_bar_dismissed_at";
const SUBSCRIBED_KEY = "tdc_nl_subscribed";
const DISMISS_DAYS = 7;
const EXCLUDED_PREFIXES = [
  "/admin",
  "/auth",
  "/unsubscribe",
  "/email-preferences",
  "/confirmed",
  "/newsletter",
  "/subscribe",
];
const SHOW_DELAY_MS = 3000;

function isDismissed(): boolean {
  if (typeof window === "undefined") return true;
  if (localStorage.getItem(SUBSCRIBED_KEY)) return true;
  if (localStorage.getItem("dn_subscribed")) return true;
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const ts = parseInt(raw, 10);
  return Date.now() - ts < DISMISS_DAYS * 86_400_000;
}

export function StickyNewsletterBar() {
  const subscribe = useServerFn(subscribeNewsletter);
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const startRef = useRef<number>(0);

  useEffect(() => {
    startRef.current = Date.now();
    if (typeof window === "undefined") return;
    if (isDismissed()) return;
    const path = window.location.pathname;
    if (EXCLUDED_PREFIXES.some((p) => path.startsWith(p))) return;
    const t = setTimeout(() => {
      if (!acquirePopupLock()) return;
      setVisible(true);
    }, SHOW_DELAY_MS);
    return () => clearTimeout(t);
  }, []);


  const dismiss = useCallback(() => {
    releasePopupLock();
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setVisible(false);
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const form = e.currentTarget;
    const company = (form.elements.namedItem("company") as HTMLInputElement)?.value ?? "";
    try {
      await subscribe({
        data: { email, source: "sticky_bar", company, startedAt: startRef.current },
      });
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).dataLayer?.push({
          event: "newsletter_signup",
          source: "sticky_bar",
          city: citySlug(),
        });
      } catch {
        /* ignore */
      }
      try {
        localStorage.setItem(SUBSCRIBED_KEY, "1");
      } catch {
        /* ignore */
      }
      bumpSubscriberCount();
      setDone(true);
      setTimeout(() => setVisible(false), 3000);
    } finally {
      setBusy(false);
    }
  }

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-50 border-t border-[var(--ink)] bg-[var(--surface)] shadow-[0_-4px_12px_rgba(0,0,0,0.08)] animate-in slide-in-from-bottom duration-300"
      role="complementary"
      aria-label="Newsletter signup"
    >
      <div className="container-news flex items-center gap-4 py-3">
        {done ? (
          <p className="serif text-lg flex-1">You&apos;re in. Check your inbox.</p>
        ) : (
          <>
            <div className="hidden sm:block flex-shrink-0">
              <p className="font-serif font-semibold text-base leading-tight">
                Get {siteName()} free every morning
              </p>
              <SubscriberCount className="!mt-0.5 !text-[11px]" />
            </div>
            <form onSubmit={onSubmit} className="flex flex-1 items-center gap-2 min-w-0" noValidate>
              <label htmlFor="sticky-nl-email" className="sr-only">
                Email address
              </label>
              <input
                id="sticky-nl-email"
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                placeholder={isCityAustralian() ? "you@example.com" : "you@example.com"}
                className="field flex-1 min-w-0 !py-2 !text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <div className="honeypot" aria-hidden="true">
                <label>
                  Do not fill in
                  <input type="text" name="company" tabIndex={-1} autoComplete="off" />
                </label>
              </div>
              <button
                type="submit"
                className="btn-primary !py-2 !text-sm whitespace-nowrap"
                disabled={busy}
              >
                {busy ? "..." : "Subscribe"}
              </button>
            </form>
          </>
        )}
        <button
          type="button"
          onClick={dismiss}
          className="flex-shrink-0 p-2 text-[var(--ink-grey)] hover:text-[var(--ink)]"
          aria-label="Dismiss newsletter bar"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M4 4l8 8M12 4l-8 8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
