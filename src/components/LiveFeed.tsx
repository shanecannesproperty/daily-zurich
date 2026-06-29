import { useEffect, useState } from "react";
import { CloudSun, ExternalLink, Radio } from "lucide-react";
import type { LiveFeedRow } from "@/lib/schema";
import { formatShortDate, timeAgo } from "@/lib/date";
import { hostOf, isRealImage, isVideoUrl } from "@/lib/media";
import { HeroImage } from "@/components/HeroImage";
import { VideoTile } from "@/components/VideoTile";
import { useTrackEvent } from "@/hooks/useTrackEvent";

// How many of the first cards load their media eagerly (above the fold).
const EAGER_MEDIA_COUNT = 2;

// Relative time that stays SSR-stable: renders the absolute short date on the
// server and first client paint, then upgrades to "5 min ago" after mount.
function TimeAgo({ iso }: { iso: string }) {
  const [label, setLabel] = useState(() => formatShortDate(iso));
  useEffect(() => {
    setLabel(timeAgo(iso));
  }, [iso]);
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {label}
    </time>
  );
}

function WeatherChip({ row }: { row: LiveFeedRow }) {
  const temp =
    row.temp_c != null && Number.isFinite(row.temp_c) ? `${Math.round(row.temp_c)}°C` : null;
  const text = row.weather_text ?? row.title ?? null;
  if (!temp && !text) return null;
  return (
    <span className="inline-flex items-center gap-1.5 border border-[var(--hairline)] bg-background px-2.5 py-1 text-[13px] text-[var(--ink-grey)]">
      <CloudSun className="h-4 w-4 text-[var(--ink-red)]" aria-hidden />
      {temp && <span className="font-semibold text-[var(--ink)]">{temp}</span>}
      {text && <span>{text}</span>}
    </span>
  );
}

// One live-feed card. Layout adapts to the media present, in priority order:
//   1. video_url  -> click-to-play video tile, credited to the source
//   2. image_url  -> photo thumbnail beside the headline
//   3. neither    -> clean text-only row (never a broken img or empty box)
function LiveFeedCard({ row, eager }: { row: LiveFeedRow; eager: boolean }) {
  const track = useTrackEvent();
  const host = row.source ?? hostOf(row.url);
  const hasVideo = isVideoUrl(row.video_url);
  const hasImage = !hasVideo && isRealImage(row.image_url);

  const onSourceClick = () => track("live_feed_click", { ref: host ?? row.url ?? undefined });

  const Headline = (
    <h3 className="h3-card">
      {row.url ? (
        <a
          href={row.url}
          target="_blank"
          rel="noopener nofollow ugc"
          className="no-underline hover:underline"
          onClick={onSourceClick}
        >
          {row.title}
        </a>
      ) : (
        row.title
      )}
    </h3>
  );

  const Meta = (
    <p className="meta mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
      {host && <span className="font-semibold uppercase tracking-widest">{host}</span>}
      {host && <span aria-hidden>·</span>}
      <TimeAgo iso={row.published_at} />
      {row.url && (
        <a
          href={row.url}
          target="_blank"
          rel="noopener nofollow ugc"
          onClick={onSourceClick}
          className="inline-flex items-center gap-1"
        >
          Read at source
          <ExternalLink className="h-3 w-3" aria-hidden />
        </a>
      )}
    </p>
  );

  // Video card: full-width tile above the headline.
  if (hasVideo && row.video_url) {
    return (
      <li className="py-5">
        <VideoTile
          url={row.video_url}
          title={row.title}
          sourceLabel={host}
          onPlay={() => track("live_feed_click", { ref: host ?? row.video_url ?? undefined })}
        />
        <div className="mt-3">
          {Headline}
          {row.summary && <p className="meta mt-1 line-clamp-2">{row.summary}</p>}
          {Meta}
        </div>
      </li>
    );
  }

  // Photo card: thumbnail beside the text. The link wraps the image so the
  // whole thumbnail is a target, with an aria-label for the accessible name.
  if (hasImage) {
    return (
      <li className="py-5 grid gap-4 sm:grid-cols-12 sm:items-start">
        {row.url ? (
          <a
            href={row.url}
            target="_blank"
            rel="noopener nofollow ugc"
            onClick={onSourceClick}
            aria-label={`${row.title} — read at source`}
            className="sm:col-span-4 block no-underline"
          >
            <HeroImage
              src={row.image_url}
              alt={`Photo for ${row.title}`}
              aspect="aspect-[4/3]"
              loading={eager ? "eager" : "lazy"}
              fetchPriority={eager ? "high" : undefined}
              width={800}
              height={600}
              sizes="(min-width: 640px) 33vw, 100vw"
            />
          </a>
        ) : (
          <div className="sm:col-span-4">
            <HeroImage
              src={row.image_url}
              alt={`Photo for ${row.title}`}
              aspect="aspect-[4/3]"
              loading={eager ? "eager" : "lazy"}
              fetchPriority={eager ? "high" : undefined}
              width={800}
              height={600}
              sizes="(min-width: 640px) 33vw, 100vw"
            />
          </div>
        )}
        <div className="sm:col-span-8">
          {Headline}
          {row.summary && <p className="meta mt-1 line-clamp-2">{row.summary}</p>}
          {Meta}
        </div>
      </li>
    );
  }

  // Text-only card: clean layout, no placeholder box.
  return (
    <li className="py-4">
      <div className="flex items-baseline justify-between gap-3">
        {Headline}
        <span className="meta shrink-0 whitespace-nowrap">
          <TimeAgo iso={row.published_at} />
        </span>
      </div>
      {row.summary && <p className="meta mt-1 line-clamp-2">{row.summary}</p>}
      {host && <p className="meta mt-1">{host}</p>}
    </li>
  );
}

// "Live now" section: newest feed items with a source link, plus a small
// current-conditions chip. Renders nothing when there is no content at all.
export function LiveFeed({
  items,
  weather,
  limit,
  showHeading = true,
}: {
  items: LiveFeedRow[];
  weather: LiveFeedRow | null;
  limit?: number;
  showHeading?: boolean;
}) {
  const rows = typeof limit === "number" ? items.slice(0, limit) : items;
  const hasWeather =
    !!weather &&
    ((weather.temp_c != null && Number.isFinite(weather.temp_c)) ||
      !!weather.weather_text ||
      !!weather.title);
  if (rows.length === 0 && !hasWeather) return null;

  return (
    <div>
      {showHeading && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-[var(--ink-live)]" aria-hidden />
            <h2 className="kicker">Live now</h2>
          </div>
          {hasWeather && <WeatherChip row={weather} />}
        </div>
      )}
      {!showHeading && hasWeather && <div className="mb-3">{<WeatherChip row={weather} />}</div>}

      {rows.length > 0 && (
        <ul className="mt-4 divide-y divide-[var(--hairline)]">
          {rows.map((r, i) => (
            <LiveFeedCard key={r.id} row={r} eager={i < EAGER_MEDIA_COUNT} />
          ))}
        </ul>
      )}
    </div>
  );
}
