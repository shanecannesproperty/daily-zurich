import type { ArticleRow } from "@/lib/schema";

export function isSponsored(a: Partial<ArticleRow> | null | undefined): boolean {
  if (!a) return false;
  const rec = a as unknown as Record<string, unknown>;
  if (rec.is_sponsored === true) return true;
  if (typeof rec.category === "string" && rec.category === "sponsored") return true;
  return false;
}

export function SponsoredBadge({ size = "sm" }: { size?: "sm" | "md" }) {
  const cls =
    size === "md"
      ? "text-[11px] tracking-[0.18em] px-2.5 py-1"
      : "text-[10px] tracking-[0.16em] px-2 py-0.5";
  return (
    <span
      className={`inline-block uppercase font-medium border border-[var(--accent,#A32D2D)] text-[var(--accent,#A32D2D)] bg-[var(--bg,#f5f3ee)] ${cls}`}
      aria-label="Sponsored content"
    >
      Sponsored
    </span>
  );
}
