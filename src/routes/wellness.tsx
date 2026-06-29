import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { buildMeta, canonicalLinks } from "@/lib/seo";
import { cityName, siteName } from "@/lib/city";
import { listSyndicatedByTopic } from "@/lib/syndication.functions";
import type { SyndicatedStoryWithSource } from "@/lib/syndication";
import { hostOf } from "@/lib/syndication";

const wellnessQuery = queryOptions({
  queryKey: ["wellness", "stories"],
  queryFn: () => listSyndicatedByTopic({ data: { topic: "wellness", limit: 30 } }),
  staleTime: 5 * 60_000,
});

export const Route = createFileRoute("/wellness")({
  head: () => ({
    meta: buildMeta({
      title: `Health and wellness in ${cityName()} | ${siteName()}`,
      description: `Wellness, fitness and health stories from ${cityName()}, pulled from local and national sources. Lifestyle coverage, not medical advice.`,
      path: "/wellness",
    }),
    links: canonicalLinks("/wellness"),
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(wellnessQuery),
  errorComponent: ({ error }) => (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="container-news py-16">
        <h1 className="serif text-3xl">Couldn't load wellness</h1>
        <p className="mt-3 text-[var(--ink-soft)]">{error.message}</p>
      </main>
    </div>
  ),
  notFoundComponent: () => null,
  component: WellnessHub,
});

const PILLARS = [
  { key: "physical", label: "Physical", blurb: "Pilates, yoga, gyms, run clubs, recovery and trails." },
  { key: "mental", label: "Mental", blurb: "Sleep, stress, mindfulness and meditation." },
  { key: "nutrition", label: "Nutrition", blurb: `Gut health, healthy eating, ${cityName()} food culture.` },
  { key: "holistic", label: "Holistic", blurb: "Breathwork, sound healing, contrast therapy." },
  { key: "longevity", label: "Longevity", blurb: "Science-backed habits, performance, healthspan." },
  { key: "community", label: "Community", blurb: `Events, retreats and the ${cityName()} wellness scene.` },
];

function WellnessHub() {
  const { data } = useSuspenseQuery(wellnessQuery);
  const stories = data.items;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="container-news py-10">
        <header className="max-w-3xl border-b border-[var(--rule)] pb-8">
          <p className="label">Health and wellness</p>
          <h1 className="serif mt-2 text-5xl leading-tight">Move, recover, feel good in {cityName()}</h1>
          <p className="mt-3 text-lg text-[var(--ink-soft)]">
            Wellness, fitness and health stories from across {cityName()} and beyond, refreshed automatically
            from trusted sources. Lifestyle coverage only, never medical advice. For mental-health support
            contact{" "}
            <a className="underline" href="https://www.lifeline.org.au" rel="noopener noreferrer" target="_blank">
              Lifeline on 13 11 14
            </a>.
          </p>
        </header>

        <section className="mt-10">
          <h2 className="serif text-2xl">Explore by wellness pillar</h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PILLARS.map((p) => (
              <li key={p.key} className="border-t border-[var(--rule)] pt-3">
                <p className="label text-[var(--accent)]">{p.label}</p>
                <p className="mt-1 text-sm text-[var(--ink-soft)]">{p.blurb}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12 border-t border-[var(--rule)] pt-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="serif text-3xl">Latest wellness stories</h2>
              <p className="mt-1 text-sm text-[var(--ink-soft)]">
                {stories.length} stories matched, refreshed from {cityName()} and national feeds.
              </p>
            </div>
            <Link to="/longevity" className="text-sm font-semibold underline-offset-4 hover:underline">
              Longevity hub →
            </Link>
          </div>
          <StoryGrid stories={stories} />
        </section>

        <p className="mt-12 border-t border-[var(--rule)] pt-6 text-xs text-[var(--ink-soft)]">
          The Wellness section is descriptive and lifestyle only and is not medical, therapeutic or
          training advice. Any statistic is attributed to its named source. For mental-health support
          contact Lifeline on 13 11 14. In an emergency call 000.
        </p>
      </main>
    </div>
  );
}

function StoryGrid({ stories }: { stories: SyndicatedStoryWithSource[] }) {
  if (!stories.length) {
    return (
      <p className="mt-6 border border-[var(--rule)] p-6 text-sm text-[var(--ink-soft)]">
        No wellness stories in the feed yet. Check back once the ingest agents have run.
      </p>
    );
  }
  return (
    <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {stories.map((s) => {
        const host = s.source?.name ?? hostOf(s.link);
        const date = s.source_published_at ?? s.fetched_at;
        return (
          <li key={s.id} className="border-t border-[var(--ink)] pt-3">
            <p className="label">
              {host}
              {date ? ` · ${new Date(date).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}` : ""}
            </p>
            <Link
              to="/story/$slug"
              params={{ slug: s.slug }}
              className="serif mt-1 block text-lg leading-snug hover:underline"
            >
              {s.title}
            </Link>
            {s.dek && <p className="mt-1 text-sm text-[var(--ink-soft)]">{s.dek}</p>}
          </li>
        );
      })}
    </ul>
  );
}
