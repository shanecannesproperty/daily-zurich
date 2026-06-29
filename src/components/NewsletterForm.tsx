import { useId, useState, useRef, useEffect } from "react";
import { cityName, citySlug, siteName } from "@/lib/city";
import { subscribeNewsletter } from "@/lib/forms.functions";
import { useServerFn } from "@tanstack/react-start";
import { useTrackEvent } from "@/hooks/useTrackEvent";
import { SubscriberCount, bumpSubscriberCount } from "./SubscriberCount";

export function NewsletterForm({
  source,
  variant = "band",
  title,
  blurb,
  wantsWeatherAlerts = false,
}: {
  source: string;
  variant?: "band" | "inline" | "compact";
  /** Overrides the band heading. Defaults to "{siteName} brief". */
  title?: string;
  /** Overrides the descriptive line above the input. */
  blurb?: string;
  /** Tags the subscriber as wanting severe-weather alerts (weather page CTA). */
  wantsWeatherAlerts?: boolean;
}) {
  const subscribe = useServerFn(subscribeNewsletter);
  const track = useTrackEvent();
  const id = useId();
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const startRef = useRef<number>(0);
  useEffect(() => {
    startRef.current = Date.now();
  }, []);

  const [error, setError] = useState<string | null>(null);


  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const form = e.currentTarget;
    const company = (form.elements.namedItem("company") as HTMLInputElement)?.value ?? "";
    try {
      const result = await subscribe({
        data: { email, source, company, startedAt: startRef.current, wantsWeatherAlerts },
      });
      if (result && result.ok === false) {
        throw new Error(result.error ?? "Subscribe failed");
      }
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).dataLayer?.push({
          event: "newsletter_signup",
          source,
          city: citySlug(),
        });
      } catch {
        /* ignore */
      }
      track("newsletter_signup", { ref: source });
      try {
        localStorage.setItem("tdc_nl_subscribed", "1");
      } catch {
        /* SSR */
      }
      bumpSubscriberCount();
      setReferralCode(
        result && "referralCode" in result ? (result.referralCode ?? null) : null,
      );
      setDone(true);
    } catch (err) {
      console.error("[newsletter] subscribe failed", err);
      setError("Something went wrong, please try again.");
    } finally {
      setBusy(false);
    }
  }


  if (done) {
    const refUrl =
      referralCode && typeof window !== "undefined"
        ? `${window.location.origin}/r/${referralCode}`
        : null;
    return (
      <div role="status" aria-live="polite" className="newsletter-success">
        <div className="flex items-start gap-4">
          <span
            aria-hidden="true"
            className="envelope-bounce inline-flex h-12 w-12 flex-none items-center justify-center rounded-full border border-[var(--hairline,#d6d2c9)] bg-[var(--surface,#e8e4dd)] text-[var(--accent,#A32D2D)]"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="1.5" />
              <path d="m3 7 9 6 9-6" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="serif text-xl font-semibold">Check your inbox!</p>
            <p className="meta mt-1">
              We sent a welcome to <strong>{email}</strong>. While you wait, read today&apos;s top stories.
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <a href="/editions" className="btn-primary">Read today&apos;s edition</a>
          <button
            type="button"
            onClick={() => {
              setDone(false);
              setEmail("");
              setReferralCode(null);
            }}
            className="meta underline decoration-dotted underline-offset-2"
          >
            Wrong email? Start over
          </button>
        </div>
        {refUrl && (
          <div className="mt-5 border-t border-[var(--hairline)] pt-4">
            <p className="meta mb-2">
              Share with a friend and grow your city&apos;s news together:
            </p>
            <div className="flex gap-2 flex-wrap items-center">
              <code className="meta bg-[var(--surface)] px-3 py-1.5 rounded-sm text-xs flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                {refUrl}
              </code>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(refUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="btn-ghost text-xs px-3 py-1.5 whitespace-nowrap"
              >
                {copied ? "Copied!" : "Copy link"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }



  const isBand = variant === "band";
  const isCompact = variant === "compact";

  return (
    <form onSubmit={onSubmit} noValidate aria-labelledby={`${id}-h`}>
      {isBand && (
        <h2 id={`${id}-h`} className="h-display text-3xl">
          {title ?? `${siteName()} brief`}
        </h2>
      )}
      {(blurb || !isCompact) && (
        <p className="meta mt-2 max-w-xl">
          {blurb ?? (
            <>The day&apos;s {cityName()} news in a 2-minute read, every weekday morning. Free.</>
          )}
        </p>
      )}
      <div className={`mt-4 flex ${isCompact ? "flex-col gap-2" : "flex-col sm:flex-row gap-2"}`}>
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
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? "Subscribing" : "Subscribe"}
        </button>
      </div>
      {error && (
        <p
          className="mt-3 text-sm font-medium text-[var(--ink-red)]"
          role="alert"
          aria-live="assertive"
        >
          {error}
        </p>
      )}
      <SubscriberCount />
      <p className="meta mt-3">
        By subscribing you agree to receive emails from {siteName()} and accept our{" "}
        <a href="/privacy">Privacy Policy</a>. Unsubscribe anytime.
      </p>
    </form>
  );
}
