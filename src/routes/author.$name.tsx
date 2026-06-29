import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { listArticlesByAuthor } from "@/lib/articles.functions";
import { buildMeta, canonicalLinks } from "@/lib/seo";
import { siteName, cityName } from "@/lib/city";
import { CATEGORY_LABELS } from "@/lib/schema";
import { formatDateTime } from "@/lib/date";

function decodeName(slug: string): string {
  try {
    return decodeURIComponent(slug).replace(/\s+/g, " ").trim();
  } catch {
    return slug;
  }
}

function authorQuery(name: string) {
  return queryOptions({
    queryKey: ["author-articles", name],
    queryFn: () => listArticlesByAuthor({ data: { author: name } }),
    staleTime: 5 * 60_000,
  });
}

export const Route = createFileRoute("/author/$name")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(authorQuery(decodeName(params.name))),
  head: ({ params }) => {
    const author = decodeName(params.name);
    const path = `/author/${params.name}`;
    return {
      meta: buildMeta({
        title: `${author} — ${siteName()}`,
        description: `Articles by ${author} for ${siteName()}, ${cityName()}'s daily local newsletter and news site.`,
        path,
      }),
      links: canonicalLinks(path),
    };
  },
  errorComponent: ({ error }) => (
    <main className="container-read py-16">
      <h1 className="h1-news">Author unavailable</h1>
      <p className="meta mt-4">{error.message}</p>
    </main>
  ),
  notFoundComponent: () => (
    <main className="container-read py-16">
      <h1 className="h1-news">Author not found</h1>
    </main>
  ),
  component: AuthorPage,
});

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function AuthorPage() {
  const params = Route.useParams();
  const author = decodeName(params.name);
  const { data } = useSuspenseQuery(authorQuery(author));
  const articles = data.articles;

  return (
    <>
      <SiteHeader />
      <main>
        <section className="container-read pt-12 pb-8">
          <p className="kicker">Reporter</p>
          <div className="mt-3 flex items-center gap-5">
            <div
              aria-hidden
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] border border-[var(--hairline)] text-2xl font-semibold text-[var(--ink)]"
            >
              {initials(author) || "·"}
            </div>
            <div className="min-w-0">
              <h1 className="h1-news">{author}</h1>
              <p className="meta mt-2">
                {author} writes for {siteName()} on {cityName()} news, community and daily life.
              </p>
            </div>
          </div>
          <ul className="mt-5 flex items-center gap-4 text-sm">
            <li>
              <a
                href={`https://twitter.com/search?q=${encodeURIComponent(author + " " + siteName())}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline-offset-2 hover:underline"
              >
                Twitter / X
              </a>
            </li>
            <li>
              <a
                href={`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(author)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline-offset-2 hover:underline"
              >
                LinkedIn
              </a>
            </li>
          </ul>
        </section>

        <section className="container-read border-t border-[var(--ink)] pt-8 pb-16">
          <h2 className="kicker mb-4">Articles by {author}</h2>
          {articles.length === 0 ? (
            <p className="meta">No articles published yet under this byline.</p>
          ) : (
            <ul className="divide-y divide-[var(--hairline)]">
              {articles.map((a) => {
                const label =
                  a.category && a.category in CATEGORY_LABELS
                    ? CATEGORY_LABELS[a.category as keyof typeof CATEGORY_LABELS]
                    : a.category;
                return (
                  <li key={a.id} className="py-5">
                    {label && (
                      <p
                        className="text-[10px] uppercase tracking-[0.16em] font-semibold"
                        style={{ color: "var(--ink-red)" }}
                      >
                        {label}
                      </p>
                    )}
                    <h3 className="serif text-xl sm:text-2xl mt-1 leading-snug">
                      <Link
                        to="/article/$slug"
                        params={{ slug: a.slug }}
                        className="no-underline hover:underline text-[var(--ink)]"
                      >
                        {a.title}
                      </Link>
                    </h3>
                    {a.dek && <p className="meta mt-2 line-clamp-2">{a.dek}</p>}
                    {a.published_at && (
                      <p className="meta mt-2 text-xs">{formatDateTime(a.published_at)}</p>
                    )}
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
