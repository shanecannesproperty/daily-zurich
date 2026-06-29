import { createFileRoute, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getEventBySlug } from "@/lib/data.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { JsonLd } from "@/components/JsonLd";
import { EventImage, isRealCover } from "@/components/EventImage";
import { buildMeta, canonicalLinks, absUrl } from "@/lib/seo";
import { cityName, siteName, cityRegion } from "@/lib/city";
import { formatDate, formatDateTime, isoUtc } from "@/lib/date";
import { AddToCalendar } from "@/components/AddToCalendar";
import type { EventRow } from "@/lib/schema";

function buildEventDescription(e: EventRow): string {
  const parts: string[] = [e.title];
  if (e.start_at) parts.push(`\u2014 ${formatDate(e.start_at)}`);
  if (e.venue) parts.push(`at ${e.venue}`);
  if (e.suburb) parts.push(`in ${e.suburb}`);
  else parts.push(`in ${cityName()}`);
  if (e.price) {
    const free = /free|gratis|no charge/i.test(e.price);
    parts.push(free ? "(Free)" : `(${e.price})`);
  }
  const raw = parts.join(" ");
  if (raw.length <= 155) return raw;
  return raw.slice(0, 154).replace(/\s+\S*$/, "") + "\u2026";
}

function eventQ(slug: string) {
  return queryOptions({
    queryKey: ["event", slug],
    queryFn: () => getEventBySlug({ data: { slug } }),
  });
}

export const Route = createFileRoute("/event/$slug")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(eventQ(params.slug));
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    const e = loaderData;
    if (!e) return { meta: [{ title: `Not found | ${siteName()}` }] };
    return {
      meta: buildMeta({
        title: `${e.title} | ${siteName()}`,
        description: buildEventDescription(e),
        path: `/event/${e.slug}`,
        image: isRealCover(e.image_url) ? e.image_url : null,
        type: "article",
      }),
      links: canonicalLinks(`/event/${e.slug}`),
    };
  },
  component: EventPage,
});

function EventPage() {
  const data = useSuspenseQuery(eventQ(Route.useParams().slug)).data;
  if (!data) return null;
  const path = `/event/${data.slug}`;
  return (
    <>
      <SiteHeader activePath="/events" />
      <main className="container-read py-10">
        <nav className="meta mb-4" aria-label="Breadcrumb">
          <a href="/">Home</a> / <a href="/events">Events</a>
        </nav>
        <p className="kicker">{data.category ?? "Event"}</p>
        <h1 className="h1-news mt-2">{data.title}</h1>
        <p className="meta mt-3">
          {formatDateTime(data.start_at)}
          {data.end_at ? ` to ${formatDateTime(data.end_at)}` : ""}
        </p>
        <p className="meta">{[data.venue, data.suburb].filter(Boolean).join(", ")}</p>
        {isRealCover(data.image_url) && (
          <figure className="mt-6">
            <EventImage
              src={data.image_url}
              alt={`Photo from ${data.title}`}
              loading="eager"
              fetchPriority="high"
            />
          </figure>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          {data.booking_url && (
            <a href={data.booking_url} target="_blank" rel="noopener" className="btn-primary">
              Book or details
            </a>
          )}
          {data.source_url && (
            <a
              href={data.source_url}
              target="_blank"
              rel="noopener nofollow ugc"
              className="btn-ghost"
            >
              Source
            </a>
          )}
          <AddToCalendar event={data} />
        </div>
        <p className="meta mt-6">
          Event listing summarised by {siteName()}. Verify details with the source before attending.
        </p>
      </main>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Event",
          name: data.title,
          description: buildEventDescription(data),
          startDate: isoUtc(data.start_at),
          endDate: isoUtc(data.end_at),
          eventStatus: "https://schema.org/EventScheduled",
          eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
          location: data.venue
            ? {
                "@type": "Place",
                name: data.venue,
                address: {
                  "@type": "PostalAddress",
                  addressLocality: data.suburb ?? cityName(),
                  addressRegion: cityRegion(),
                  addressCountry: "AU",
                },
              }
            : undefined,
          image: isRealCover(data.image_url) ? [data.image_url] : undefined,
          offers: (() => {
            const link = data.booking_url ?? data.source_url ?? absUrl(path);
            const p = data.price;
            const m = p ? p.match(/(\d+(?:\.\d+)?)/) : null;
            const price = p && /free|gratis|no charge/i.test(p) ? "0" : m ? m[1] : undefined;
            return {
              "@type": "Offer",
              url: link,
              availability: "https://schema.org/InStock",
              priceCurrency: "AUD",
              validFrom: isoUtc(data.created_at),
              ...(price !== undefined ? { price } : {}),
            };
          })(),
          url: absUrl(path),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: absUrl("/") },
            { "@type": "ListItem", position: 2, name: "Events", item: absUrl("/events") },
            { "@type": "ListItem", position: 3, name: data.title, item: absUrl(path) },
          ],
        }}
      />
    </>
  );
}
