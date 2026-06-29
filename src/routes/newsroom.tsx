import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { buildMeta, canonicalLinks } from "@/lib/seo";
import { cityName, siteName } from "@/lib/city";

export const Route = createFileRoute("/newsroom")({
  head: () => ({
    meta: buildMeta({
      title: `Newsroom | ${siteName()}`,
      description: `The ${siteName()} newsroom: how our AI-assisted local journalism is sourced, generated and reviewed before publication.`,
      path: "/newsroom",
    }),
    links: canonicalLinks("/newsroom"),
  }),
  component: NewsroomPage,
});

function NewsroomPage() {
  return (
    <>
      <SiteHeader />
      <main className="container-read py-12">
        <h1 className="h1-news">The {siteName()} Newsroom</h1>
        <p className="dek mt-3">
          We are an AI-assisted local newsroom covering {cityName()} every day. Our AI systems
          curate, summarise, and generate content from verified local sources. All content is
          reviewed against editorial standards before publication.
        </p>

        <div className="prose-news mt-8">
          <h2>How our journalism works</h2>
          <p>
            Every article begins with a verified local source. We monitor a curated list of
            official feeds, government releases, public records and established {cityName()} news
            outlets. Nothing is sourced from anonymous social media posts or unverified tips.
          </p>
          <p>
            Our AI systems summarise and draft each article from those named sources, with links
            back to the originals so readers can verify the underlying record. Every draft then
            passes an automated editorial screen against our published standards before it can go
            live.
          </p>
          <p>
            Crime, court, politics, allegations, misconduct and insolvency stories never publish
            automatically. They are held back and reviewed by a person before release. Lower-risk
            coverage such as community roundups, events and guides may publish automatically once
            it clears the screen.
          </p>

          <h2>Editorial standards</h2>
          <p>
            Full detail on our sourcing rules, AI use, corrections policy and what a human controls
            lives on our <a href="/editorial-standards">editorial standards page</a>.
          </p>

          <h2>Contact the newsroom</h2>
          <p>
            Tips, corrections, or questions about a story? Reach the desk via our{" "}
            <a href="/about">about page</a> or the <a href="/contact">contact page</a>.
          </p>
        </div>
      </main>
    </>
  );
}
