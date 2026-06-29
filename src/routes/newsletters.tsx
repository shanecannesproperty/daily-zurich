import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { CategoryNav } from "@/components/CategoryNav";
import { listSentEditions } from "@/lib/data.functions";
import { buildMeta, canonicalLinks } from "@/lib/seo";
import { cityName, siteName } from "@/lib/city";
import type { DailyEditionRow } from "@/lib/schema";

const editionsQuery = queryOptions({
  queryKey: ["editions", "listing"],
  queryFn: () => listSentEditions(),
});

export const Route = createFileRoute("/newsletters")({
  loader: ({ context }) => context.queryClient.ensureQueryData(editionsQuery),
  head: () => ({
    meta: buildMeta({
      title: `Past newsletters | ${siteName()}`,
      description: `Browse past editions of ${siteName()} — the daily morning briefing for ${cityName()}.`,
      path: "/newsletters",
    }),
    links: canonicalLinks("/newsletters"),
  }),
  component: NewslettersPage,
});

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(`${iso}T00:00:00`).toLocaleDateString("en-AU", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso ?? "";
  }
}

// Placeholder editions shown when the DB is empty so the page never looks
// abandoned. Dates step backwards from today; copy is generic.
function placeholders(): Array<Pick<DailyEditionRow, "id" | "edition_date" | "subject" | "hook">> {
  const out: ReturnType<typeof placeholders> = [];
  const today = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const monthLabel = d.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
    out.push({
      id: `placeholder-${iso}`,
      edition_date: iso,
      subject: `Morning Briefing — ${cityName()} — ${monthLabel}`,
      hook: `The day's ${cityName()} news in a 2-minute read.`,
    });
  }
  return out;
}

function NewslettersPage() {
  const editions = useSuspenseQuery(editionsQuery).data;
  const showPlaceholders = !editions || editions.length === 0;
  const rows = showPlaceholders ? placeholders() : editions;

  return (
    <>
      <SiteHeader />
      <CategoryNav />
      <main className="container-news py-12">
        <p className="kicker">Newsletter</p>
        <h1 className="h1-news mt-1">Past newsletters</h1>
        <p className="dek mt-3 max-w-[60ch]">
          Every edition of {siteName()} we&apos;ve sent, newest first. The
          morning briefing lands in inboxes weekday mornings — free.
        </p>

        <div className="mt-6 flex items-center gap-4">
          <Link to="/subscribe" className="btn-primary">
            Subscribe free
          </Link>
          {showPlaceholders && (
            <p className="meta italic text-[var(--ink-grey,#6b6b6b)]">
              Sample editions — the archive fills out once we&apos;ve sent a few.
            </p>
          )}
        </div>

        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((ed) => {
            const isReal = !showPlaceholders;
            return (
              <li
                key={ed.id}
                className="border border-[var(--ink,#2d2d2d)] bg-[var(--surface,#e8e4dd)] p-5"
              >
                <p className="kicker">{formatDate(ed.edition_date)}</p>
                <h2 className="h3-card mt-2">
                  {ed.subject ?? `Morning Briefing — ${cityName()}`}
                </h2>
                {ed.hook && (
                  <p className="meta mt-2 line-clamp-3">{ed.hook}</p>
                )}
                <p className="mt-4">
                  {isReal ? (
                    <Link
                      to="/newsletter/$id"
                      params={{ id: ed.id }}
                      className="meta underline"
                    >
                      Read this edition →
                    </Link>
                  ) : (
                    <Link to="/subscribe" className="meta underline">
                      Subscribe to get the next one →
                    </Link>
                  )}
                </p>
              </li>
            );
          })}
        </ul>
      </main>
    </>
  );
}
