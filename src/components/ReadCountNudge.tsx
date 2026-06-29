// "You've read N articles" progressive subscribe nudge. Each article page
// calls `bumpReadCount()` on mount; this banner mounts globally and watches
// the counter. It appears at the 3rd article view and again at the 5th,
// dismissable, hidden permanently for subscribers. Non-blocking — sits at
// the bottom of the page, never covers content.
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { subscribeNewsletter } from "@/lib/forms.functions";
import { cityName, citySlug, siteName } from "@/lib/city";
import {
  SubscriberCount,
  bumpSubscriberCount,
} from "@/components/SubscriberCount";

const COUNT_KEY = `tdc_read_count:${import.meta.env?.MODE ?? "live"}`;
const DISMISS_KEY = "tdc_read_nudge_dismissed_at";
const SUBSCRIBED_KEY = "tdc_nl_subscribed";
const SHOW_AT = [3, 5];
const RESET_DISMISS_MS = 24 * 60 * 60 * 1000; // re-show 24h after a dismiss
const EVT = "read-count-changed";

function todayKey(): string {
  const d = new Date();
  return `${citySlug()}:${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function readCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(COUNT_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { day: string; n: number };
    if (parsed?.day !== todayKey()) return 0;
    return Number.isFinite(parsed?.n) ? parsed.n : 0;
  } catch {
    return 0;
  }
}

function write(n: number) {
  try {
    localStorage.setItem(COUNT_KEY, JSON.stringify({ day: todayKey(), n }));
    window.dispatchEvent(new CustomEvent(EVT));
  } catch { /* ignore */ }
}

// Call from each article page on mount.
export function bumpReadCount() {
  write(readCount() + 1);
}

function recentlyDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = Number.parseInt(raw, 10);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < RESET_DISMISS_MS;
  } catch {
    return false;
  }
}

export function ReadCountNudge() {
  const subscribe = useServerFn(subscribeNewsletter);
  const [count, setCount] = useState(0);
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    function check() {
      if (typeof window === "undefined") return;
      try { if (localStorage.getItem(SUBSCRIBED_KEY)) return; } catch { /* ignore */ }
      const n = readCount();
      setCount(n);
      if (SHOW_AT.includes(n) && !recentlyDismissed()) {
        setVisible(true);
      }
    }
    check();
    window.addEventListener(EVT, check);
    window.addEventListener("storage", check);
    return () => {
      window.removeEventListener(EVT, check);
      window.removeEventListener("storage", check);
    };
  }, []);

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
    setVisible(false);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const result = await subscribe({
        data: { email, source: "read-count-nudge", company: "", startedAt: Date.now() },
      });
      if (result && result.ok === false) throw new Error(result.error ?? "Subscribe failed");
      try { localStorage.setItem(SUBSCRIBED_KEY, "1"); } catch { /* ignore */ }
      bumpSubscriberCount();
      setDone(true);
      setTimeout(() => setVisible(false), 2500);
    } catch (err) {
      console.error("[read-nudge] subscribe failed", err);
    } finally {
      setBusy(false);
    }
  }

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Subscribe nudge"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--ink,#2d2d2d)] bg-[var(--surface,#e8e4dd)] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] print:hidden"
    >
      <div className="container-news flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        {done ? (
          <p className="serif text-base flex-1" role="status">
            You&apos;re in. Check your inbox for {siteName()}.
          </p>
        ) : (
          <>
            <div className="min-w-0 flex-1">
              <p className="serif text-[15px] font-semibold leading-snug">
                You&apos;ve read {count} articles from {siteName()} today.
              </p>
              <p className="meta mt-0.5">
                Join the morning briefing — the day in {cityName()} in a 2-minute read.
              </p>
              <SubscriberCount className="!mt-1 !text-[11px]" />
            </div>
            <form onSubmit={onSubmit} className="flex shrink-0 items-center gap-2" noValidate>
              <label htmlFor="read-nudge-email" className="sr-only">Email address</label>
              <input
                id="read-nudge-email"
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                placeholder="you@example.com.au"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field !py-2 !text-sm min-w-0 max-w-[220px]"
              />
              <button
                type="submit"
                disabled={busy}
                className="btn-primary !py-2 !text-sm whitespace-nowrap disabled:opacity-60"
              >
                {busy ? "…" : "Subscribe free"}
              </button>
            </form>
          </>
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute right-3 top-2 inline-flex h-6 w-6 items-center justify-center text-[var(--ink-grey,#6b6b6b)] hover:text-[var(--ink,#2d2d2d)] sm:static sm:ml-2"
        >
          ×
        </button>
      </div>
    </div>
  );
}
