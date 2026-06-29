import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useLocation } from "@tanstack/react-router";
import { cityName } from "@/lib/city";
import { subscribeNewsletter } from "@/lib/forms.functions";
import { useTrackEvent } from "@/hooks/useTrackEvent";

const DISMISS_KEY = "dc_exit_intent_dismissed";
const SUBSCRIBED_KEY = "tdc_nl_subscribed";
const EXCLUDED_PREFIXES = ["/admin", "/privacy", "/terms", "/newsletter", "/unsubscribe"];

export function ExitIntentPopup() {
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const subscribe = useServerFn(subscribeNewsletter);
  const track = useTrackEvent();
  const shown = useRef(false);
  const startedAt = useRef(0);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (localStorage.getItem(SUBSCRIBED_KEY)) return;
      if (sessionStorage.getItem(DISMISS_KEY)) return;
    } catch {
      /* SSR */
    }
    if (EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p))) return;
    if (window.matchMedia && window.matchMedia("(max-width: 640px)").matches) return;

    const onMouseLeave = (e: MouseEvent) => {
      if (shown.current) return;
      if (e.clientY > 0) return;
      shown.current = true;
      setVisible(true);
    };
    const onReady = () => {
      window.setTimeout(() => {
        document.addEventListener("mouseleave", onMouseLeave);
      }, 4000);
    };
    onReady();
    return () => document.removeEventListener("mouseleave", onMouseLeave);
  }, [pathname]);

  const dismiss = () => {
    setVisible(false);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* SSR */
    }
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || busy) return;
    setBusy(true);
    const companyEl = e.currentTarget.elements.namedItem("company") as HTMLInputElement | null;
    try {
      await subscribe({
        data: {
          email,
          source: "exit-intent",
          company: companyEl?.value ?? "",
          startedAt: startedAt.current,
        },
      });
      track("newsletter_signup", { ref: "exit-intent" });
      setDone(true);
      try {
        localStorage.setItem(SUBSCRIBED_KEY, "1");
      } catch {
        /* ignore */
      }
      setTimeout(dismiss, 2500);
    } catch {
      /* silent */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 w-full max-w-sm border border-[var(--ink)] bg-white shadow-2xl transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <div className="relative p-6">
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-3 top-3 p-1 text-[var(--ink-muted)] hover:text-[var(--ink)]"
          aria-label="Close"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        {done ? (
          <div className="py-2 text-center">
            <p className="kicker">Welcome aboard</p>
            <h2 className="h2-news mt-1">Check your inbox</h2>
            <p className="dek mt-1">Confirm your email to start receiving the brief.</p>
          </div>
        ) : (
          <>
            <p className="kicker">Before you go</p>
            <h2 className="h2-news mt-1 text-xl">Get the {cityName()} brief</h2>
            <p className="dek mt-1 text-sm">
              The day&apos;s {cityName()} news in a 2-minute read. Free, weekday mornings.
            </p>
            <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com.au"
                autoComplete="email"
                inputMode="email"
                className="w-full border border-[var(--ink)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--ink-red)]"
              />
              <div className="honeypot" aria-hidden="true">
                <label>
                  Do not fill in
                  <input type="text" name="company" tabIndex={-1} autoComplete="off" />
                </label>
              </div>
              <button type="submit" disabled={busy} className="btn-primary justify-center">
                {busy ? "Subscribing..." : "Subscribe free"}
              </button>
              <p className="meta text-center">No spam. Unsubscribe anytime.</p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
