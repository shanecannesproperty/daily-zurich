import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Radio } from "lucide-react";
import { formatShortDate, timeAgo } from "@/lib/date";
import { hostOf, type SyndicatedStoryWithSource } from "@/lib/syndication";
import { decodeEntities } from "@/lib/decode-entities";

// Auto-rotates through featured syndicated stories (recency-ordered).
// Cycles every `intervalMs`; pauses on hover/focus so a reader scanning the
// rail isn't yanked to a new item mid-read. Dots also let readers jump.
export function TopStoriesRotator({
  items,
  intervalMs = 6000,
}: {
  items: SyndicatedStoryWithSource[];
  intervalMs?: number;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (items.length <= 1 || paused) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [items.length, paused, intervalMs]);

  if (items.length === 0) return null;
  const safeIndex = index % items.length;
  const current = items[safeIndex];
  const when = current.source_published_at ?? current.fetched_at;
  const sourceName = current.source?.name ?? hostOf(current.link) ?? "Source";

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-[var(--ink-red)]" aria-hidden />
          <h2 className="kicker">Top stories</h2>
        </div>
        <span className="meta" aria-live="polite">
          {safeIndex + 1} / {items.length}
        </span>
      </div>

      <article
        key={current.id}
        className="border-t border-[var(--hairline)] pt-4 transition-opacity duration-500"
      >
        <p className="meta uppercase tracking-widest">
          {sourceName} ·{" "}
          <time dateTime={when} suppressHydrationWarning>
            {timeAgo(when)}
          </time>
        </p>
        <h3 className="h3-card mt-1">
          <Link
            to="/story/$slug"
            params={{ slug: current.slug }}
            className="no-underline hover:underline"
          >
            {decodeEntities(current.title)}
          </Link>
        </h3>
        {current.dek && <p className="meta mt-2 line-clamp-3">{decodeEntities(current.dek)}</p>}
        <p className="meta mt-2">
          <time dateTime={when}>{formatShortDate(when)}</time>
        </p>
      </article>

      {items.length > 1 && (
        <div className="mt-4 flex items-center gap-2" role="tablist" aria-label="Top stories">
          {items.map((it, i) => (
            <button
              key={it.id}
              role="tab"
              aria-selected={i === safeIndex}
              aria-label={`Show story ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-1.5 w-6 transition-colors ${
                i === safeIndex ? "bg-[var(--ink-red)]" : "bg-[var(--hairline)]"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
