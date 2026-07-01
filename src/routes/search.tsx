import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { searchSite } from "@/lib/data.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { buildMeta, canonicalLinks } from "@/lib/seo";
import { cityName, siteName } from "@/lib/city";
import { EmptyState } from "@/components/EmptyState";

const searchSchema = z.object({ q: z.string().optional().default("") });

export const Route = createFileRoute("/search")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: buildMeta({
      title: `Search | ${siteName()}`,
      description: `Search ${cityName()} news, events and the local directory.`,
      path: "/search",
    }),
    links: canonicalLinks("/search"),
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const nav = useNavigate({ from: "/search" });
  const [input, setInput] = useState(q);
  const [results, setResults] = useState<Awaited<ReturnType<typeof searchSite>> | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setInput(q);
    if (!q) {
      setResults(null);
      return;
    }
    setBusy(true);
    searchSite({ data: { q } })
      .then((r) => setResults(r))
      .catch(() => setResults({ articles: [], events: [], listings: [] }))
      .finally(() => setBusy(false));
  }, [q]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = input.trim();
    void nav({ search: { q: value } });
  }

  return (
    <>
      <SiteHeader activePath="/search" />
      <main className="container-news py-10">
        <nav className="meta mb-4">
          <a href="/">Home</a> / Search
        </nav>
        <p className="kicker">Search</p>
        <h1 className="h1-news mt-2">Search {siteName()}</h1>

        <form onSubmit={submit} className="mt-6 flex gap-2 max-w-xl">
          <input
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Try: parliament, brunch, light rail"
            className="field flex-1"
            autoFocus
          />
          <button type="submit" className="btn-primary">
            Search
          </button>
        </form>

        {!q && !busy ? (
          <section className="mt-10">
            <p className="kicker">Popular searches</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {[
                "News",
                "Weather",
                "Sport",
                "Business",
                "Politics",
                "Events",
                "Community",
                "This Weekend",
              ].map((term) => (
                <li key={term}>
                  <button
                    type="button"
                    onClick={() => {
                      setInput(term);
                      void nav({ search: { q: term } });
                    }}
                    className="btn-ghost"
                  >
                    {term}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {busy ? <p className="meta mt-8">Searching</p> : null}

        {results && !busy && results.articles.length === 0 && results.events.length === 0 && results.listings.length === 0 ? (
          <EmptyState
            title={`No results for "${q}"`}
            message={`We couldn't find any ${cityName()} articles, events or directory listings matching that search. Try a different term, or browse the latest stories.`}
            primaryHref="/"
            primaryLabel="Browse all articles →"
          />
        ) : null}

        {results && !busy && (results.articles.length || results.events.length || results.listings.length) ? (
          <div className="mt-10 space-y-12">
            <section>
              <h2 className="h2-news border-t border-[var(--ink)] pt-4">
                Articles ({results.articles.length})
              </h2>
              {results.articles.length ? (
                <ul className="mt-6 grid gap-6 md:grid-cols-2">
                  {results.articles.map(
                    (a: {
                      id: string;
                      slug: string;
                      title: string;
                      dek: string | null;
                      category: string;
                    }) => (
                      <li key={a.id} className="border-t border-[var(--hairline)] pt-4">
                        <a href={`/article/${a.slug}`} className="no-underline hover:no-underline">
                          <p className="meta uppercase tracking-widest">{a.category}</p>
                          <h3 className="serif text-xl font-semibold mt-1">{a.title}</h3>
                          {a.dek ? <p className="meta mt-2">{a.dek}</p> : null}
                        </a>
                      </li>
                    ),
                  )}
                </ul>
              ) : (
                <p className="meta mt-4">No articles matched.</p>
              )}
            </section>

            <section>
              <h2 className="h2-news border-t border-[var(--ink)] pt-4">
                Events ({results.events.length})
              </h2>
              {results.events.length ? (
                <ul className="mt-6 grid gap-6 md:grid-cols-2">
                  {results.events.map(
                    (e: {
                      id: string;
                      slug: string;
                      title: string;
                      venue: string | null;
                      suburb: string | null;
                      start_at: string | null;
                    }) => (
                      <li key={e.id} className="border-t border-[var(--hairline)] pt-4">
                        <a href={`/event/${e.slug}`} className="no-underline hover:no-underline">
                          <p className="meta uppercase tracking-widest">
                            {e.start_at
                              ? new Date(e.start_at).toLocaleDateString(cityBcp47(), {
                                  weekday: "short",
                                  day: "numeric",
                                  month: "short",
                                  timeZone: "Australia/Sydney",
                                })
                              : ""}
                          </p>
                          <h3 className="serif text-lg font-semibold mt-1">{e.title}</h3>
                          <p className="meta mt-2">{e.venue ?? e.suburb}</p>
                        </a>
                      </li>
                    ),
                  )}
                </ul>
              ) : (
                <p className="meta mt-4">No events matched.</p>
              )}
            </section>

            <section>
              <h2 className="h2-news border-t border-[var(--ink)] pt-4">
                Directory ({results.listings.length})
              </h2>
              {results.listings.length ? (
                <ul className="mt-6 grid gap-4 md:grid-cols-3">
                  {results.listings.map(
                    (l: {
                      id: string;
                      business_name: string;
                      category: string | null;
                      suburb: string | null;
                    }) => (
                      <li key={l.id} className="border-t border-[var(--hairline)] pt-3">
                        <p className="serif font-semibold">{l.business_name}</p>
                        <p className="meta">
                          {l.category} · {l.suburb}
                        </p>
                      </li>
                    ),
                  )}
                </ul>
              ) : (
                <p className="meta mt-4">No listings matched.</p>
              )}
            </section>
          </div>
        ) : null}
      </main>
    </>
  );
}
