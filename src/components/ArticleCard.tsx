import { Link } from "@tanstack/react-router";
import type { ArticleRow } from "@/lib/schema";
import { CATEGORY_LABELS } from "@/lib/schema";
import { formatDate, isMeaningfullyUpdated, timeAgo } from "@/lib/date";
import { isRealImage } from "@/lib/media";
import { HeroImage } from "@/components/HeroImage";
import { SponsoredBadge, isSponsored } from "@/components/SponsoredBadge";
import { SaveBookmark } from "@/components/SaveBookmark";
import { FreshBadge } from "@/components/FreshBadge";

function getReadingMins(bodyHtml: string | null | undefined): number {
  if (!bodyHtml) return 0;
  const words = bodyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().split(" ").filter(Boolean).length;
  return words > 0 ? Math.max(1, Math.round(words / 200)) : 0;
}


export function ArticleCard({
  a,
  level = "standard",
}: {
  a: ArticleRow;
  level?: "lead" | "standard" | "compact";
}) {
  const href = `/article/${a.slug}`;
  const hero = isRealImage(a.hero_image) ? a.hero_image : null;
  const readMins = getReadingMins(a.body_html);

  if (level === "lead") {
    // Newspaper-style lead: full-width photo, headline and dek below.
    return (
      <article>
        {hero && (
          <Link to={href} className="md:col-span-7 block no-underline" aria-label={a.title}>
            <HeroImage
              src={hero}
              alt={a.title}
              aspect="aspect-[3/2]"
              loading="eager"
              fetchPriority="high"
              width={1200}
              height={800}
              sizes="(min-width: 768px) 58vw, 100vw"
            />
          </Link>
        )}
        <div className={hero ? "mt-5" : ""}>

          {isSponsored(a) && <div className="mb-2"><SponsoredBadge size="md" /></div>}
          <p className="kicker">
            <Link
              to="/category/$slug"
              params={{ slug: a.category }}
              className="no-underline hover:underline"
            >
              {CATEGORY_LABELS[a.category]}
            </Link>
          </p>
          <h2 className="text-h1 mt-2 max-w-[22ch]">
            <Link to={href} className="no-underline hover:underline">
              {a.title}
            </Link>
          </h2>
          {a.dek && <p className="dek mt-3 max-w-[60ch]">{a.dek}</p>}
          <p className="meta mt-3">
            {a.author ? `By ${a.author}` : "AI-generated"}
            {a.published_at && <> &middot; {formatDate(a.published_at)}</>}
            {readMins > 0 && <> &middot; {readMins} min read</>}
            {readMins > 0 && <> &middot; {readMins} min read</>}
          </p>
        </div>
      </article>
    );
  }

  if (level === "compact") {
    // Compact list item: small square thumbnail on the left, headline on right.
    return (
      <article className="flex gap-3 py-1">
        {hero && (
          <Link to={href} className="block w-20 shrink-0 no-underline sm:w-24" aria-label={a.title}>
            <HeroImage
              src={hero}
              alt={a.title}
              aspect="aspect-square"
              loading="lazy"
              width={160}
              height={160}
            />
          </Link>
        )}
        <div className="min-w-0">
          {isSponsored(a) && <div className="mb-1"><SponsoredBadge /></div>}
          <p className="kicker">
            <Link
              to="/category/$slug"
              params={{ slug: a.category }}
              className="no-underline hover:underline"
            >
              {CATEGORY_LABELS[a.category]}
            </Link>
          </p>
          <h3 className="text-h3 mt-1">
            <Link to={href} className="no-underline hover:underline">
              {a.title}
            </Link>
          </h3>
        </div>
      </article>
    );
  }

  return (
    <article className="flex flex-col gap-2 p-4 group hover:shadow-lg transition-shadow">
      {hero && (
        <Link to={href} className="block no-underline" aria-label={a.title}>
          <HeroImage
            src={hero}
            alt={a.title}
            aspect="aspect-[16/9]"
            loading="lazy"
            width={800}
            height={450}
            sizes="(min-width: 768px) 50vw, 100vw"
          />
        </Link>
      )}

      {isSponsored(a) && <div><SponsoredBadge /></div>}
      <h2 className="line-clamp-2 text-lg font-bold font-serif">
        <Link to={href} className="no-underline hover:underline">
          {a.title}
        </Link>
      </h2>
      {a.dek && <p className="line-clamp-1 text-sm text-gray-600">{a.dek}</p>}
      <div className="flex items-center gap-3 text-[12px] text-gray-500">
        <span className="uppercase text-[12px] bg-neutral-100 text-neutral-700 py-1 px-2 w-fit">
          {CATEGORY_LABELS[a.category]}
        </span>
        <span>{formatDate(a.published_at)}</span>
      </div>
    </article>
  );
}
