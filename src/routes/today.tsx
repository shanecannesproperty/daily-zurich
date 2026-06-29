import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { getTodaysEdition } from "@/lib/data.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { NewsletterForm } from "@/components/NewsletterForm";
import { buildMeta, canonicalLinks } from "@/lib/seo";
import { siteName, cityName } from "@/lib/city";
import { formatDate, formatDateTime } from "@/lib/date";
import type {
  DailyEditionRow,
  EditionSection,
  EditionTopItem,
  EditionEventItem,
  EditionJobItem,
} from "@/lib/schema";

const editionQuery = queryOptions({
  queryKey: ["todays-edition"],
  queryFn: () => getTodaysEdition(),
});

export const Route = createFileRoute("/today")({
  loader: ({ context }) => context.queryClient.ensureQueryData(editionQuery),
  head: () => ({
    meta: buildMeta({
      title: `Today in ${cityName()} | ${siteName()}`,
      description: `Your morning briefing for ${cityName()}: the top stories, the weather, what is on and the latest jobs, gathered each morning by ${siteName()}.`,
      path: "/today",
    }),
    links: canonicalLinks("/today"),
  }),
  component: TodayPage,
});

// Outbound link to a source. Edition items always carry a real url; we open in a
// new tab and mark it nofollow (these are link-outs, not endorsements).
function OutboundLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener nofollow"
      className="font-semibold hover:underline"
    >
      {children}
    </a>
  );
}

function TopSection({ section }: { section: EditionSection }) {
  const items = (section.items ?? []) as EditionTopItem[];
  if (items.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="h2-news border-b border-[var(--ink)] pb-2">{section.title}</h2>
      <div className="mt-4 divide-y divide-[var(--hairline)]">
        {items.map((item, i) => (
          <article key={`${item.url}-${i}`} className="py-6 first:pt-0">
            <h3 className="serif text-xl leading-snug">
              <OutboundLink href={item.url}>{item.headline}</OutboundLink>
            </h3>
            {item.summary && <p className="dek mt-2 max-w-2xl">{item.summary}</p>}
            {item.source && <p className="meta mt-2">via {item.source}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}

function WeatherSection({ section }: { section: EditionSection }) {
  if (!section.text || !section.text.trim()) return null;
  return (
    <section className="mt-10">
      <h2 className="h2-news border-b border-[var(--ink)] pb-2">{section.title}</h2>
      <p className="dek mt-4 max-w-2xl">{section.text}</p>
    </section>
  );
}

function EventsSection({ section }: { section: EditionSection }) {
  const items = (section.items ?? []) as EditionEventItem[];
  if (items.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="h2-news border-b border-[var(--ink)] pb-2">{section.title}</h2>
      <ul className="mt-4 divide-y divide-[var(--hairline)]">
        {items.map((item, i) => {
          const when = formatDateTime(item.when);
          return (
            <li key={`${item.url}-${i}`} className="py-4 first:pt-0">
              <p className="serif text-lg leading-snug">
                <OutboundLink href={item.url}>{item.headline}</OutboundLink>
              </p>
              <p className="meta mt-1">
                {item.venue && <>{item.venue}</>}
                {item.venue && when && <> &middot; </>}
                {when && <>{when}</>}
              </p>
            </li>
          );
        })}
      </ul>
      {section.more_url && (
        <p className="mt-4">
          <a
            href={section.more_url}
            className="font-semibold text-[var(--ink-red)] hover:underline"
          >
            See all events
          </a>
        </p>
      )}
    </section>
  );
}

function JobsSection({ section }: { section: EditionSection }) {
  const items = (section.items ?? []) as EditionJobItem[];
  if (items.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="h2-news border-b border-[var(--ink)] pb-2">{section.title}</h2>
      <ul className="mt-4 divide-y divide-[var(--hairline)]">
        {items.map((item, i) => (
          <li key={`${item.url}-${i}`} className="py-4 first:pt-0">
            <p className="serif text-lg leading-snug">
              <OutboundLink href={item.url}>{item.headline}</OutboundLink>
            </p>
            {item.employer && <p className="meta mt-1">{item.employer}</p>}
          </li>
        ))}
      </ul>
      {section.more_url && (
        <p className="mt-4">
          <a
            href={section.more_url}
            className="font-semibold text-[var(--ink-red)] hover:underline"
          >
            More jobs
          </a>
        </p>
      )}
    </section>
  );
}

function SectionRenderer({ section }: { section: EditionSection }) {
  switch (section.type) {
    case "top":
      return <TopSection section={section} />;
    case "weather":
      return <WeatherSection section={section} />;
    case "events":
      return <EventsSection section={section} />;
    case "jobs":
      return <JobsSection section={section} />;
    default:
      return null;
  }
}

function EmptyState() {
  return (
    <div className="mt-10 border-t border-[var(--hairline)] pt-8">
      <p className="serif text-lg">Today's briefing is being prepared, check back this morning.</p>
      <p className="dek mt-3 max-w-2xl">
        Every morning we gather the top stories, the weather, what is on and the latest jobs for{" "}
        {cityName()} into one short read. It will appear here as soon as it is ready.
      </p>
    </div>
  );
}

function Edition({ edition }: { edition: DailyEditionRow }) {
  const heading = edition.subject?.trim() || `Today in ${cityName()}`;
  const dateLabel = formatDate(edition.edition_date);
  const sections = Array.isArray(edition.sections) ? edition.sections : [];
  return (
    <>
      <h1 className="h1-news mt-1">{heading}</h1>
      {dateLabel && <p className="meta mt-2">{dateLabel}</p>}
      {edition.hook?.trim() && <p className="dek mt-4 max-w-2xl">{edition.hook}</p>}
      {sections.map((section, i) => (
        <SectionRenderer key={`${section.type}-${i}`} section={section} />
      ))}
    </>
  );
}

function TodayPage() {
  const { data: edition } = useSuspenseQuery(editionQuery);

  return (
    <>
      <SiteHeader activePath="/today" />
      <main>
        <section className="container-read pt-8 pb-10">
          <p className="kicker">Today</p>
          {edition ? <Edition edition={edition} /> : <EmptyState />}
        </section>

        <section className="container-news py-10 border-t border-[var(--hairline)]">
          <NewsletterForm source="today-edition" variant="band" />
        </section>
      </main>
    </>
  );
}
