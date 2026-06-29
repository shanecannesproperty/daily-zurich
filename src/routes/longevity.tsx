import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { buildMeta, canonicalLinks } from "@/lib/seo";
import { cityName, siteName } from "@/lib/city";
import { listSyndicatedByTopic } from "@/lib/syndication.functions";
import type { SyndicatedStoryWithSource } from "@/lib/syndication";
import { hostOf } from "@/lib/syndication";

const longevityQuery = queryOptions({
  queryKey: ["longevity", "stories"],
  queryFn: () => listSyndicatedByTopic({ data: { topic: "longevity", limit: 30 } }),
  staleTime: 5 * 60_000,
});

export const Route = createFileRoute("/longevity")({
  head: () => ({
    meta: buildMeta({
      title: `Longevity, metabolic health and aging science | ${siteName()}`,
      description:
        "Longevity, metabolic health, sleep and recovery stories from local and national sources. Calm, credible, non-prescriptive.",
      path: "/longevity",
    }),
    links: canonicalLinks("/longevity"),
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(longevityQuery),
  errorComponent: ({ error }) => (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="container-news py-16">
        <h1 className="serif text-3xl">Couldn't load longevity</h1>
        <p className="mt-3 text-[var(--ink-soft)]">{error.message}</p>
      </main>
    </div>
  ),
  notFoundComponent: () => null,
  component: LongevityHub,
});

const PILLARS = [
  { key: "metabolic", title: "Metabolic health", blurb: "Insulin, glucose, GLP-1 education, body composition." },
  { key: "sleep", title: "Sleep and recovery", blurb: "Architecture, light, temperature, HRV." },
  { key: "movement", title: "Movement and VO2 max", blurb: "Zone 2, strength, mobility, longevity training." },
  { key: "nutrition", title: "Nutrition and TRE", blurb: "Protein, fibre, time-restricted eating, micronutrients." },
  { key: "cellular", title: "Cellular and aging science", blurb: "Senescence, autophagy, mitochondria, biomarkers." },
  { key: "pharma", title: "Pharma in context", blurb: "Education only on GLP-1 agonists, metformin, peptides." },
];

function LongevityHub() {
  const { data } = useSuspenseQuery(longevityQuery);
  const stories = data.items;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="container-news py-10">
        <header className="border-b border-[var(--rule)] pb-8">
          <p className="label">Longevity intelligence</p>
          <h1 className="serif mt-2 text-5xl leading-tight">Live longer, think clearer, move better.</h1>
          <p className="mt-3 max-w-2xl text-[var(--ink-soft)]">
            Briefings on metabolic health, sleep, movement and the science of aging, drawn from trusted
            feeds. Calm, credible, non-prescriptive. Built for {cityName()} readers.
          </p>
        </header>

        <section className="mt-10">
          <h2 className="serif text-2xl">Pillars</h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PILLARS.map((p) => (
              <article key={p.key} className="border-t border-[var(--rule)] pt-3">
                <h3 className="serif text-lg">{p.title}</h3>
                <p className="mt-1 text-sm text-[var(--ink-soft)]">{p.blurb}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12 border-t border-[var(--rule)] pt-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="serif text-3xl">Latest longevity stories</h2>
              <p className="mt-1 text-sm text-[var(--ink-soft)]">
                {stories.length} stories matched from the feed.
              </p>
            </div>
            <Link to="/wellness" className="text-sm font-semibold underline-offset-4 hover:underline">
              All wellness →
            </Link>
          </div>
          <StoryGrid stories={stories} />
        </section>

        <p className="mt-12 border-t border-[var(--rule)] pt-6 text-xs text-[var(--ink-soft)]">
          Longevity coverage is educational only. It is not medical, pharmaceutical or training advice.
          Speak with your GP before changing diet, training or medication.
        </p>
      </main>
    </div>
  );
}

function StoryGrid({ stories }: { stories: SyndicatedStoryWithSource[] }) {
  if (!stories.length) {
    return (
      <p className="mt-6 border border-[var(--rule)] p-6 text-sm text-[var(--ink-soft)]">
        No longevity stories in the feed yet. The next ingest run will populate this section.
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
