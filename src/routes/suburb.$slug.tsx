import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listSuburbContent } from "@/lib/data.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { EventsBrowser } from "@/components/EventsBrowser";
import { buildMeta, canonicalLinks } from "@/lib/seo";
import { cityName, siteName } from "@/lib/city";

const SUBURBS = [
  "braddon",
  "kingston",
  "manuka",
  "civic",
  "belconnen",
  "gungahlin",
  "tuggeranong",
  "woden",
  "dickson",
  "barton",
  "acton",
  "fyshwick",
  "phillip",
];

const suburbQ = (slug: string) =>
  queryOptions({
    queryKey: ["suburb", slug],
    queryFn: () => listSuburbContent({ data: { slug } }),
  });

export const Route = createFileRoute("/suburb/$slug")({
  loader: async ({ context, params }) => {
    if (!SUBURBS.includes(params.slug)) throw notFound();
    return context.queryClient.ensureQueryData(suburbQ(params.slug));
  },
  head: ({ params }) => {
    const name = params.slug.charAt(0).toUpperCase() + params.slug.slice(1).replace(/-/g, " ");
    return {
      meta: buildMeta({
        title: `${name}, ${cityName()} — events & places | ${siteName()}`,
        description: `What's on and where to go in ${name}, ${cityName()}. Events, cafes and businesses curated by ${siteName()}.`,
        path: `/suburb/${params.slug}`,
      }),
      links: canonicalLinks(`/suburb/${params.slug}`),
    };
  },
  notFoundComponent: () => (
    <main className="container-news py-16 text-center">
      <p className="kicker">404</p>
      <h1 className="h1-news mt-2">Suburb not found</h1>
      <p className="dek mt-3">
        <Link to="/events" className="underline">
          Browse all events
        </Link>
      </p>
    </main>
  ),
  component: SuburbPage,
});

function SuburbPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(suburbQ(slug));
  return (
    <>
      <SiteHeader activePath="" />
      <main className="container-news py-10">
        <nav className="meta mb-4">
          <Link to="/">Home</Link> / <Link to="/events">Events</Link> / {data.name}
        </nav>
        <p className="kicker">{cityName()} suburb</p>
        <h1 className="h1-news mt-1">{data.name}</h1>
        <p className="dek mt-3 max-w-2xl">Upcoming events and notable places in {data.name}.</p>

        <section className="mt-10">
          <h2 className="h2-news">What&apos;s on</h2>
          {data.events.length === 0 ? (
            <p className="meta mt-4">No upcoming events listed for {data.name}.</p>
          ) : (
            <div className="mt-4">
              <EventsBrowser events={data.events} />
            </div>
          )}
        </section>

        <section className="mt-12 border-t border-[var(--ink)] pt-10">
          <h2 className="h2-news">Local places</h2>
          {data.listings.length === 0 ? (
            <p className="meta mt-4">No listings yet for {data.name}.</p>
          ) : (
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.listings.map((l) => (
                <li key={l.id} className="border border-[var(--ink)] p-4">
                  <p className="kicker">{l.category ?? "Listing"}</p>
                  <h3 className="h3-news mt-1">{l.business_name}</h3>
                  {l.website_url && (
                    <a
                      href={l.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="meta mt-2 inline-block underline"
                    >
                      Visit website
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
