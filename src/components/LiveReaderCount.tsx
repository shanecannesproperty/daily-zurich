import { useEffect, useState } from "react";

function hashSlug(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function LiveReaderCount({ slug }: { slug: string }) {
  const base = 8 + (hashSlug(slug) % 40); // 8..47
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    setCount(base + Math.floor(Math.random() * 6));
    const id = window.setInterval(() => {
      setCount((c) => {
        if (c === null) return base;
        const delta = Math.random() < 0.5 ? -1 : 1;
        const next = c + delta;
        if (next < base - 2) return base - 1;
        if (next > base + 8) return base + 6;
        return next;
      });
    }, 30000);
    return () => window.clearInterval(id);
  }, [base]);

  if (count === null) return null;
  return (
    <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-[var(--ink-muted,#6b6b6b)]">
      <span className="inline-block h-2 w-2 rounded-full bg-[var(--accent,#A32D2D)] animate-pulse" aria-hidden="true" />
      <span>{count} people reading this now</span>
    </p>
  );
}
