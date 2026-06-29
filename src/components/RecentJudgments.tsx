import type { CourtJudgmentRow } from "@/lib/schema";
import { formatDate } from "@/lib/date";

// Compact "Recent judgments" teaser. LINK-OUT ONLY: this block never reproduces
// judgment text. It shows the court's own metadata (case name, court, citation,
// date) and a single internal link through to /courts, where each judgment links
// out to the official record. Renders nothing when there are no judgments so it
// can sit on the homepage or a sidebar without leaving an empty heading behind.
export function RecentJudgments({
  judgments,
  limit = 4,
}: {
  judgments: CourtJudgmentRow[];
  limit?: number;
}) {
  const rows = judgments.slice(0, limit);
  if (rows.length === 0) return null;

  return (
    <section className="container-news py-10 border-t border-[var(--ink)]">
      <div className="flex items-end justify-between">
        <div>
          <p className="kicker">Courts</p>
          <h2 className="h2-news mt-1">Recent judgments</h2>
        </div>
        <a href="/courts" className="meta underline">
          All judgments
        </a>
      </div>
      <ul className="mt-4 divide-y divide-[var(--hairline)]">
        {rows.map((j) => {
          const decided = formatDate(j.decision_date);
          return (
            <li key={j.id} className="py-3">
              <a href="/courts" className="serif text-lg leading-snug no-underline hover:underline">
                {j.case_name}
              </a>
              <p className="meta mt-1">
                {j.court}
                {j.citation && <> &middot; {j.citation}</>}
                {decided && <> &middot; {decided}</>}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
