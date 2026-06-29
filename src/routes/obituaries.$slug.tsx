import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getObituary } from "@/lib/data.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { buildMeta, canonicalLinks } from "@/lib/seo";
import { siteName, cityName } from "@/lib/city";
import { OBITUARY_NOTICE_LABELS } from "@/lib/schema";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { formatDate } from "@/lib/date";

function obituaryQuery(slug: string) {
  return queryOptions({
    queryKey: ["obituary", slug],
    queryFn: () => getObituary({ data: slug }),
  });
}

export const Route = createFileRoute("/obituaries/$slug")({
  loader: async ({ context, params }) => {
    const notice = await context.queryClient.ensureQueryData(obituaryQuery(params.slug));
    if (!notice) throw notFound();
    return notice;
  },
  head: ({ loaderData: notice }) => {
    if (!notice) return {};
    const displayName = notice.preferred_name
      ? `${notice.full_name} (${notice.preferred_name})`
      : notice.full_name;
    const label = OBITUARY_NOTICE_LABELS[notice.notice_type] ?? "Notice";
    const died = notice.date_of_death ? ` — died ${formatDate(notice.date_of_death)}` : "";
    return {
      meta: buildMeta({
        title: `${displayName}${died} | ${label} | ${siteName()}`,
        description: `${label} for ${displayName}${notice.suburb ? ` of ${notice.suburb}` : ""}${died}. Published by ${siteName()}.`,
        path: `/obituaries/${notice.slug}`,
        image: notice.photo_url ?? undefined,
      }),
      links: canonicalLinks(`/obituaries/${notice.slug}`),
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(buildPersonSchema(notice)),
        },
      ],
    };
  },
  component: ObituaryNoticePage,
  notFoundComponent: () => (
    <>
      <SiteHeader activePath="/obituaries" />
      <main>
        <div className="container-read pt-12 pb-16">
          <p className="kicker">Notice not found</p>
          <h1 className="h1-news mt-1">This notice is no longer available</h1>
          <p className="dek mt-3">
            <Link to="/obituaries" className="underline">
              Return to all notices
            </Link>
          </p>
        </div>
      </main>
    </>
  ),
});

type NoticeData = NonNullable<Awaited<ReturnType<typeof getObituary>>>;

function buildPersonSchema(notice: NoticeData) {
  const graph: object[] = [
    {
      "@context": "https://schema.org",
      "@type": "Person",
      name: notice.full_name,
      ...(notice.preferred_name ? { alternateName: notice.preferred_name } : {}),
      ...(notice.date_of_death ? { deathDate: notice.date_of_death } : {}),
      ...(notice.suburb
        ? {
            address: {
              "@type": "PostalAddress",
              addressLocality: notice.suburb,
              addressCountry: "AU",
            },
          }
        : {}),
      ...(notice.body_html
        ? { description: notice.body_html.replace(/<[^>]+>/g, " ").trim().slice(0, 300) }
        : {}),
      ...(notice.photo_url ? { image: notice.photo_url } : {}),
    },
  ];

  // Add a memorial event if service details contain a date hint
  if (notice.service_details) {
    graph.push({
      "@context": "https://schema.org",
      "@type": "Event",
      name: `Memorial service for ${notice.full_name}`,
      description: notice.service_details,
      eventStatus: "https://schema.org/EventScheduled",
      organizer: notice.funeral_director
        ? {
            "@type": "Organization",
            name: notice.funeral_director,
            ...(notice.funeral_director_url ? { url: notice.funeral_director_url } : {}),
          }
        : undefined,
    });
  }

  return { "@context": "https://schema.org", "@graph": graph };
}

function ObituaryNoticePage() {
  const { slug } = Route.useParams();
  const { data: notice } = useSuspenseQuery(obituaryQuery(slug));
  if (!notice) return null;

  const label = OBITUARY_NOTICE_LABELS[notice.notice_type] ?? "Notice";
  const displayName = notice.preferred_name
    ? `${notice.full_name} (${notice.preferred_name})`
    : notice.full_name;
  const died = formatDate(notice.date_of_death);
  const body = sanitizeHtml(notice.body_html);

  return (
    <>
      <SiteHeader activePath="/obituaries" />
      <main>
        <article className="container-read pt-8 pb-16" itemScope itemType="https://schema.org/Person">
          <nav className="mb-6">
            <Link to="/obituaries" className="meta underline">
              ← Obituaries &amp; death notices
            </Link>
          </nav>

          <p className="kicker">{label}</p>
          <h1 className="h1-news mt-1" itemProp="name">
            {displayName}
          </h1>

          <p className="dek mt-3">
            {notice.age != null && <>Aged {notice.age}</>}
            {notice.age != null && (notice.suburb || died) && <> &middot; </>}
            {notice.suburb && <span itemProp="address">{notice.suburb}</span>}
            {notice.suburb && died && <> &middot; </>}
            {died && (
              <span itemProp="deathDate" content={notice.date_of_death ?? ""}>
                Died {died}
              </span>
            )}
          </p>

          {notice.photo_url && (
            <img
              src={notice.photo_url}
              alt={`Photograph of ${notice.full_name}`}
              className="mt-6 h-40 w-40 rounded object-cover"
              loading="eager"
              decoding="async"
              width={160}
              height={160}
              itemProp="image"
            />
          )}

          {body && (
            <div
              className="prose-news mt-6"
              dangerouslySetInnerHTML={{ __html: body }}
              itemProp="description"
            />
          )}

          {notice.service_details && (
            <div className="mt-8 border-t border-[var(--hairline)] pt-6">
              <p className="kicker">Service details</p>
              <p className="serif mt-2 whitespace-pre-line text-lg">{notice.service_details}</p>
            </div>
          )}

          {notice.funeral_director && (
            <p className="meta mt-6">
              Arranged by{" "}
              {notice.funeral_director_url ? (
                <a
                  href={notice.funeral_director_url}
                  target="_blank"
                  rel="noopener nofollow ugc"
                  itemProp="url"
                >
                  {notice.funeral_director}
                </a>
              ) : (
                notice.funeral_director
              )}
            </p>
          )}

          {notice.published_at && (
            <p className="meta mt-4">
              Published {formatDate(notice.published_at)} &middot;{" "}
              {cityName()} death &amp; funeral notices
            </p>
          )}

          <div className="mt-12 border-t border-[var(--hairline)] pt-6">
            <Link to="/obituaries" className="underline meta">
              ← See all obituaries and death notices for {cityName()}
            </Link>
          </div>
        </article>
      </main>
    </>
  );
}
