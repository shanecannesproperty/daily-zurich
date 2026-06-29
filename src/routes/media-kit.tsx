import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { CategoryNav } from "@/components/CategoryNav";
import { buildMeta, canonicalLinks } from "@/lib/seo";
import { cityName, siteName, siteEmail } from "@/lib/city";

const BOOK_EMAIL = siteEmail("advertise");

export const Route = createFileRoute("/media-kit")({
  head: () => ({
    meta: buildMeta({
      title: `Media Kit | ${siteName()}`,
      description: `Audience, reach and advertising options for ${siteName()} — the independent daily briefing for ${cityName()}.`,
      path: "/media-kit",
    }),
    links: canonicalLinks("/media-kit"),
  }),
  component: MediaKitPage,
});

const STATS = [
  { k: "Publishes", v: "Daily, 6am AEST" },
  { k: "Coverage", v: "100% local" },
  { k: "Network reach", v: "19 AU cities" },
  { k: "Primary demographic", v: "25–54, local" },
];

const FORMATS = [
  {
    name: "Sponsored article",
    desc: "Long-form native piece clearly marked Sponsored. Lives on the site indefinitely and is featured in the newsletter the day it publishes.",
    price: "From $1,500",
  },
  {
    name: "Morning Briefing sponsorship",
    desc: "One sponsor per edition. A clearly-marked mention near the top of the daily briefing with a single CTA link.",
    price: "From $400/week",
  },
  {
    name: "Banner placement",
    desc: "Top-of-section banner in a category hub (e.g. Business, Property, Events). Static image + link, no programmatic targeting.",
    price: "From $300/week",
  },
];

function MediaKitPage() {
  return (
    <>
      <SiteHeader />
      <CategoryNav />
      <main className="container-news py-12">
        <p className="kicker">Media Kit</p>
        <h1 className="h1-news mt-1">{siteName()} — Media Kit</h1>
        <p className="dek mt-3 max-w-[60ch]">
          The independent daily briefing for {cityName()}. Reach engaged
          locals at the start of their day.
        </p>

        <section className="mt-12 max-w-[68ch]" aria-labelledby="about-h">
          <h2 id="about-h" className="h2-news">
            About {siteName()}
          </h2>
          <div className="prose-news mt-4 space-y-4">
            <p>
              {siteName()} is an independent, locally-owned newsroom covering{" "}
              {cityName()} — local government, business, courts, community and
              culture. We publish a daily morning briefing and an always-on
              news site that locals open before their first coffee.
            </p>
            <p>
              We&apos;re built for readers who want to know what&apos;s
              happening in their city without the noise of national tabloids
              or algorithm-driven feeds. Our content is AI-curated from local
              and national sources, human-reviewed before publication, with a
              full editorial standards commitment.
            </p>
            <p>
              Our mission: be the most trusted, useful daily source for
              anyone who lives, works or invests in {cityName()}.
            </p>
          </div>
        </section>

        <section className="mt-14" aria-labelledby="audience-h">
          <h2 id="audience-h" className="h2-news">
            Our audience
          </h2>
          <dl className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.k} className="border-t-2 border-[var(--ink,#2d2d2d)] pt-3">
                <dt className="kicker">{s.k}</dt>
                <dd className="serif text-2xl mt-1">{s.v}</dd>
              </div>
            ))}
          </dl>
          <p className="meta mt-4 italic text-[var(--ink-grey,#6b6b6b)]">
            Stats updated monthly. Contact us for the latest verified figures.
          </p>
        </section>

        <section className="mt-14" aria-labelledby="formats-h">
          <h2 id="formats-h" className="h2-news">
            Advertising options
          </h2>
          <div className="mt-6 grid gap-8 md:grid-cols-3">
            {FORMATS.map((f) => (
              <article
                key={f.name}
                className="border border-[var(--ink,#2d2d2d)] bg-[var(--surface,#e8e4dd)] p-5"
              >
                <h3 className="h3-card">{f.name}</h3>
                <p className="meta mt-2">{f.desc}</p>
                <p className="serif text-lg mt-4">{f.price}</p>
              </article>
            ))}
          </div>
          <p className="meta mt-4">
            All campaigns are bespoke — we work with you on creative and
            placement. No programmatic networks, no popups, no auto-play
            video.
          </p>
        </section>

        <section
          className="mt-14 border-t border-[var(--ink,#2d2d2d)] pt-8"
          aria-labelledby="book-h"
        >
          <h2 id="book-h" className="h2-news">
            Book a campaign
          </h2>
          <p className="dek mt-3 max-w-[60ch]">
            Tell us about your brand and what you&apos;d like to achieve.
            We&apos;ll come back with a tailored proposal within two business
            days.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <a
              href={`mailto:${BOOK_EMAIL}?subject=Campaign%20enquiry%20%E2%80%94%20${encodeURIComponent(siteName())}`}
              className="btn-primary inline-block"
            >
              Email {BOOK_EMAIL}
            </a>
            <a href="/advertise" className="meta underline">
              See pricing & formats →
            </a>
          </div>
        </section>
      </main>
    </>
  );
}
