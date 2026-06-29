// "FRESH" / "JUST IN" pill shown on article cards for very recent stories.
// Self-updates every 60s without re-rendering its parent — pulls from a
// minute-resolution ticker so the badge disappears when the article ages
// past the relevant threshold. Renders nothing once outside both windows.
import { useEffect, useState } from "react";

const JUST_IN_MS = 30 * 60 * 1000; // 30 minutes
const FRESH_MS = 2 * 60 * 60 * 1000; // 2 hours

export function FreshBadge({ publishedAt }: { publishedAt: string | null }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  if (!publishedAt) return null;
  const ts = new Date(publishedAt).getTime();
  if (!Number.isFinite(ts)) return null;
  const age = now - ts;
  if (age < 0 || age > FRESH_MS) return null;

  const isJustIn = age <= JUST_IN_MS;
  const label = isJustIn ? "Just in" : "Fresh";
  const cls = isJustIn
    ? "bg-[var(--ink-red,#A32D2D)] text-white"
    : "bg-[#1f7a3a] text-white";

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] ${cls}`}
      aria-label={`${label} story`}
    >
      {isJustIn && (
        <span aria-hidden className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-white/90" />
      )}
      {label}
    </span>
  );
}
