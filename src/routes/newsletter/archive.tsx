import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { listSentEditions } from "@/lib/data.functions";
import { buildMeta, canonicalLinks } from "@/lib/seo";
import { cityName, siteName } from "@/lib/city";

const editionsQuery = queryOptions({
  queryKey: ["editions", "archive"],
  queryFn: () => listSentEditions(),
});

export const Route = createFileRoute("/newsletter/archive")({
  loader: ({ context }) => context.queryClient.ensureQueryData(editionsQuery),
  head: () => ({
    meta: buildMeta({
      title: `Newsletter Archive | ${siteName()}`,
      description: `Browse past ${siteName()} editions. Your daily briefing on local news, events and what's happening in ${cityName()}.`,
      path: "/newsletter/archive",
    }),
    links: canonicalLinks("/newsletter/archive"),
  }),
  errorComponent: ({ error }) => (
    <main className="container-read py-12">
      <p className="meta" role="alert">Couldn't load the archive: {error.message}</p>
    </main>
  ),
  notFoundComponent: () => (
    <main className="container-read py-12">
      <p className="meta">No editions yet.</p>
    </main>
  ),
  component: ArchivePage,
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

function ArchivePage() {
  const editions = useSuspenseQuery(editionsQuery).data;

  return (
    <>
      <SiteHeader />
      <main className="container-read py-10">
        <p className="kicker">Newsletter</p>
        <h1 className="h1-news mt-2">Newsletter archive</h1>
        <p className="dek mt-4 max-w-2xl">
          Every weekday morning we send {cityName()} a free briefing. Browse past editions below.
        </p>

        <aside className="mt-8 flex items-center justify-between gap-4 border border-[var(--ink-red)] bg-[var(--surface)] p-5">
          <div>
            <p className="serif text-lg leading-snug">
              <strong>Get tomorrow's edition free.</strong> Local news, in your inbox before 7am.
            </p>
          </div>
          <Link to="/subscribe" className="btn-primary whitespace-nowrap">
            Subscribe free →
          </Link>
        </aside>

        <section className="mt-10" aria-label="Past editions">
          {editions.length === 0 ? (
            <p className="meta">No editions published yet.</p>
          ) : (
            <ul className="grid gap-6 sm:grid-cols-2">
              {editions.map((e) => (
                <li
                  key={e.id}
                  className="border border-[var(--hairline)] bg-[var(--surface)] p-5 flex flex-col"
                >
                  <p className="label uppercase tracking-widest text-[var(--ink-red)]">
                    {formatFullDate(e.edition_date)}
                  </p>
                  <h2 className="serif mt-2 text-xl leading-snug">
                    <Link
                      to="/newsletter/$id"
                      params={{ id: e.id }}
                      className="hover:underline"
                    >
                      {e.subject ?? "Daily briefing"}
                    </Link>
                  </h2>
                  {e.hook && (
                    <p className="meta mt-2 line-clamp-2 leading-relaxed">{e.hook}</p>
                  )}
                  <Link
                    to="/newsletter/$id"
                    params={{ id: e.id }}
                    className="mt-4 text-[var(--ink-red)] serif"
                  >
                    Read edition →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
