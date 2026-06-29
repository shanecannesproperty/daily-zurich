// Inline "Editor's pick" card injected into article bodies after the third
// paragraph. Backed by getEditorsPick which prefers the most-viewed article
// in the same category over the past 7 days and falls back to the latest
// in-category article. Hidden silently if nothing comes back.
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { getEditorsPick } from "@/lib/data.functions";
import { ARTICLE_CATEGORIES, CATEGORY_LABELS } from "@/lib/schema";
import { isRealImage } from "@/lib/media";

export function EditorsPickCard({
  category,
  excludeSlug,
}: {
  category: string;
  excludeSlug: string;
}) {
  const fetchPick = useServerFn(getEditorsPick);
  const isValidCategory = (ARTICLE_CATEGORIES as readonly string[]).includes(category);
  const { data } = useQuery({
    queryKey: ["editors-pick", category, excludeSlug],
    queryFn: () => fetchPick({ data: { category, excludeSlug } }),
    staleTime: 5 * 60 * 1000,
    enabled: isValidCategory,
  });
  const pick = data?.pick;
  if (!pick) return null;

  return (
    <aside
      aria-label="Editor's pick"
      className="my-8 not-prose flex gap-4 border border-[var(--hairline,#d6d2c9)] bg-[var(--surface,#e8e4dd)]/60 p-4"
    >
      {isRealImage(pick.hero_image) ? (
        <Link
          to="/article/$slug"
          params={{ slug: pick.slug }}
          aria-hidden
          tabIndex={-1}
          className="shrink-0"
        >
          <img
            src={pick.hero_image as string}
            alt=""
            width={120}
            height={80}
            loading="lazy"
            decoding="async"
            className="h-20 w-30 object-cover"
            style={{ width: 120, height: 80 }}
          />
        </Link>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="kicker text-[var(--accent,#A32D2D)]">
          Editor&apos;s pick · {CATEGORY_LABELS[pick.category as keyof typeof CATEGORY_LABELS] ?? pick.category}
        </p>
        <p className="serif mt-1 text-base font-semibold leading-snug">
          Also reading:{" "}
          <Link
            to="/article/$slug"
            params={{ slug: pick.slug }}
            className="no-underline hover:underline"
          >
            {pick.title}
          </Link>
        </p>
      </div>
    </aside>
  );
}
