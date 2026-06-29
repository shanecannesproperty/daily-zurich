// Community fundraising page — "Support local journalism in [City]".
// Three giving tiers, a PayPal.Me-style donate button (currently a
// mailto: placeholder so we don't process payments client-side), and a
// supporter wall of seed names.
import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { buildMeta, canonicalLinks } from "@/lib/seo";
import { cityName, siteName } from "@/lib/city";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: buildMeta({
      title: `Support local news — ${siteName()}`,
      description: `Help us keep ${siteName()} free and independent. Every donation funds local coverage for ${cityName()}.`,
      path: "/support",
    }),
    links: canonicalLinks("/support"),
  }),
  component: SupportPage,
});

type Tier = { amount: string; name: string; perk: string };

function donateMailto(amount: string) {
  const subject = encodeURIComponent(`I'd like to support ${siteName()} — ${amount}`);
  const body = encodeURIComponent(
    `Hi ${siteName()} team,\n\nI'd like to support your work with a ${amount} donation. Please let me know how to send it through.\n\nThanks,\n`,
  );
  return `mailto:hello@dailycanberra.com.au?subject=${subject}&body=${body}`;
}

function SupportPage() {
  const tiers: Tier[] = [
    { amount: "$5", name: "Coffee", perk: "Funds one local news article for the network." },
    { amount: "$25", name: "Supporter", perk: "Funds a full week of city coverage." },
    { amount: "$100", name: "Champion", perk: "Your name in our masthead as a Founding Supporter." },
  ];
  const wall = ["Sarah M.", "James T.", "Priya K.", "Daniel R.", "Megan W."];

  return (
    <>
      <SiteHeader activePath="/support" />
      <main className="container-news py-12">
        <p className="kicker text-[var(--accent,#A32D2D)]">Reader-supported local news</p>
        <h1 className="h1-news mt-2">Support independent local coverage in {cityName()}</h1>
        <p className="dek mt-3 max-w-[60ch]">
          {siteName()} is reader-supported and independently owned. AI-generated
          from public sources, free of advertiser influence. Every donation keeps
          our newsletter free and our coverage accountable to {cityName()}.
        </p>

        <section className="mt-10 grid gap-6 md:grid-cols-3">
          {tiers.map((t) => (
            <article
              key={t.name}
              className="flex flex-col border border-[var(--ink)] bg-[var(--surface,#e8e4dd)] p-6"
            >
              <p className="kicker">{t.name}</p>
              <p className="h-display mt-2 text-4xl">{t.amount}</p>
              <p className="serif mt-3 flex-1 leading-snug">{t.perk}</p>
              <a
                href={donateMailto(t.amount)}
                className="btn-primary mt-5 text-center no-underline"
              >
                Donate {t.amount}
              </a>
              <p className="meta mt-2 text-center">
                Or use{" "}
                <a
                  href="https://paypal.me/dailycanberra"
                  className="underline"
                  target="_blank"
                  rel="noopener"
                >
                  PayPal
                </a>
                .
              </p>
            </article>
          ))}
        </section>

        <section className="mt-14 border-t border-[var(--ink)] pt-8">
          <h2 className="h2-news">Our supporters</h2>
          <p className="meta mt-2">
            Thank you to the readers supporting {cityName()}&apos;s independent
            local coverage.
          </p>
          <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 serif text-lg">
            {wall.map((n) => (
              <li key={n} className="text-[var(--accent,#A32D2D)]">
                ★ {n}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-14 border-t border-[var(--hairline,#d6d2c9)] pt-8 max-w-[60ch]">
          <h2 className="h2-news">Why donate?</h2>
          <p className="serif mt-3">
            Local news coverage across Australia has declined at an alarming rate as traditional
            newsrooms close. {siteName()} uses AI to rebuild city-level coverage — across local
            government, business, sport and community. Reader support keeps us free and independent
            of platforms and advertisers.
          </p>
        </section>
      </main>
    </>
  );
}
