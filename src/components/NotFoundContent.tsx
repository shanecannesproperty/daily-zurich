// Branded 404 body. Rendered by the root route's notFoundComponent. Uses
// useQuery (not useSuspenseQuery) so an unmatched URL doesn't hang on a
// data fetch — the recent-articles list lights up once the homepage query
// resolves, otherwise the page is still useful. The NewsTicker sits above
// the Outlet at the root layout level, so it already crowns this page.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { getHomepage } from "@/lib/data.functions";
import { cityName, siteName } from "@/lib/city";

export function NotFoundContent() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const { data } = useQuery({
    queryKey: ["homepage"],
    queryFn: () => getHomepage(),
    staleTime: 60_000,
  });
  const recent = (data?.articles ?? []).slice(0, 3);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    if (!trimmed) return;
    navigate({ to: "/search", search: { q: trimmed } });
  }

  return (
    <div className="container-news py-16">
      <p className="kicker text-[var(--accent,#A32D2D)]">404 — Not found</p>
      <h1 className="h1-news mt-3 max-w-[20ch]">
        This article may have moved or been removed.
      </h1>
      <p className="dek mt-4 max-w-[55ch]">
        Try a search, jump to one of our latest stories, or head back to the{" "}
        {siteName()} homepage.
      </p>

      <form
        role="search"
        onSubmit={onSearch}
        className="mt-8 flex w-full max-w-xl items-stretch gap-2"
        aria-label={`Search ${siteName()}`}
      >
        <label htmlFor="nf-search" className="sr-only">
          Search articles
        </label>
        <input
          id="nf-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${cityName()} news…`}
          className="flex-1 border border-[var(--ink,#2d2d2d)] bg-[var(--bg,#f5f3ee)] px-4 py-3 text-base"
        />
        <button
          type="submit"
          className="bg-[var(--ink,#2d2d2d)] px-5 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--bg,#f5f3ee)] hover:opacity-90"
        >
          Search
        </button>
      </form>

      <div className="mt-10 grid gap-10 md:grid-cols-[2fr_1fr]">
        <section aria-labelledby="nf-recent-h">
          <h2 id="nf-recent-h" className="h2-section">Latest stories</h2>
          {recent.length === 0 ? (
            <p className="meta mt-3">Loading recent stories…</p>
          ) : (
            <ul className="mt-4 divide-y divide-[var(--hairline,#d6d2c9)] border-y border-[var(--hairline,#d6d2c9)]">
              {recent.map((a) => (
                <li key={a.slug} className="py-4">
                  <Link
                    to="/article/$slug"
                    params={{ slug: a.slug }}
                    className="serif text-lg font-semibold leading-tight no-underline hover:underline"
                  >
                    {a.title}
                  </Link>
                  {a.dek ? (
                    <p className="meta mt-1 line-clamp-2">{a.dek}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside aria-label="Quick links" className="border-l border-[var(--hairline,#d6d2c9)] pl-6">
          <h2 className="h2-section">Quick links</h2>
          <ul className="mt-4 space-y-2 serif">
            <li><Link to="/" className="underline">Homepage</Link></li>
            <li><Link to="/events">Events</Link></li>
            <li><Link to="/subscribe">Subscribe to the daily brief</Link></li>
            <li><Link to="/contact">Contact us</Link></li>
          </ul>
          <Link
            to="/"
            className="mt-6 inline-block bg-[var(--accent,#A32D2D)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white no-underline hover:opacity-90"
          >
            Go to homepage →
          </Link>
        </aside>
      </div>
    </div>
  );
}
