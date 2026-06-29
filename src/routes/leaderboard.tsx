import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { getReferralLeaderboard } from "@/lib/forms.functions";
import { buildMeta, canonicalLinks } from "@/lib/seo";
import { siteName, cityName } from "@/lib/city";

const leaderboardQuery = queryOptions({
  queryKey: ["referral-leaderboard"],
  queryFn: () => getReferralLeaderboard(),
  staleTime: 5 * 60 * 1000,
});

export const Route = createFileRoute("/leaderboard")({
  loader: ({ context }) => context.queryClient.ensureQueryData(leaderboardQuery),
  head: () => ({
    meta: buildMeta({
      title: `Referral leaderboard — ${siteName()}`,
      description: `Top ${siteName()} readers by referrals. Share your link, climb the board.`,
      path: "/leaderboard",
    }),
    links: canonicalLinks("/leaderboard"),
  }),
  errorComponent: ({ error }) => (
    <main className="container-read py-16">
      <h1 className="h1-news">Leaderboard unavailable</h1>
      <p className="meta mt-4">{error.message}</p>
    </main>
  ),
  notFoundComponent: () => (
    <main className="container-read py-16">
      <h1 className="h1-news">Not found</h1>
    </main>
  ),
  component: LeaderboardPage,
});

function mask(code: string): string {
  if (code.length <= 4) return code.toUpperCase();
  return (code.slice(0, 4) + "…" + code.slice(-2)).toUpperCase();
}

function LeaderboardPage() {
  const { entries } = useSuspenseQuery(leaderboardQuery).data;

  return (
    <>
      <SiteHeader activePath="/leaderboard" />
      <main>
        <section className="container-read pt-12 pb-6">
          <p className="kicker">Community</p>
          <h1 className="h1-news mt-2">Referral leaderboard</h1>
          <p className="dek mt-4">
            The readers spreading {siteName()} the furthest. Share your referral link
            from the subscribe page and climb the board.
          </p>
        </section>

        <section className="container-read border-t border-[var(--ink)] pt-8 pb-16">
          {entries.length === 0 ? (
            <div className="border border-[var(--hairline)] bg-[var(--surface)] p-8 text-center">
              <p className="serif text-lg">
                Be the first on the leaderboard — share your referral link.
              </p>
              <a
                href="/subscribe"
                className="btn-primary mt-5 inline-flex"
              >
                Get your link
              </a>
            </div>
          ) : (
            <ol className="divide-y divide-[var(--hairline)]">
              {entries.map((e, i) => (
                <li
                  key={e.referral_code}
                  className="flex items-center justify-between gap-4 py-4"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span
                      className="serif text-3xl leading-none w-10 text-right"
                      style={{ color: i < 3 ? "var(--ink-red)" : "var(--ink-grey)" }}
                      aria-hidden
                    >
                      {i + 1}
                    </span>
                    <span className="font-mono text-sm sm:text-base text-[var(--ink)] truncate">
                      Reader&nbsp;{mask(e.referral_code)}
                    </span>
                  </div>
                  <span className="serif text-lg sm:text-xl tabular-nums">
                    {e.referral_count}
                    <span className="meta ml-2">
                      {e.referral_count === 1 ? "referral" : "referrals"}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          )}

          <p className="meta mt-8">
            Want to join the board? Subscribe to the {cityName()} briefing and forward
            your unique referral link to friends.
          </p>
        </section>
      </main>
    </>
  );
}
