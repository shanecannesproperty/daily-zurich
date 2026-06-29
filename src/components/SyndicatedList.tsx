import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Radio } from "lucide-react";
import { formatShortDate, timeAgo } from "@/lib/date";
import { hostOf, type SyndicatedStoryWithSource } from "@/lib/syndication";
import { decodeEntities } from "@/lib/decode-entities";

// Hydration-stable relative time.
function TimeAgo({ iso }: { iso: string | null }) {
  const safe = iso ?? new Date().toISOString();
  const [label, setLabel] = useState(() => formatShortDate(safe));
  useEffect(() => {
    setLabel(timeAgo(safe));
  }, [safe]);
  return (
    <time dateTime={safe} suppressHydrationWarning>
      {label}
    </time>
  );
}

export function SyndicatedList({
  items,
  limit,
  showHeading = true,
  heading = "Live now",
}: {
  items: SyndicatedStoryWithSource[];
  limit?: number;
  showHeading?: boolean;
  heading?: string;
}) {
  const rows = typeof limit === "number" ? items.slice(0, limit) : items;
  if (rows.length === 0) return null;

  return (
    <div>
      {showHeading && (
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-[var(--ink-red)]" aria-hidden />
          <h2 className="kicker">{heading}</h2>
        </div>
      )}

      <ul className="mt-4 divide-y divide-[var(--hairline)]">
        {rows.map((r) => {
          const sourceName = r.source?.name ?? hostOf(r.link) ?? "Source";
          const when = r.source_published_at ?? r.fetched_at;
          return (
            <li key={r.id} className="py-3">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="h3-card">
                  <Link
                    to="/story/$slug"
                    params={{ slug: r.slug }}
                    className="no-underline hover:underline"
                  >
                    {decodeEntities(r.title)}
                  </Link>
                </h3>
                <span className="meta shrink-0 whitespace-nowrap">
                  <TimeAgo iso={when} />
                </span>
              </div>
              {r.dek && <p className="meta mt-1 line-clamp-2">{decodeEntities(r.dek)}</p>}
              <p className="meta mt-1">
                <span className="uppercase tracking-widest">Source:</span>{" "}
                {r.source?.homepage_url ? (
                  <a
                    href={r.source.homepage_url}
                    target="_blank"
                    rel="noopener nofollow"
                    className="underline"
                  >
                    {sourceName}
                  </a>
                ) : (
                  <span>{sourceName}</span>
                )}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
