import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getWatchVideos } from "@/lib/data.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { VideoStrip } from "@/components/VideoStrip";
import { NewsletterForm } from "@/components/NewsletterForm";
import { buildMeta, canonicalLinks } from "@/lib/seo";
import { siteName, cityName, cityTimezone } from "@/lib/city";
import type { LiveFeedRow } from "@/lib/schema";
import {
  groupByCategory,
  rowCategory,
  VIDEO_CATEGORY_BLURBS,
  type VideoCategory,
} from "@/lib/videoCategories";

const videosQuery = queryOptions({
  queryKey: ["watch-videos"],
  queryFn: () => getWatchVideos(),
  staleTime: 15 * 60 * 1000,
});

export const Route = createFileRoute("/watch")({
  loader: ({ context }) => context.queryClient.ensureQueryData(videosQuery).catch(() => undefined),
  head: () => ({
    meta: buildMeta({
      title: `${cityName()} on video | ${siteName()}`,
      description: `Local ${cityName()} videos sorted into news, sport, business, arts and community, newest first. Each clip plays the publisher's own player or links back to their channel. We never re-host video.`,
      path: "/watch",
    }),
    links: canonicalLinks("/watch"),
  }),
  component: WatchPage,
});

// Stable per-day key in the city timezone, e.g. "26/06/2026". Pure function of
// the timestamp so it renders identically on the server and the client.
function dayKey(iso: string, tz: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-AU", { timeZone: tz });
  } catch {
    return "";
  }
}

function dayHeading(iso: string, tz: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-AU", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: tz,
    });
  } catch {
    return "";
  }
}

interface DayGroup {
  key: string;
  heading: string;
  videos: LiveFeedRow[];
}

// Group an already recency-ordered list into calendar-day buckets, newest first.
function groupByDay(videos: LiveFeedRow[], tz: string): DayGroup[] {
  const order: string[] = [];
  const map = new Map<string, LiveFeedRow[]>();
  for (const v of videos) {
    const k = dayKey(v.published_at, tz);
    const arr = map.get(k);
    if (arr) {
      arr.push(v);
    } else {
      map.set(k, [v]);
      order.push(k);
    }
  }
  return order.map((k) => {
    const rows = map.get(k) ?? [];
    return { key: k, heading: dayHeading(rows[0]?.published_at ?? "", tz), videos: rows };
  });
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={
        "rounded-full border px-3 py-1 text-[12px] font-medium transition-colors " +
        (active
          ? "border-[var(--ink-red)] bg-[var(--ink-red)] text-white"
          : "border-[var(--hairline)] text-[var(--ink)] hover:border-[var(--ink-red)]")
      }
    >
      {label} <span className="opacity-60">{count}</span>
    </button>
  );
}

function WatchPage() {
  const { data: videos } = useSuspenseQuery(videosQuery);
  const [active, setActive] = useState<VideoCategory | "all">("all");

  const groups = groupByCategory(videos);
  const tz = cityTimezone();
  const activeVideos = active === "all" ? videos : videos.filter((v) => rowCategory(v) === active);
  const dayGroups = active === "all" ? [] : groupByDay(activeVideos, tz);

  return (
    <>
      <SiteHeader activePath="/watch" />
      <main>
        <section className="container-news pt-8 pb-10">
          <p className="kicker">Watch</p>
          <h1 className="h1-news mt-1">{cityName()} on video</h1>
          <p className="dek mt-3 max-w-2xl">
            Local clips from around {cityName()}, sorted into sections and newest first. Each video
            plays the publisher's own player or links back to their channel. We do not re-host
            video.
          </p>

          {videos.length === 0 ? (
            <p className="meta mt-10">No videos right now. Check back soon.</p>
          ) : (
            <>
              <div className="mt-6 flex flex-wrap gap-2">
                <FilterChip
                  label="All"
                  count={videos.length}
                  active={active === "all"}
                  onClick={() => setActive("all")}
                />
                {groups.map((g) => (
                  <FilterChip
                    key={g.category}
                    label={g.label}
                    count={g.videos.length}
                    active={active === g.category}
                    onClick={() => setActive(g.category)}
                  />
                ))}
              </div>

              {active === "all" ? (
                <div className="mt-10 space-y-12">
                  {groups.map((g) => (
                    <section key={g.category} aria-label={g.label}>
                      <div className="flex items-end justify-between gap-3 border-b border-[var(--hairline)] pb-2">
                        <div>
                          <h2 className="h2-news">{g.label}</h2>
                          <p className="meta mt-1 max-w-xl opacity-70">
                            {VIDEO_CATEGORY_BLURBS[g.category]}
                          </p>
                        </div>
                        {g.videos.length > 6 && (
                          <button
                            type="button"
                            className="meta whitespace-nowrap underline"
                            onClick={() => setActive(g.category)}
                          >
                            View all {g.videos.length}
                          </button>
                        )}
                      </div>
                      <div className="mt-6">
                        <VideoStrip
                          videos={g.videos.slice(0, 6)}
                          variant="grid"
                          showHeading={false}
                        />
                      </div>
                    </section>
                  ))}
                </div>
              ) : (
                <div className="mt-10 space-y-10">
                  {dayGroups.map((d) => (
                    <section key={d.key} aria-label={d.heading}>
                      <h2 className="kicker border-b border-[var(--hairline)] pb-2">{d.heading}</h2>
                      <div className="mt-6">
                        <VideoStrip videos={d.videos} variant="grid" showHeading={false} />
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        <section className="container-news border-t border-[var(--hairline)] py-10">
          <NewsletterForm source="watch" variant="band" />
        </section>
      </main>
    </>
  );
}
