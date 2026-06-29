import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { NewsletterForm } from "@/components/NewsletterForm";
import { listAudioBriefings } from "@/lib/data.functions";
import { buildMeta, canonicalLinks } from "@/lib/seo";
import { cityName, siteName, cityTimezone } from "@/lib/city";

const podcastQuery = queryOptions({
  queryKey: ["audio-briefings"],
  queryFn: () => listAudioBriefings(),
});

export const Route = createFileRoute("/podcast")({
  loader: ({ context }) => context.queryClient.ensureQueryData(podcastQuery),
  head: () => ({
    meta: buildMeta({
      title: `Daily Briefing Podcast | ${siteName()}`,
      description: `Listen to the ${cityName()} morning briefing — today's local news in under five minutes, every weekday.`,
      path: "/podcast",
    }),
    links: canonicalLinks("/podcast"),
  }),
  component: PodcastPage,
});

function formatLongDate(iso: string): string {
  try {
    const d = new Date(iso + "T06:00:00+10:00");
    return d.toLocaleDateString("en-AU", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: cityTimezone(),
    });
  } catch {
    return iso;
  }
}

function formatDuration(sec: number | null): string | null {
  if (!sec || sec <= 0) return null;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function PodcastPage() {
  const { data: episodes } = useSuspenseQuery(podcastQuery);

  return (
    <>
      <SiteHeader activePath="/podcast" />
      <main>
        <section className="container-read pt-12 pb-8">
          <p className="kicker text-[var(--ink-red)]">Listen</p>
          <h1 className="h-display mt-3 text-4xl sm:text-5xl leading-[1.05]">
            Your {cityName()} Morning Briefing — in audio
          </h1>
          <p className="dek mt-4 max-w-2xl text-lg">
            Listen to today&apos;s news in under 5 minutes, every morning.
          </p>

          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <a
              href="/podcast.rss"
              className="border border-[var(--ink)] px-3 py-1.5 hover:bg-[var(--ink)] hover:text-[var(--surface)] no-underline"
            >
              RSS feed
            </a>
            <span
              className="border border-[var(--hairline)] px-3 py-1.5 text-[var(--ink-grey)]"
              aria-disabled="true"
              title="Coming soon"
            >
              Apple Podcasts — coming soon
            </span>
            <span
              className="border border-[var(--hairline)] px-3 py-1.5 text-[var(--ink-grey)]"
              aria-disabled="true"
              title="Coming soon"
            >
              Spotify — coming soon
            </span>
          </div>
        </section>

        <section className="container-read pb-16 border-t border-[var(--ink)] pt-8">
          {episodes.length === 0 ? (
            <div>
              <p className="serif text-lg">
                Audio editions are coming soon. Subscribe to be notified when the
                first episode drops.
              </p>
              <div className="mt-6 border-t border-[var(--hairline)] pt-6">
                <NewsletterForm source="podcast-page" variant="band" />
              </div>
            </div>
          ) : (
            <ol className="space-y-10">
              {episodes.map((ep) => {
                const date = formatLongDate(ep.briefing_date);
                const title = ep.title ?? `Morning Briefing — ${date}`;
                const duration = formatDuration(ep.duration_sec);
                return (
                  <li
                    key={ep.id}
                    className="border-b border-[var(--hairline)] pb-8 last:border-b-0"
                  >
                    <p className="meta">{date}</p>
                    <h2 className="h2-news mt-1">{title}</h2>
                    {duration && (
                      <p className="meta mt-1">Duration: {duration}</p>
                    )}
                    {ep.audio_url && (
                      <>
                        <audio
                          controls
                          preload="none"
                          src={ep.audio_url}
                          className="mt-4 w-full"
                        >
                          Your browser does not support audio playback.
                        </audio>
                        <p className="meta mt-2">
                          <a href={ep.audio_url} download>
                            Download episode
                          </a>
                        </p>
                      </>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section className="container-read pb-16 border-t border-[var(--hairline)] pt-8">
          <h2 className="h-display text-2xl">Prefer to read?</h2>
          <p className="dek mt-2">
            The same briefing arrives in your inbox at 7am every weekday.
          </p>
          <p className="mt-3">
            <Link to="/subscribe" className="text-[var(--ink-red)] serif text-lg">
              Subscribe to the daily email →
            </Link>
          </p>
        </section>
      </main>
    </>
  );
}
