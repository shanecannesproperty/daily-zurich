import type { ReactNode } from "react";
import { FileSearch } from "lucide-react";

// Branded empty state used across search, category, topic, my-feed, saved,
// jobs and similar filter pages. A consistent illustration + helpful copy +
// clear CTA keeps the page from looking broken when there are no results.
export function EmptyState({
  icon,
  title,
  message,
  primaryHref,
  primaryLabel = "Browse all articles →",
  secondaryHref = "/subscribe",
  secondaryLabel = "Subscribe to the newsletter",
}: {
  icon?: ReactNode;
  title: string;
  message?: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string | null;
  secondaryLabel?: string;
}) {
  return (
    <div className="mt-10 border-y border-[var(--hairline,#d6d2c9)] py-12 text-center">
      <div className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full border border-[var(--hairline,#d6d2c9)] bg-[var(--surface,#e8e4dd)] text-[var(--accent,#A32D2D)]">
        {icon ?? <FileSearch size={26} aria-hidden="true" />}
      </div>
      <p className="serif text-xl font-semibold">{title}</p>
      {message ? (
        <p className="dek mt-2 mx-auto max-w-[52ch]">{message}</p>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {primaryHref ? (
          <a href={primaryHref} className="btn-primary">
            {primaryLabel}
          </a>
        ) : null}
        {secondaryHref ? (
          <a href={secondaryHref} className="btn-ghost">
            {secondaryLabel}
          </a>
        ) : null}
      </div>
    </div>
  );
}
