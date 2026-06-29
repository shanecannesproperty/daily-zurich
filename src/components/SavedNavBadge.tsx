// Small badge in the site header showing how many articles the user has
// saved on this device. Hidden when the count is zero so it doesn't add
// noise for first-time visitors.
import { Bookmark } from "lucide-react";
import { useSavedArticles } from "@/lib/saved-articles";

export function SavedNavBadge() {
  const { count, ready } = useSavedArticles();
  if (!ready) return null;
  return (
    <a
      href="/saved"
      className="relative inline-flex items-center gap-1 text-[var(--ink,#2d2d2d)] hover:text-[var(--accent,#A32D2D)] no-underline"
      aria-label={`Saved articles (${count})`}
      title="Saved articles"
    >
      <Bookmark size={16} aria-hidden />
      <span className="hidden sm:inline text-xs uppercase tracking-[0.14em]">Saved</span>
      {count > 0 && (
        <span
          aria-hidden
          className="ml-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--accent,#A32D2D)] px-1 text-[10px] font-semibold text-white"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </a>
  );
}
