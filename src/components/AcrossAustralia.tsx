import { Link } from "@tanstack/react-router";
import { isCityAustralian } from "@/lib/city";
import type { ArticleRow } from "@/lib/schema";

// Cross-link rail surfacing national-desk articles (city='national') shared
// across the Daily Network. Text-only wire-service digest style — no images,
// no card borders. Renders nothing when the list is empty so a slow or absent
// upstream never leaves a dangling heading.
export function AcrossAustralia({ articles = [] }: { articles?: ArticleRow[] }) {
  if (articles.length === 0) return null;
  const items = articles.slice(0, 8);
  return (
    <section className="border-t border-[var(--ink)]">
      <div className="container-news py-10">
        <p className="kicker">National</p>
        <h2 className="h2-news mt-1">{isCityAustralian() ? "Across Australia" : "From the wire"}</h2>
        <div className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((a) => (
            <article key={a.id}>
              {a.category && <p className="kicker">{a.category}</p>}
              <h3 className="font-serif text-lg leading-snug mt-1">
                <Link
                  to="/article/$slug"
                  params={{ slug: a.slug }}
                  className="no-underline hover:underline"
                >
                  {a.title}
                </Link>
              </h3>
            </article>
          ))}
        </div>
        <a href="/federal" className="meta underline mt-6 inline-block">
          More from Australia
        </a>
      </div>
    </section>
  );
}
