import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listThisWeekendEvents, listDirectory } from "@/lib/data.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { NewsletterForm } from "@/components/NewsletterForm";
import { JsonLd } from "@/components/JsonLd";
import { buildMeta, canonicalLinks, absUrl } from "@/lib/seo";
import { cityName, citySlug, siteName } from "@/lib/city";

const q = queryOptions({
  queryKey: ["this-weekend"],
  queryFn: async () => {
    const [events, listings] = await Promise.all([listThisWeekendEvents(), listDirectory()]);
    return { events, listings };
  },
});

export const Route = createFileRoute("/this-weekend")({
  loader: ({ context }) => context.queryClient.ensureQueryData(q),
  head: () => ({
    meta: buildMeta({
      title: `This weekend in ${cityName()} | ${siteName()}`,
      description: `Everything on in ${cityName()} this Friday, Saturday and Sunday. Verified events, places to eat and one outdoor pick.`,
      path: "/this-weekend",
    }),
    links: canonicalLinks("/this-weekend"),
  }),
  component: ThisWeekendPage,
});

function ThisWeekendPage() {
  const { data } = useSuspenseQuery(q);
  const brunch = data.listings
    .filter((l) => (l.category ?? "").toLowerCase() === "cafe")
    .slice(0, 4);
  const events = data.events.slice(0, 12);
  return (
    <>
      <SiteHeader activePath="/this-weekend" />
      <main className="container-news py-10">
        <nav className="meta mb-4">
          <a href="/">Home</a> / This weekend
        </nav>
        <p className="kicker">This weekend</p>
        <h1 className="h1-news mt-2">What to do in {cityName()} this weekend</h1>
        <p className="dek mt-3 max-w-2xl">
          Curated by {siteName()} newsroom. Friday to Sunday, with one outdoor pick and a brunch
          shortlist.
        </p>

        <section className="mt-10 border-t border-[var(--ink)] pt-6">
          <h2 className="h2-news">Events Fri to Sun</h2>
          {events.length === 0 ? (
            <p className="meta mt-4">
              No events listed for this weekend yet. Check{" "}
              <a href="/events" className="underline">
                all upcoming events
              </a>
              .
            </p>
          ) : (
            <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((e) => (
                <li key={e.id} className="border-t border-[var(--hairline)] pt-4">
                  <a href={`/event/${e.slug}`} className="no-underline hover:no-underline">
                    <p className="meta uppercase tracking-widest">
                      {e.start_at
                        ? new Date(e.start_at).toLocaleString("en-AU", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            hour: "numeric",
                            minute: "2-digit",
                            timeZone: "Australia/Sydney",
                          })
                        : ""}
                    </p>
                    <h3 className="serif text-xl font-semibold mt-1 leading-snug">{e.title}</h3>
                    <p className="meta mt-2">
                      {e.venue ?? e.suburb ?? cityName()}
                      {e.category ? ` · ${e.category}` : ""}
                    </p>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-12 border-t border-[var(--ink)] pt-6">
          <h2 className="h2-news">Where to brunch</h2>
          <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {brunch.map((b) => (
              <li key={b.id} className="border-t border-[var(--hairline)] pt-4">
                <h3 className="serif text-lg font-semibold">{b.business_name}</h3>
                <p className="meta mt-1">{b.suburb}</p>
                {b.website_url ? (
                  <a
                    href={b.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="meta uppercase tracking-widest mt-2 inline-block"
                  >
                    Website
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="meta mt-6">
            More picks in our{" "}
            <a href={`/best/best-brunch-${citySlug()}`} className="underline">
              Best Brunch in {cityName()} guide
            </a>
            .
          </p>
        </section>

        {/* Hardcoded Canberra editorial pick: only render on the Canberra build
            so other cities never show Canberra-specific prose/landmarks. */}
        {citySlug() === "canberra" && (
          <section className="mt-12 border-t border-[var(--ink)] pt-6">
            <h2 className="h2-news">One outdoor pick</h2>
            <div className="mt-4 max-w-2xl">
              <h3 className="serif text-xl font-semibold">Mount Ainslie summit walk</h3>
              <p className="serif mt-2 text-[16px]">
                40 minute climb from the Australian War Memorial, with the country's most iconic
                vista at the top. Best at sunrise or last light.
              </p>
              <p className="meta mt-3">
                More options in our{" "}
                <a href="/best/best-hikes-canberra" className="underline">
                  hikes guide
                </a>
                .
              </p>
            </div>
          </section>
        )}

        <section className="mt-12 border-t border-[var(--ink)] pt-10 pb-2">
          <NewsletterForm source="this_weekend" variant="band" />
        </section>
      </main>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `This weekend in ${cityName()} | ${siteName()}`,
          url: absUrl("/this-weekend"),
        }}
      />
    </>
  );
}
