import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/SiteHeader";
import { PushNotifyOptIn } from "@/components/PushNotifyOptIn";
import { NewsletterForm } from "@/components/NewsletterForm";
import { SneakPeekEdition } from "@/components/SneakPeekEdition";
import { buildMeta, canonicalLinks } from "@/lib/seo";
import { cityName, siteName, siteDomain } from "@/lib/city";
import { getSubscriberCount } from "@/lib/forms.functions";

export const Route = createFileRoute("/subscribe")({
  head: () => ({
    meta: buildMeta({
      title: `Subscribe free to ${siteName()}`,
      description: `Start your day smarter. The ${siteName()} morning briefing: local news, weather, events and what matters in ${cityName()}, free in your inbox by 7am.`,
      path: "/subscribe",
    }),
    links: canonicalLinks("/subscribe"),
  }),
  component: SubscribePage,
});

function Check() {
  return (
    <span aria-hidden className="text-[var(--ink-red)] font-semibold shrink-0">✓</span>
  );
}

function SubscribePage() {
  const fetchCount = useServerFn(getSubscriberCount);
  const { data } = useQuery({
    queryKey: ["subscriber-count"],
    queryFn: () => fetchCount(),
    staleTime: 5 * 60 * 1000,
  });
  const count = data?.count ?? 0;

  const subject = encodeURIComponent(`You should read ${siteName()}`);
  const body = encodeURIComponent(
    `I've been reading ${siteName()}, worth subscribing: ${siteDomain()}/subscribe`,
  );
  const forwardMailto = `mailto:?subject=${subject}&body=${body}`;

  return (
    <>
      <SiteHeader activePath="/subscribe" />
      <main>
        {/* Hero */}
        <section className="container-read pt-14 sm:pt-20 pb-10">
          <p className="kicker text-[var(--ink-red)]">Free morning newsletter</p>
          <h1 className="h-display mt-3 text-4xl sm:text-5xl md:text-6xl leading-[1.05]">
            Wake up knowing what&apos;s happening in {cityName()}.
          </h1>
          <p className="dek mt-5 text-lg sm:text-xl max-w-2xl">
            {siteName()} is the free morning newsletter for {cityName()}: the
            day&apos;s top news, weather and what&apos;s on, in a 2-minute read,
            in your inbox by 7am. No spam. Unsubscribe anytime.
          </p>

          <div
            aria-hidden
            className="mt-8 flex max-w-md items-center gap-4 border border-[var(--ink)] bg-[var(--surface)] p-5"
          >
            <div className="flex h-28 w-20 shrink-0 flex-col justify-between border border-[var(--ink)] bg-background p-2">
              <p className="text-[8px] uppercase tracking-[0.18em] text-[var(--ink-red)]">
                The {cityName()}
              </p>
              <p className="serif text-sm font-semibold leading-tight">
                {cityName()} Suburb Guide
              </p>
              <p className="text-[8px] uppercase tracking-[0.18em] text-[var(--ink-grey)]">
                For subscribers
              </p>
            </div>
            <div className="min-w-0">
              <p className="kicker">Bonus</p>
              <p className="serif mt-1 text-base font-semibold leading-snug">
                The {cityName()} Suburb Guide
              </p>
              <p className="meta mt-1">
                Where to live, eat and play, by suburb. Sent to free
                subscribers when it&apos;s ready.
              </p>
            </div>
          </div>

          <div className="mt-10">
            <SneakPeekEdition />
          </div>

          <div className="mt-8 border-t border-[var(--ink)] pt-8">
            <NewsletterForm source="subscribe-page" variant="band" />
            {count > 0 && (
              <p className="meta mt-3">
                Join {count.toLocaleString()} {cityName()} readers already on
                the list.
              </p>
            )}
          </div>
        </section>


        {/* What you get */}
        <section className="container-read py-12 border-t border-[var(--hairline)]">
          <h2 className="h-display text-2xl sm:text-3xl">What you get every morning</h2>
          <ul className="mt-6 space-y-4 max-w-2xl">
            <li className="flex gap-3 serif text-lg">
              <Check />
              <span>Top local news stories curated for {cityName()}.</span>
            </li>
            <li className="flex gap-3 serif text-lg">
              <Check />
              <span>Today&apos;s weather and what to wear.</span>
            </li>
            <li className="flex gap-3 serif text-lg">
              <Check />
              <span>Events worth your time this week.</span>
            </li>
            <li className="flex gap-3 serif text-lg">
              <Check />
              <span>Sport and what the local teams are up to.</span>
            </li>
            <li className="flex gap-3 serif text-lg">
              <Check />
              <span>Business news that affects your pocket.</span>
            </li>
          </ul>
          <p className="meta mt-6">
            Sent by 7am. Read in 2 minutes. Unsubscribe anytime.
          </p>
        </section>

        {/* Sample edition teaser */}
        <section className="container-read py-10 border-t border-[var(--hairline)]">
          <p className="kicker">Have a look first</p>
          <h2 className="h-display mt-2 text-2xl sm:text-3xl">
            Here&apos;s what yesterday&apos;s edition looked like
          </h2>
          <p className="dek mt-3 max-w-2xl">
            Browse the archive: every past edition of the {siteName()} briefing
            in one place.
          </p>
          <p className="mt-4">
            <Link to="/newsletter/archive" className="text-[var(--ink-red)] serif text-lg">
              Read past editions →
            </Link>
          </p>
        </section>

        {/* Footer CTA repeat */}
        <section className="container-read py-14 border-t border-[var(--ink)]">
          <h2 className="h-display text-3xl sm:text-4xl">
            Ready? It takes ten seconds.
          </h2>
          <p className="dek mt-3 max-w-2xl">
            Free forever. Local. In your inbox by 7am tomorrow.
          </p>
          <div className="mt-6">
            <NewsletterForm source="subscribe-page-footer" variant="band" />
          </div>
          <p className="meta mt-8">
            Already getting it?{" "}
            <a href={forwardMailto} className="text-[var(--ink-red)]">
              Forward this to a {cityName()} friend.
            </a>
          </p>
          <div className="mt-10">
            <PushNotifyOptIn />
          </div>
        </section>
      </main>
    </>
  );
}
