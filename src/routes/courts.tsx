import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listCourtJudgments } from "@/lib/data.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { buildMeta, canonicalLinks } from "@/lib/seo";
import { siteName, cityName, citySlug } from "@/lib/city";
import { officialCourtLinksForCity } from "@/lib/court-state";
import type { CourtJudgmentRow } from "@/lib/schema";
import { formatDate } from "@/lib/date";

const courtsQuery = queryOptions({
  queryKey: ["court-judgments"],
  queryFn: () => listCourtJudgments(),
});

export const Route = createFileRoute("/courts")({
  loader: ({ context }) => context.queryClient.ensureQueryData(courtsQuery),
  head: () => ({
    meta: buildMeta({
      title: `Courts and judgments | ${siteName()}`,
      description: `Links to recent published judgments from the courts that serve ${cityName()}, including the Federal Court and the High Court of Australia. We link to the official record only.`,
      path: "/courts",
    }),
    links: canonicalLinks("/courts"),
  }),
  component: CourtsPage,
});

// Derive a readable host (e.g. "austlii.edu.au") for the outbound link label.
// Falls back to the stored source name, then to a neutral label.
function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function sourceLabel(j: CourtJudgmentRow): string {
  if (j.source && j.source.trim()) return j.source.trim();
  const host = hostOf(j.url);
  if (host) return host;
  return "the official record";
}

function JudgmentCard({ judgment }: { judgment: CourtJudgmentRow }) {
  const decided = formatDate(judgment.decision_date);
  return (
    <article className="py-7 first:pt-0">
      <p className="kicker">{judgment.court}</p>
      <h3 className="serif mt-1 text-xl leading-snug">{judgment.case_name}</h3>
      <p className="meta mt-2">
        {judgment.citation && <>{judgment.citation}</>}
        {judgment.citation && decided && <> &middot; </>}
        {decided && <>Decided {decided}</>}
      </p>

      {/* catchwords are the court's own published summary text, from the source.
          We render them as given; they are not our words. */}
      {judgment.catchwords && judgment.catchwords.trim() && (
        <p className="dek mt-3 max-w-2xl whitespace-pre-line">{judgment.catchwords}</p>
      )}

      <p className="mt-3">
        <a
          href={judgment.url}
          target="_blank"
          rel="noopener nofollow external"
          className="font-semibold text-[var(--ink-red)] hover:underline"
        >
          Read the judgment on {sourceLabel(judgment)}
        </a>
      </p>
    </article>
  );
}

// Group judgments by court, preserving the newest-first order they arrive in
// (the list is already ordered by decision_date desc). The first court a
// judgment appears under sets that court's position in the page.
function groupByCourt(judgments: CourtJudgmentRow[]): Array<{
  court: string;
  rows: CourtJudgmentRow[];
}> {
  const order: string[] = [];
  const byCourt = new Map<string, CourtJudgmentRow[]>();
  for (const j of judgments) {
    const key = j.court || "Other courts";
    if (!byCourt.has(key)) {
      byCourt.set(key, []);
      order.push(key);
    }
    byCourt.get(key)!.push(j);
  }
  return order.map((court) => ({ court, rows: byCourt.get(court)! }));
}

function EmptyState() {
  return (
    <div className="mt-10 border-t border-[var(--hairline)] pt-8">
      <p className="serif text-lg">No recent judgments.</p>
      <p className="dek mt-3 max-w-2xl">
        Links to recent published judgments will appear here as the courts publish them.
      </p>
    </div>
  );
}

function CourtsPage() {
  const { data: judgments } = useSuspenseQuery(courtsQuery);
  const groups = groupByCourt(judgments);

  return (
    <>
      <SiteHeader activePath="/courts" />
      <main>
        <section className="container-read pt-8 pb-10">
          <p className="kicker">Courts</p>
          <h1 className="h1-news mt-1">Courts and judgments</h1>
          <p className="dek mt-3 max-w-2xl">
            Recent published judgments from the courts that serve {cityName()}, alongside the
            Federal Court and the High Court of Australia.
          </p>

          {/* Plain disclaimer: link-out only, never reproducing judgment text. */}
          <p className="meta mt-4 max-w-2xl border-l-2 border-[var(--hairline)] pl-3">
            These are links to judgments published by the courts. We link to the official record and
            do not reproduce judgment text.
          </p>

          {groups.length > 0 ? (
            <div className="mt-8 space-y-10">
              {groups.map((group) => (
                <section key={group.court}>
                  <h2 className="h2-news border-b border-[var(--ink)] pb-2">{group.court}</h2>
                  <div className="mt-4 divide-y divide-[var(--hairline)]">
                    {group.rows.map((judgment) => (
                      <JudgmentCard key={judgment.id} judgment={judgment} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <EmptyState />
          )}

          {/* Official court records: a link per court for this city's state plus
              the national courts. Always shown, so every city points readers at
              the full official source even where we do not list individual
              judgments (some courts publish no server-fetchable feed). */}
          <section className="mt-12 border-t border-[var(--hairline)] pt-8">
            <h2 className="h2-news pb-2">Official court records</h2>
            <p className="dek mt-2 max-w-2xl">
              Browse the full official record of recent decisions from the courts that serve{" "}
              {cityName()}.
            </p>
            <ul className="mt-4 space-y-2">
              {officialCourtLinksForCity(citySlug()).map((link) => (
                <li key={link.url}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener nofollow external"
                    className="font-semibold text-[var(--ink-red)] hover:underline"
                  >
                    {link.court}
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <p className="meta mt-12 max-w-2xl border-t border-[var(--hairline)] pt-6">
            Judgment summaries (catchwords) shown here are the courts' own published text from the
            source record. {siteName()} is not a law report and does not provide legal advice.
          </p>
        </section>
      </main>
    </>
  );
}
