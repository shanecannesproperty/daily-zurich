import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listEvents } from "@/lib/data.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { EventsBrowser } from "@/components/EventsBrowser";
import { EventsCalendarGrid } from "@/components/EventsCalendarGrid";
import { useState } from "react";
import { CalendarSubscribe } from "@/components/CalendarSubscribe";
import { NewsletterForm } from "@/components/NewsletterForm";
import { LocalBusinessSpotlight } from "@/components/LocalBusinessSpotlight";
import { JsonLd } from "@/components/JsonLd";
import { buildMeta, canonicalLinks, absUrl, pageTitle, clampDescription } from "@/lib/seo";
import { cityName, siteName } from "@/lib/city";

const eventsQ = queryOptions({ queryKey: ["events"], queryFn: () => listEvents() });

export const Route = createFileRoute("/events")({
  loader: ({ context }) => context.queryClient.ensureQueryData(eventsQ),
  head: () => ({
    meta: buildMeta({
      title: pageTitle(`Events in ${cityName()}`),
      description: clampDescription(
        `What's on in ${cityName()}. Verified, source backed events curated by ${siteName()}.`,
        160,
      ),
      path: "/events",
    }),
    links: canonicalLinks("/events"),
  }),
  component: EventsPage,
});

function EventsPage() {
  const { data } = useSuspenseQuery(eventsQ);
  const [view, setView] = useState<"list" | "calendar">("list");
  return (
    <>
      <SiteHeader activePath="/events" />
      <main className="container-news py-10">
        <nav className="meta mb-4">
          <a href="/">Home</a> / Events
        </nav>
        <p className="kicker">What&apos;s on</p>
        <h1 className="h1-news mt-1">Events in {cityName()}</h1>
        <p className="dek mt-3 max-w-2xl">
          Upcoming, verified events across the capital. Filter by category or jump straight to this
          weekend. Every listing links to its source.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <a href="/submit-event" className="btn-primary">
            Submit your event
          </a>
          <span className="meta">Free for community events. Reviewed within 24 hours.</span>
        </div>

        <div className="mt-6">
          <CalendarSubscribe />
        </div>

        <div className="mt-6 flex items-center gap-1 border border-[var(--hairline)] w-fit">
          <button
            onClick={() => setView("list")}
            className={`px-3 py-1 text-[11px] uppercase tracking-widest ${view === "list" ? "bg-[var(--ink)] text-[var(--surface)]" : ""}`}
          >List</button>
          <button
            onClick={() => setView("calendar")}
            className={`px-3 py-1 text-[11px] uppercase tracking-widest ${view === "calendar" ? "bg-[var(--ink)] text-[var(--surface)]" : ""}`}
          >Calendar</button>
        </div>

        {data.length === 0 ? (
          <p className="meta mt-10">No upcoming events with verified source links.</p>
        ) : view === "calendar" ? (
          <EventsCalendarGrid events={data} />
        ) : (
          <EventsBrowser events={data} grouped />
        )}

        <section className="mt-12 max-w-md">
          <LocalBusinessSpotlight slot="events" />
        </section>

        <section className="mt-12 border-t border-[var(--ink)] pt-10 pb-2">
          <NewsletterForm source="events_page" variant="band" />
        </section>
      </main>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `Events | ${siteName()}`,
          url: absUrl("/events"),
        }}
      />
      {data.length > 0 && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "ItemList",
            itemListElement: data.slice(0, 30).map((e, i) => ({
              "@type": "ListItem",
              position: i + 1,
              item: {
                "@type": "Event",
                name: e.title,
                startDate: e.start_at,
                ...(e.end_at ? { endDate: e.end_at } : {}),
                url: e.source_url ?? absUrl(`/event/${e.slug}`),
                ...(e.venue
                  ? {
                      location: {
                        "@type": "Place",
                        name: e.venue,
                      },
                    }
                  : {}),
              },
            })),
          }}
        />
      )}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: absUrl("/") },
            { "@type": "ListItem", position: 2, name: "Events", item: absUrl("/events") },
          ],
        }}
      />
    </>
  );
}
