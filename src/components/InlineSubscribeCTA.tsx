import { useId, useRef, useEffect, useState } from "react";
import { subscribeNewsletter } from "@/lib/forms.functions";
import { useServerFn } from "@tanstack/react-start";
import { useTrackEvent } from "@/hooks/useTrackEvent";
import { cityName, citySlug } from "@/lib/city";
import { SubscriberCount, bumpSubscriberCount } from "./SubscriberCount";

const SESSION_KEY = "daily_inline_shown";

export function InlineSubscribeCTA() {
  const subscribe = useServerFn(subscribeNewsletter);
  const track = useTrackEvent();
  const id = useId();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const startRef = useRef<number>(0);
  useEffect(() => {
    startRef.current = Date.now();
    try {
      if (sessionStorage.getItem(SESSION_KEY)) {
        setShow(false);
        return;
      }
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* ignore */
    }
    setShow(true);
  }, []);


  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const form = e.currentTarget;
    const company = (form.elements.namedItem("company") as HTMLInputElement)?.value ?? "";
    try {
      const result = await subscribe({
        data: { email, source: "inline-article", company, startedAt: startRef.current },
      });
      if (result && result.ok === false) {
        throw new Error(result.error ?? "Subscribe failed");
      }
      track("newsletter_signup", { ref: "inline-article" });
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).dataLayer?.push({
          event: "newsletter_signup",
          source: "inline-article",
          city: citySlug(),
        });
      } catch {
        /* ignore */
      }
      try {
        localStorage.setItem("tdc_nl_subscribed", "1");
      } catch {
        /* SSR */
      }
      bumpSubscriberCount();
      setDone(true);
    } catch (err) {
      console.error("[inline-cta] subscribe failed", err);
      setError("Something went wrong, please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!show) return null;

  return (
    <aside
      className="my-8 border-t border-b border-[var(--ink)] py-5 not-prose relative"
      aria-labelledby={`${id}-h`}
    >
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setShow(false)}
        className="absolute right-1 top-1 text-lg leading-none text-[var(--ink-grey)] hover:text-[var(--ink)] px-2 py-1"
      >
        ×
      </button>
      <div className="flex items-start gap-3">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          width="28"
          height="28"
          className="mt-1 shrink-0 text-[var(--ink-red)]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
        >
          <rect x="3" y="5" width="18" height="14" rx="1" />
          <path d="M3 6l9 7 9-7" />
        </svg>
        <div className="flex-1 min-w-0">
          <p id={`${id}-h`} className="serif text-base sm:text-lg leading-snug pr-6">
            <strong>Get The {cityName()} Insider — free.</strong> Our weekly
            deep-dive into what&apos;s really going on in {cityName()}. Free
            subscribers also get our {cityName()} suburb guide (coming soon).{" "}
            <a
              href="/subscribe?source=inline-cta"
              className="underline text-[var(--ink-red)]"
            >
              Claim your copy →
            </a>
          </p>

          {done ? (
            <p
              role="status"
              aria-live="polite"
              className="serif mt-2 text-sm font-semibold text-[var(--ink-red)]"
            >
              You&apos;re in! Check your inbox.
            </p>
          ) : (
            <form onSubmit={onSubmit} noValidate className="mt-3 flex flex-col sm:flex-row gap-2">
              <label htmlFor={`${id}-email`} className="sr-only">
                Email address
              </label>
              <input
                id={`${id}-email`}
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                placeholder="you@example.com.au"
                className="field flex-1"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <div className="honeypot" aria-hidden="true">
                <label>
                  Do not fill in
                  <input type="text" name="company" tabIndex={-1} autoComplete="off" />
                </label>
              </div>
              <button type="submit" className="btn-primary whitespace-nowrap" disabled={busy}>
                {busy ? "Subscribing" : "Subscribe free"}
              </button>
            </form>
          )}
          {error && (
            <p
              className="mt-2 text-sm font-medium text-[var(--ink-red)]"
              role="alert"
              aria-live="assertive"
            >
              {error}
            </p>
          )}
          {!done && <SubscriberCount />}
        </div>
      </div>
    </aside>
  );
}
