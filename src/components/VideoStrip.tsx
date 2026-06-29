import { useState } from "react";
import { Play } from "lucide-react";
import { cityName } from "@/lib/city";
import { formatShortDate } from "@/lib/date";
import { videoCategoryLabel } from "@/lib/videoCategories";
import type { LiveFeedRow } from "@/lib/schema";

// Parse a YouTube video id from a watch url (?v=ID), a youtu.be/ID short url, or
// an /embed/ID url. Returns null when no plausible 11-char id is present, in
// which case the tile falls back to a plain link out to the original url.
function youtubeId(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0];
      return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      const v = u.searchParams.get("v");
      if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;
      const parts = u.pathname.split("/").filter(Boolean);
      const embedIdx = parts.indexOf("embed");
      if (embedIdx >= 0 && parts[embedIdx + 1] && /^[A-Za-z0-9_-]{11}$/.test(parts[embedIdx + 1])) {
        return parts[embedIdx + 1];
      }
    }
    return null;
  } catch {
    return null;
  }
}

// One video tile. Default state shows the publisher's thumbnail with a play
// overlay. Clicking a tile that resolves to a YouTube id swaps in the
// publisher's own privacy-enhanced (nocookie) player inline. When the id cannot
// be parsed, the tile is a link out to the original watch page instead. We never
// re-host the video; both paths use the publisher's own player or page.
function VideoTile({ video }: { video: LiveFeedRow }) {
  const [playing, setPlaying] = useState(false);
  const id = youtubeId(video.video_url);
  const source = video.source?.trim();
  const category = video.video_category ? videoCategoryLabel(video.video_category) : undefined;
  const dateLabel = formatShortDate(video.published_at);

  if (playing && id) {
    return (
      <article className="group">
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-[var(--surface)]">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
            title={video.title}
            className="absolute inset-0 h-full w-full"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
        <TileCaption
          title={video.title}
          source={source}
          category={category}
          dateLabel={dateLabel}
        />
      </article>
    );
  }

  // Thumbnail tile. When we have a YouTube id, clicking plays inline; otherwise
  // the whole tile is a link out to the publisher's watch page.
  const inner = (
    <>
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-[var(--surface)]">
        {video.image_url ? (
          <img
            src={video.image_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
            decoding="async"
            width={480}
            height={270}
          />
        ) : (
          <div className="absolute inset-0 bg-[var(--surface)]" aria-hidden />
        )}
        <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/65 text-white transition-colors group-hover:bg-[var(--ink-red)]">
            <Play className="h-5 w-5 translate-x-[1px]" fill="currentColor" />
          </span>
        </span>
      </div>
      <TileCaption title={video.title} source={source} category={category} dateLabel={dateLabel} />
    </>
  );

  if (id) {
    return (
      <article className="group">
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="block w-full cursor-pointer border-0 bg-transparent p-0 text-left"
          aria-label={`Play video: ${video.title}`}
        >
          {inner}
        </button>
      </article>
    );
  }

  return (
    <article className="group">
      <a
        href={video.video_url ?? video.url ?? "#"}
        target="_blank"
        rel="noopener nofollow"
        className="block no-underline"
        aria-label={`Watch video: ${video.title}`}
      >
        {inner}
      </a>
    </article>
  );
}

function TileCaption({
  title,
  source,
  category,
  dateLabel,
}: {
  title: string;
  source?: string;
  category?: string;
  dateLabel?: string;
}) {
  return (
    <div className="mt-2">
      {(category || source) && (
        <p className="kicker flex flex-wrap items-center gap-1.5 text-[10px]">
          {category && <span className="font-semibold text-[var(--ink-red)]">{category}</span>}
          {category && source && (
            <span aria-hidden className="opacity-40">
              ·
            </span>
          )}
          {source && <span className="opacity-80">{source}</span>}
        </p>
      )}
      <h3 className="h3-card mt-1 line-clamp-2">{title}</h3>
      {dateLabel && <p className="meta mt-1 text-[10px] opacity-60">{dateLabel}</p>}
    </div>
  );
}

// "<City> on video" strip. Renders nothing when there are no videos so it
// never leaves a dangling heading. On the homepage it is a horizontally
// scrollable rail; on the dedicated /watch page it lays out as a full grid.
export function VideoStrip({
  videos,
  variant = "rail",
  showHeading = true,
}: {
  videos: LiveFeedRow[];
  variant?: "rail" | "grid";
  showHeading?: boolean;
}) {
  if (videos.length === 0) return null;

  return (
    <div>
      {showHeading && (
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="kicker">Watch</p>
            <h2 className="h2-news mt-1">{cityName()} on video</h2>
          </div>
          <a href="/watch" className="meta underline whitespace-nowrap">
            More videos
          </a>
        </div>
      )}

      {variant === "grid" ? (
        <div className="mt-6 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((v) => (
            <VideoTile key={v.id} video={v} />
          ))}
        </div>
      ) : (
        <div className="mt-5 flex gap-5 overflow-x-auto pb-2 [scrollbar-width:thin] sm:grid sm:grid-cols-2 sm:gap-x-6 sm:gap-y-8 sm:overflow-visible lg:grid-cols-3">
          {videos.map((v) => (
            <div key={v.id} className="w-[78%] shrink-0 sm:w-auto">
              <VideoTile video={v} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
