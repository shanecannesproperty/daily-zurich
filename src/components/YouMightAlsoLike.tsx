// "You might also like" — a visually bolder, 2x2 grid of editorial picks
// shown at the end of every article. Uses category-similar articles already
// fetched by the loader (same data as RelatedArticles but rendered with
// larger thumbnails and clearly labelled editorial — not sponsored).
import { Link } from "@tanstack/react-router";
import type { ArticleRow } from "@/lib/schema";
import { CATEGORY_LABELS } from "@/lib/schema";
import { isRealImage } from "@/lib/media";
import { formatDate } from "@/lib/date";

export function YouMightAlsoLike({ items }: { items: ArticleRow[] }) {
  const picks = (items ?? []).slice(0, 4);
  if (picks.length === 0) return null;

  return (
    <section
      className="mt-12 border-t-2 border-[var(--ink,#2d2d2d)] pt-6 print:hidden"
      aria-labelledby="you-might-also-like-h"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="you-might-also-like-h" className="h3-card">
          You might also like
        </h2>
        <span className="kicker text-[var(--ink-grey,#6b6b6b)]">Editorial picks</span>
      </div>

      <ul className="mt-5 grid gap-x-6 gap-y-8 sm:grid-cols-2 md:gap-x-10">
        {picks.map((a) => {
          const hero = isRealImage(a.hero_image) ? a.hero_image : null;
          return (
            <li key={a.id}>
              <Link
                to="/article/$slug"
                params={{ slug: a.slug }}
                className="group block no-underline"
              >
                {hero ? (
                  <img
                    src={hero}
                    alt={a.title}
                    width={640}
                    height={427}
                    loading="lazy"
                    decoding="async"
                    className="aspect-[3/2] w-full object-cover bg-[var(--surface,#e8e4dd)]"
                  />
                ) : (
                  <div
                    aria-hidden
                    className="aspect-[3/2] w-full bg-[var(--surface,#e8e4dd)]"
                  />
                )}
                <p className="kicker mt-3">{CATEGORY_LABELS[a.category]}</p>
                <h3 className="h3-card mt-1 group-hover:underline">{a.title}</h3>
                {a.dek && (
                  <p className="meta mt-1 line-clamp-2">{a.dek}</p>
                )}
                {a.published_at && (
                  <p className="meta mt-1 text-[var(--ink-grey,#6b6b6b)]">
                    {formatDate(a.published_at)}
                  </p>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
