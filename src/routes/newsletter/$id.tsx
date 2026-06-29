import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { NewsletterForm } from "@/components/NewsletterForm";
import { getEditionById } from "@/lib/data.functions";
import { buildMeta, canonicalLinks } from "@/lib/seo";
import { cityName, siteName } from "@/lib/city";
import type {
  EditionSection,
  EditionTopItem,
  EditionEventItem,
  EditionJobItem,
} from "@/lib/schema";

function editionQuery(id: string) {
  return queryOptions({
    queryKey: ["edition", id],
    queryFn: () => getEditionById({ data: { id } }),
  });
}

export const Route = createFileRoute("/newsletter/$id")({
  loader: async ({ context, params }) => {
    const edition = await context.queryClient.ensureQueryData(editionQuery(params.id));
    if (!edition) throw notFound();
    return edition;
  },
  head: ({ loaderData, params }) => {
    const e = loaderData;
    const subject = e?.subject ?? "Daily briefing";
    const desc = e?.hook ?? `${siteName()} daily briefing — local news for ${cityName()}.`;
    return {
      meta: buildMeta({
        title: `${subject} | ${siteName()}`,
        description: desc,
        path: `/newsletter/${params.id}`,
        type: "article",
      }),
      links: canonicalLinks(`/newsletter/${params.id}`),
    };
  },
  errorComponent: ({ error }) => (
    <main className="container-read py-12">
      <p className="meta" role="alert">Couldn't load edition: {error.message}</p>
    </main>
  ),
  notFoundComponent: () => (
    <main className="container-read py-12">
      <h1 className="h1-news">Edition not found</h1>
      <p className="meta mt-4">
        <Link to="/newsletter/archive">← Back to archive</Link>
      </p>
    </main>
  ),
  component: EditionPage,
});

function formatFullDate(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(`${iso}T00:00:00`).toLocaleDateString("en-AU", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Australia/Sydney",
    });
  } catch {
    return iso ?? "";
  }
}

function EditionPage() {
  const edition = useSuspenseQuery(editionQuery(Route.useParams().id)).data;
  if (!edition) return null;

  return (
    <>
      <SiteHeader />
      <main className="bg-[var(--bg)] py-8">
        <div className="mx-auto px-5" style={{ maxWidth: 680 }}>
          {/* Top bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--hairline)] pb-4">
            <Link
              to="/newsletter/archive"
              className="meta hover:underline"
            >
              ← Back to archive
            </Link>
            <p className="meta">{formatFullDate(edition.edition_date)}</p>
            <Link to="/subscribe" className="btn-primary text-sm">
              Subscribe free →
            </Link>
          </div>

          {/* Edition body */}
          <article className="mt-8">
            <p className="kicker">{cityName()} morning briefing</p>
            <h1 className="serif text-3xl sm:text-4xl mt-2 leading-tight">
              {edition.subject ?? "Daily briefing"}
            </h1>
            {edition.hook && (
              <p className="dek mt-4 leading-relaxed">{edition.hook}</p>
            )}

            <div className="mt-8 space-y-10">
              {(edition.sections ?? []).map((section, i) => (
                <SectionBlock key={i} section={section} />
              ))}
            </div>
          </article>

          {/* Footer CTA */}
          <section className="mt-14 border-t border-[var(--ink)] pt-8">
            <p className="kicker">Daily brief</p>
            <h2 className="serif text-2xl mt-1">
              Get tomorrow's briefing delivered free
            </h2>
            <p className="dek mt-2">
              Local news, events and what matters in {cityName()} — in your inbox before 7am.
            </p>
            <div className="mt-4">
              <NewsletterForm source={`newsletter-edition:${edition.id}`} variant="compact" />
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

function SectionBlock({ section }: { section: EditionSection }) {
  return (
    <section>
      <h2 className="kicker">{section.title}</h2>
      {section.type === "weather" && section.text && (
        <p className="serif mt-3 leading-relaxed">{section.text}</p>
      )}
      {section.type === "top" && section.items && (
        <ol className="mt-4 space-y-5">
          {(section.items as EditionTopItem[]).map((it, i) => (
            <li key={i}>
              <p className="serif text-lg leading-snug font-semibold">
                {it.url ? (
                  <a href={it.url} target="_blank" rel="noopener nofollow">
                    {it.headline}
                  </a>
                ) : (
                  it.headline
                )}
              </p>
              {it.summary && <p className="meta mt-1 leading-relaxed">{it.summary}</p>}
              {it.source && <p className="meta mt-1 italic">{it.source}</p>}
            </li>
          ))}
        </ol>
      )}
      {section.type === "events" && section.items && (
        <ul className="mt-4 space-y-3">
          {(section.items as EditionEventItem[]).map((it, i) => (
            <li key={i}>
              <p className="serif">
                <a href={it.url} target="_blank" rel="noopener nofollow">
                  {it.headline}
                </a>
              </p>
              {(it.venue || it.when) && (
                <p className="meta">
                  {[it.venue, it.when].filter(Boolean).join(" · ")}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      {section.type === "jobs" && section.items && (
        <ul className="mt-4 space-y-3">
          {(section.items as EditionJobItem[]).map((it, i) => (
            <li key={i}>
              <p className="serif">
                <a href={it.url} target="_blank" rel="noopener nofollow">
                  {it.headline}
                </a>
              </p>
              {it.employer && <p className="meta">{it.employer}</p>}
            </li>
          ))}
        </ul>
      )}
      {section.more_url && (
        <p className="mt-4">
          <a href={section.more_url} className="text-[var(--ink-red)] serif">
            See more →
          </a>
        </p>
      )}
    </section>
  );
}
