import { Bookmark } from "lucide-react";
import { useSavedArticles } from "@/lib/saved-articles";

export function SaveBookmark({
  slug,
  size = 18,
  label = true,
}: {
  slug: string;
  size?: number;
  label?: boolean;
}) {
  const { isSaved, toggle, ready } = useSavedArticles();
  if (!ready) return null;
  const saved = isSaved(slug);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(slug);
      }}
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved" : "Save for later"}
      title={saved ? "Saved — click to remove" : "Save for later"}
      className="inline-flex items-center gap-1 text-[var(--ink-muted,#6b6b6b)] hover:text-[var(--accent,#A32D2D)] print:hidden"
    >
      <Bookmark
        size={size}
        fill={saved ? "currentColor" : "none"}
        color={saved ? "var(--accent, #A32D2D)" : "currentColor"}
        aria-hidden
      />
      {label && (
        <span className="text-xs uppercase tracking-[0.14em]">
          {saved ? "Saved" : "Save"}
        </span>
      )}
    </button>
  );
}
