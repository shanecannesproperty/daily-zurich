import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { listSentEditions } from "@/lib/data.functions";
import { buildMeta, canonicalLinks } from "@/lib/seo";
import { siteName, cityName } from "@/lib/city";
import { formatDateTime } from "@/lib/date";

const editionsQuery = queryOptions({
  queryKey: ["editions", "list"],
  queryFn: () => listSentEditions(),
  staleTime: 5 * 60 * 1000,
});

export const Route = createFileRoute("/editions")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(editionsQuery).catch(() => undefined),
  head: () => ({
    meta: buildMeta({
      title: `Past editions — ${siteName()}`,
      description: `Browse past editions of ${siteName()}, your daily ${cityName()} briefing.`,
      path: "/editions",
    }),
    links: canonicalLinks("/editions"),
  }),
  errorComponent: ({ error }) => (
    <main className="container-read py-16">
      <h1 className="h1-news">Editions unavailable</h1>
      <p className="meta mt-4">{error.message}</p>
    </main>
  ),
  notFoundComponent: () => (
    <main className="container-read py-16">
      <h1 className="h1-news">Not found</h1>
    </main>
  ),
  component: EditionsPage,
});

type EditionRow = {
  id: string;
  edition_date?: string | null;
  subject?: string | null;
  subject_line?: string | null;
  hook?: string | null;
  preview_text?: string | null;
};

function EditionsPage() {
  const data = useSuspenseQuery(editionsQuery).data as unknown as EditionRow[] | undefined;
  const editions: EditionRow[] = Array.isArray(data) ? data : [];

  return (
    <>
      <SiteHeader activePath="/editions" />
      <main>
        <section className="container-read pt-12 pb-6">
          <p className="kicker">Newsletter</p>
          <h1 className="h1-news mt-2">Past editions</h1>
          <p className="dek mt-4">
            Every weekday morning we send {cityName()} a free briefing. Read past editions below.
          </p>
        </section>

        <section className="container-read border-t border-[var(--ink)] pt-8 pb-16">
          {editions.length === 0 ? (
            <div className="border border-[var(--hairline)] bg-[var(--surface)] p-8 text-center">
              <p className="serif text-lg">Coming soon — first edition dropping soon.</p>
              <Link to="/subscribe" className="btn-primary mt-5 inline-flex">
                Subscribe free
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--hairline)]">
              {editions.map((e) => {
                const title = e.subject || e.subject_line || "Edition";
                const preview = e.hook || e.preview_text || "";
                const date = e.edition_date ? formatDateTime(e.edition_date) : "";
                return (
                  <li key={e.id} className="py-5">
                    {date && <p className="meta text-xs">{date}</p>}
                    <h2 className="serif text-xl sm:text-2xl mt-1 leading-snug">
                      <Link
                        to="/newsletter/$id"
                        params={{ id: e.id }}
                        className="no-underline hover:underline text-[var(--ink)]"
                      >
                        {title}
                      </Link>
                    </h2>
                    {preview && <p className="meta mt-2 line-clamp-2">{preview}</p>}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
