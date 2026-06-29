import { Headphones, Rss, Check } from "lucide-react";
import { useState } from "react";
import type { AudioBriefingRow } from "@/lib/schema";
import { cityName, siteDomain, siteName } from "@/lib/city";
import { formatDate, formatDuration } from "@/lib/date";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const FEED_PATH = "/rss/podcast.xml";

function PodcastSubscribe() {
  const [copied, setCopied] = useState(false);
  const feedUrl = `${siteDomain()}${FEED_PATH}`;
  const feedNoScheme = feedUrl.replace(/^https?:\/\//, "");

  const openApple = () => {
    window.open(`podcast://${feedNoScheme}`, "_blank");
  };
  const openOvercast = () => {
    window.open(`overcast://x-callback-url/add?url=${encodeURIComponent(feedUrl)}`, "_blank");
  };
  const openPocketCasts = () => {
    window.open(`pktc://subscribe/${feedNoScheme}`, "_blank");
  };
  const copyFeed = async () => {
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="meta inline-flex items-center gap-1.5 rounded-sm border border-[var(--hairline)] px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] font-semibold hover:border-[var(--ink)] hover:text-[var(--ink-red)] transition-colors"
        >
          {copied ? (
            <Check className="h-3 w-3" aria-hidden />
          ) : (
            <Rss className="h-3 w-3" aria-hidden />
          )}
          {copied ? "Copied!" : "Subscribe in podcast app"}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Open in</DropdownMenuLabel>
        <DropdownMenuItem onClick={openApple}>Apple Podcasts</DropdownMenuItem>
        <DropdownMenuItem onClick={openOvercast}>Overcast</DropdownMenuItem>
        <DropdownMenuItem onClick={openPocketCasts}>Pocket Casts</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={copyFeed}>Copy RSS feed URL</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Prominent "Listen: <City> in 5 minutes" card for the homepage. Renders
// nothing without a playable briefing, so it is safe to mount unconditionally.
export function DailyBriefingCard({ briefing }: { briefing: AudioBriefingRow | null }) {
  if (!briefing || !briefing.audio_url || briefing.audio_url.trim().length === 0) return null;
  const duration = formatDuration(briefing.duration_sec);
  const dateLabel = formatDate(briefing.briefing_date);
  const heading = briefing.title ?? `${cityName()} in 5 minutes`;
  const accessibleLabel = `Play audio briefing: ${heading}${duration ? `, ${duration}` : ""}${dateLabel ? `, ${dateLabel}` : ""}`;
  const transcript = briefing.script_text?.trim() ?? "";
  const hasTranscript = transcript.length > 0;

  return (
    <figure
      className="border border-[var(--ink)] bg-[var(--surface)] p-5 sm:p-6 m-0"
      aria-labelledby="briefing-heading"
    >
      <div className="flex items-center gap-2">
        <Headphones className="h-4 w-4 text-[var(--ink-red)]" aria-hidden />
        <p className="kicker">
          Listen{dateLabel ? ` · ${dateLabel}` : ""}
          {duration ? ` · ${duration}` : ""}
        </p>
      </div>
      <h2 id="briefing-heading" className="h2-news mt-2">
        {heading}
      </h2>
      <p className="dek mt-2 max-w-2xl">
        The day&apos;s top {cityName()} stories, read to you in about five minutes.
      </p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <audio
          controls
          controlsList="nodownload"
          preload="none"
          aria-label={accessibleLabel}
          className="w-full min-w-0 flex-1"
          src={briefing.audio_url}
        >
          <a href={briefing.audio_url} className="meta underline">
            Download the audio briefing
          </a>
        </audio>
        <PodcastSubscribe />
      </div>

      {hasTranscript ? (
        <details className="mt-4 border-t border-[var(--hairline)] pt-3 group">
          <summary
            className="meta cursor-pointer list-none inline-flex items-center gap-2 uppercase tracking-[0.14em] text-[11px] font-semibold text-[var(--ink)] hover:text-[var(--ink-red)] focus-visible:text-[var(--ink-red)]"
            aria-label={`Read the briefing transcript for ${heading}`}
          >
            <span
              aria-hidden
              className="inline-block w-3 text-[var(--ink-red)] group-open:rotate-90 transition-transform"
            >
              &rsaquo;
            </span>
            <span className="group-open:hidden">Read the briefing text</span>
            <span className="hidden group-open:inline">Hide the briefing text</span>
          </summary>
          <div
            className="prose-news mt-3 max-w-3xl whitespace-pre-line"
            role="region"
            aria-label="Audio briefing transcript"
          >
            {transcript}
          </div>
        </details>
      ) : null}

      <figcaption className="mt-4 border-t border-[var(--hairline)] pt-3 space-y-1 sm:space-y-0 sm:flex sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-x-6 sm:gap-y-1">
        <span className="meta block text-[12px] leading-snug max-w-prose text-balance">
          Read aloud by the {siteName()} desk. Generated from today&apos;s reported stories.
        </span>
        <span className="meta block uppercase tracking-[0.14em] text-[10px] sm:text-[11px] text-[var(--ink-grey)] whitespace-nowrap">
          Audio &middot; {siteName()}
        </span>
      </figcaption>
    </figure>
  );
}
