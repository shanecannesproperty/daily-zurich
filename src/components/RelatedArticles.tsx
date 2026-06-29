import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { cityName } from "@/lib/city";
import { isRealImage } from "@/lib/media";
import { getRelatedArticles, type RelatedArticle } from "@/lib/articles.functions";

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diffMs = Date.now() - then;
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function RelatedArticles({ currentSlug }: { currentSlug: string }) {
  const fetchRelated = useServerFn(getRelatedArticles);
  const { data } = useQuery({
    queryKey: ["related-articles", currentSlug],
    queryFn: () => fetchRelated({ data: { currentSlug, limit: 3 } }),
    staleTime: 5 * 60 * 1000,
  });

  const articles: RelatedArticle[] = data?.articles ?? [];
  if (articles.length === 0) return null;

  return (
    <section className="mt-12 border-t border-[var(--ink)] pt-6">
      <h2 className="h-display text-2xl">More from {cityName()}</h2>
      <div className="mt-6 grid gap-8 sm:grid-cols-3">
        {articles.map((a) => (
          <a
            key={a.id}
            href={`/article/${a.slug}`}
            className="group block no-underline text-[var(--ink)] transition-opacity hover:opacity-80"
          >
            {isRealImage(a.hero_image) ? (
              <img
                src={a.hero_image!}
                alt=""
                loading="lazy"
                decoding="async"
                className="aspect-[16/9] w-full object-cover"
              />
            ) : (
              <div className="aspect-[16/9] w-full bg-[var(--surface)]" />
            )}
            {a.category && (
              <p
                className="mt-3 text-[11px] uppercase tracking-[0.14em] font-semibold"
                style={{ color: "var(--ink-red)" }}
              >
                {a.category}
              </p>
            )}
            <h3 className="serif text-lg mt-1 leading-snug line-clamp-3 group-hover:underline">
              {a.title}
            </h3>
            {a.published_at && (
              <p className="meta mt-2 text-xs text-[var(--ink-grey)]">
                {timeAgo(a.published_at)}
              </p>
            )}
          </a>
        ))}
      </div>
    </section>
  );
}
