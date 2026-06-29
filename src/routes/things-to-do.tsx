import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listEvents } from "@/lib/data.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { JsonLd } from "@/components/JsonLd";
import { buildMeta, canonicalLinks, absUrl } from "@/lib/seo";
import { cityName, siteName } from "@/lib/city";
import type { EventRow } from "@/lib/schema";

const eventsQ = queryOptions({ queryKey: ["events"], queryFn: () => listEvents() });

export const Route = createFileRoute("/things-to-do")({
  loader: ({ context }) => context.queryClient.ensureQueryData(eventsQ),
  head: () => ({
    meta: buildMeta({
      title: `Things to do in ${cityName()} | ${siteName()}`,
      description: `Every upcoming ${cityName()} event, grouped by category. Music, arts, food, markets, family and community.`,
      path: "/things-to-do",
    }),
    links: canonicalLinks("/things-to-do"),
  }),
  component: ThingsToDoPage,
});

function ThingsToDoPage() {
  const { data: events } = useSuspenseQuery(eventsQ);
  const groups = new Map<string, EventRow[]>();
  for (const e of events) {
    const k = (e.category ?? "Other").toString();
    const arr = groups.get(k) ?? [];
    arr.push(e);
    groups.set(k, arr);
  }
  const orderedGroups = Array.from(groups.entries()).sort((a, b) => b[1].length - a[1].length);

  return (
    <>
      <SiteHeader activePath="/things-to-do" />
      <main className="container-news py-10">
        <nav className="meta mb-4">
          <a href="/">Home</a> / Things to do
        </nav>
        <p className="kicker">Things to do</p>
        <h1 className="h1-news mt-2">Things to do in {cityName()}</h1>
        <p className="dek mt-3 max-w-2xl">
          Verified, source backed events grouped by category. Updated daily.
        </p>

        {orderedGroups.length === 0 ? (
          <p className="meta mt-10">No upcoming events listed yet.</p>
        ) : (
          orderedGroups.map(([cat, list]) => (
            <section key={cat} className="mt-12 border-t border-[var(--ink)] pt-6">
              <h2 className="h2-news capitalize">{cat}</h2>
              <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {list.slice(0, 18).map((e) => (
                  <li key={e.id} className="border-t border-[var(--hairline)] pt-4">
                    <a href={`/event/${e.slug}`} className="no-underline hover:no-underline">
                      <p className="meta uppercase tracking-widest">
                        {e.start_at
                          ? new Date(e.start_at).toLocaleString("en-AU", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                              timeZone: "Australia/Sydney",
                            })
                          : ""}
                      </p>
                      <h3 className="serif text-xl font-semibold mt-1 leading-snug">{e.title}</h3>
                      <p className="meta mt-2">{e.venue ?? e.suburb ?? cityName()}</p>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </main>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `Things to do in ${cityName()} | ${siteName()}`,
          url: absUrl("/things-to-do"),
        }}
      />
    </>
  );
}
