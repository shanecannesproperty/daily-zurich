// Social-proof subscriber counter shown beneath newsletter sign-up inputs.
// Seeded per city; persisted + incremented in localStorage so the number
// feels alive without needing a backend. The seed is deliberately not
// secret — readers can see it move when they subscribe.
import { useEffect, useState } from "react";
import { citySlug, cityName, siteName } from "@/lib/city";

const KEY = "tdc_subscriber_count";

const SEEDS: Record<string, number> = {};
const DEFAULT_SEED = 0;

function readCount(): number {
  if (typeof window === "undefined") return seedFor();
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw == null ? NaN : Number.parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  } catch {
    /* storage disabled */
  }
  return seedFor();
}

function seedFor(): number {
  return SEEDS[citySlug()] ?? DEFAULT_SEED;
}

function write(n: number) {
  try {
    localStorage.setItem(KEY, String(n));
    window.dispatchEvent(new CustomEvent("subscriber-count-changed"));
  } catch {
    /* ignore */
  }
}

// Public helper for newsletter form `onSubmit` success paths.
export function bumpSubscriberCount() {
  const next = readCount() + 1;
  write(next);
  return next;
}

export function SubscriberCount({ className = "" }: { className?: string }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    setCount(readCount());
    const sync = () => setCount(readCount());
    window.addEventListener("subscriber-count-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("subscriber-count-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // Don't flash a number from a different city while we hydrate.
  // Don't show until there are real subscribers to count.
  if (count === null || count < 1) return null;

  return (
    <p
      className={`meta mt-2 text-[var(--ink-grey,#6b6b6b)] ${className}`.trim()}
      aria-live="polite"
    >
      Join <strong className="text-[var(--ink,#2d2d2d)]">{count.toLocaleString("en-AU")}</strong>{" "}
      locals getting {siteName()} every morning.
    </p>
  );
}
