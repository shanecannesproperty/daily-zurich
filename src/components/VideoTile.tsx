// A click-to-play video tile for source clips (YouTube / Vimeo). It renders a
// lightweight poster (provider still, or a branded play surface when none) with
// a play button, and only swaps in the embedded iframe after the reader opts in.
// This keeps the page light and guarantees we never autoplay with sound.
//
// Always credited to the source with a link back. The iframe, once shown, may
// start playback, so we add allow="autoplay" only AFTER the user clicked play.
import { useState } from "react";
import { Play } from "lucide-react";
import { parseVideoUrl } from "@/lib/media";

export function VideoTile({
  url,
  title,
  sourceLabel,
  className = "",
  onPlay,
}: {
  url: string;
  title: string;
  // Human label for the credit line, e.g. the publisher name or host.
  sourceLabel?: string | null;
  className?: string;
  onPlay?: () => void;
}) {
  const video = parseVideoUrl(url);
  const [playing, setPlaying] = useState(false);

  // Unrecognised provider: never embed an arbitrary origin. Fall back to a
  // text link so the reader can still reach the clip at its source.
  if (!video) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener nofollow ugc"
        className={`meta inline-flex items-center gap-1.5 ${className}`}
      >
        <Play className="h-3.5 w-3.5" aria-hidden />
        Watch video at source
      </a>
    );
  }

  const credit = sourceLabel?.trim() || video.provider;

  return (
    <figure className={className}>
      <div className="relative w-full aspect-video overflow-hidden bg-[var(--surface)]">
        {playing ? (
          <iframe
            src={`${video.embedUrl}&autoplay=1`}
            title={title}
            className="absolute inset-0 z-[1] h-full w-full border-0"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            // allow autoplay only now that the user explicitly pressed play
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setPlaying(true);
              onPlay?.();
            }}
            aria-label={`Play video: ${title}`}
            className="group absolute inset-0 z-[1] block h-full w-full"
          >
            {video.thumbnailUrl ? (
              <img
                src={video.thumbnailUrl}
                alt=""
                width={1280}
                height={720}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <span aria-hidden className="img-shimmer absolute inset-0" />
            )}
            <span
              aria-hidden
              className="absolute inset-0 bg-[color-mix(in_oklab,var(--ink)_22%,transparent)] transition-colors group-hover:bg-[color-mix(in_oklab,var(--ink)_34%,transparent)]"
            />
            <span
              aria-hidden
              className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--ink-red)] text-[var(--paper)] shadow-md transition-transform group-hover:scale-105"
            >
              <Play className="h-6 w-6 translate-x-[1px]" fill="currentColor" />
            </span>
          </button>
        )}
      </div>
      <figcaption className="meta mt-2 flex items-center gap-1.5">
        <Play className="h-3.5 w-3.5 text-[var(--ink-red)]" aria-hidden />
        <span>
          Video via{" "}
          <a href={video.watchUrl} target="_blank" rel="noopener nofollow ugc">
            {credit}
          </a>
        </span>
      </figcaption>
    </figure>
  );
}
