import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { buildMeta, canonicalLinks } from "@/lib/seo";
import { cityName, siteName, siteEmail } from "@/lib/city";

interface FAQ { q: string; a: string }

function faqs(): FAQ[] {
  const city = cityName();
  const site = siteName();
  return [
    {
      q: `What is ${site}?`,
      a: `${site} is an independent, locally-focused daily news publication covering ${city}. We publish original reporting, curated headlines, events, what's-on guides, and a weekday morning newsletter.`,
    },
    {
      q: "How often do you publish?",
      a: `New stories go up throughout the day, every day. Our flagship morning briefing newsletter lands before 7am, Monday to Friday.`,
    },
    {
      q: "How do I subscribe to the newsletter?",
      a: `Head to our subscribe page and enter your email — it's free, no paywall, unsubscribe anytime. You'll get the morning briefing for ${city} in your inbox each weekday.`,
    },
    {
      q: "How do I advertise?",
      a: `We offer newsletter sponsorships, sponsored articles, and display placements. See our Media Kit for audience numbers and pricing, or email ${siteEmail("advertise")}.`,
    },
    {
      q: "Is it free?",
      a: `Yes. All articles, the website, and the morning newsletter are free. We're supported by reader contributions and a small number of clearly-labelled sponsors.`,
    },
    {
      q: "What is your editorial policy?",
      a: `We report independently, separate editorial from advertising, label sponsored content clearly, and correct mistakes promptly. Full details are on our Editorial Standards page.`,
    },
    {
      q: "How do I submit a story tip?",
      a: `Visit our Tips page or email ${siteEmail("tips")}. We treat all tips confidentially and never publish a source's identity without explicit consent.`,
    },
    {
      q: "How do I suggest a correction?",
      a: `Every article has a "Suggest a correction" link at the bottom that opens a prefilled email. We review every correction request and update articles with a transparent note.`,
    },
  ];
}

export const Route = createFileRoute("/faq")({
  head: () => {
    const items = faqs();
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: items.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    };
    return {
      meta: buildMeta({
        title: `FAQ — ${siteName()}`,
        description: `Frequently asked questions about ${siteName()}: how we publish, advertise, subscribe, and report on ${cityName()}.`,
        path: "/faq",
      }),
      links: canonicalLinks("/faq"),
      scripts: [
        {
          type: "application/ld+json",
          // TSR head() serialises scripts.children via JSON.stringify when an object.
          children: JSON.stringify(jsonLd),
        },
      ],
    };
  },
  component: FAQPage,
});

function FAQPage() {
  const items = faqs();
  return (
    <>
      <SiteHeader />
      <main className="container-read py-12">
        <p className="kicker">Reader help</p>
        <h1 className="h1-news mt-1">Frequently asked questions</h1>
        <p className="dek mt-3 max-w-[60ch]">
          The short answers. Can&apos;t find what you&apos;re looking for?{" "}
          <a href={`mailto:${siteEmail("hello")}`} className="underline">
            Email us
          </a>
          .
        </p>

        <dl className="mt-10 divide-y divide-[var(--hairline,rgba(0,0,0,0.12))] border-t border-[var(--hairline,rgba(0,0,0,0.12))]">
          {items.map((f) => (
            <div key={f.q} className="py-6">
              <dt>
                <h2 className="serif text-xl font-semibold leading-snug">{f.q}</h2>
              </dt>
              <dd className="serif mt-2 text-base leading-relaxed text-[var(--ink,#2d2d2d)]">
                {f.a}
              </dd>
            </div>
          ))}
        </dl>
      </main>
    </>
  );
}
