import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/SiteHeader";
import { buildMeta, canonicalLinks } from "@/lib/seo";
import { cityName, siteName, siteEmail } from "@/lib/city";
import { submitEnquiry } from "@/lib/forms.functions";

const STATS = [
  { value: "Daily briefing", label: "Delivered every morning at 6am" },
  { value: "Local readers", label: "" }, // label filled at render to inject city
  { value: "Local focus", label: "" },
] as const;

type Package = {
  name: string;
  price: string;
  blurb: string;
  bullets: string[];
  note?: string;
  highlight?: boolean;
  badge?: string;
};

const PACKAGES: Package[] = [
  {
    name: "Community Supporter",
    price: "$150 / month",
    blurb: "A friendly way to back local journalism and put your name in front of readers every day.",
    bullets: [
      "Logo in the daily email footer",
      "Mention in the weekly roundup",
      "Listing in our local directory",
    ],
  },
  {
    name: "Featured Partner",
    price: "$350 / month",
    blurb: "Get genuinely seen. A branded slot in the daily briefing plus a dedicated feature each month.",
    bullets: [
      "Branded tile in the daily email",
      "Dedicated mention in the morning briefing",
      "Featured article about your business (monthly)",
      "Social shoutout",
    ],
  },
  {
    name: "Founding Sponsor",
    price: "$500 / month",
    blurb: "Everything in Featured Partner, with extras reserved for our earliest supporters.",
    bullets: [
      "Everything in Featured Partner",
      "Founding Sponsor badge",
      "First right of renewal",
      "Co-branded edition once per quarter",
    ],
    note: "Founding rates locked for 12 months.",
    highlight: true,
    badge: "Most popular",
  },
];

const PACKAGE_OPTIONS = [
  "Community Supporter",
  "Featured Partner",
  "Founding Sponsor",
  "Not sure yet",
] as const;

export const Route = createFileRoute("/advertise")({
  head: () => ({
    meta: buildMeta({
      title: `Advertise | ${siteName()}`,
      description: `Reach ${cityName()}'s most engaged local readers. Sponsor packages from $150 a month on ${siteName()}.`,
      path: "/advertise",
    }),
    links: canonicalLinks("/advertise"),
  }),
  component: AdvertisePage,
});

function AdvertisePage() {
  const submit = useServerFn(submitEnquiry);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(0);
  useEffect(() => {
    started.current = Date.now();
  }, []);

  const city = cityName();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") ?? "").trim().slice(0, 100),
      business: String(fd.get("business") ?? "").trim().slice(0, 150),
      email: String(fd.get("email") ?? "").trim().slice(0, 255),
      package: String(fd.get("package") ?? ""),
      message: String(fd.get("message") ?? "").trim().slice(0, 2000),
      source: "advertise",
    };
    try {
      const result = await submit({
        data: {
          type: "sponsor",
          payload,
          company: String(fd.get("company") ?? ""),
          startedAt: started.current,
        },
      });
      if (result && result.ok === false) {
        throw new Error(result.error ?? "Could not submit");
      }
      setDone(true);
    } catch (err) {
      console.error("[advertise] enquiry failed", err);
      setError("Something went wrong, please try again.");
    } finally {
      setBusy(false);
    }
  }

  const stats = [
    { value: "Daily briefing", label: "Delivered every morning at 6am" },
    { value: "Local readers", label: `Growing ${city} audience` },
    { value: "Local focus", label: `100% ${city} content` },
  ];

  return (
    <>
      <SiteHeader />
      <main className="container-read py-12">
        <p className="kicker">Partner with us</p>
        <h1 className="h1-news mt-2">
          Reach {city}&apos;s most engaged local readers
        </h1>
        <p className="dek mt-4 max-w-2xl">
          {siteName()} is {city}&apos;s daily local newsletter and news site. Every morning, local
          readers open their inbox for the news that matters to their community.
        </p>

        <section
          className="mt-10 grid gap-4 sm:grid-cols-3 border-t border-b border-[var(--ink)] py-6"
          aria-label="At a glance"
        >
          {stats.map((s) => (
            <div key={s.value}>
              <p className="serif text-2xl leading-tight">{s.value}</p>
              <p className="meta mt-1">{s.label}</p>
            </div>
          ))}
        </section>

        <section className="mt-14" aria-labelledby="sponsored-content-h">
          <h2 id="sponsored-content-h" className="kicker">Sponsored content</h2>
          <p className="dek mt-3 max-w-2xl">
            Native ad formats sit inside the editorial flow, marked clearly with a Sponsored badge
            so readers always know what they&apos;re seeing. Three formats are available.
          </p>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {[
              {
                name: "Native article",
                price: "From $POA",
                desc: "A full-length story written by your team or ours, published with a Sponsored badge and surfaced in the daily briefing.",
              },
              {
                name: "Inline newsletter unit",
                price: "From $POA",
                desc: "A short native unit inside the morning email: headline, two lines, and a link. Mirrored to the web edition.",
              },
              {
                name: "Section takeover",
                price: "From $POA",
                desc: "Brand a topic page for the month — header sponsor strip, native lead story, and a tile in every article in that section.",
              },
            ].map((f) => (
              <article key={f.name} className="border border-[var(--hairline)] bg-[var(--surface)] p-6">
                <p className="label uppercase tracking-widest text-[var(--ink-red)]">{f.name}</p>
                <p className="serif text-xl mt-2">{f.price}</p>
                <p className="meta mt-3">{f.desc}</p>
              </article>
            ))}
          </div>
          <p className="meta mt-4">Pricing is indicative. Contact us below for a tailored proposal.</p>
        </section>

        <section className="mt-14" aria-labelledby="packages-h">
          <h2 id="packages-h" className="kicker">
            Sponsor packages
          </h2>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {PACKAGES.map((p) => (
              <article
                key={p.name}
                className={
                  "relative flex flex-col p-6 bg-[var(--surface)] " +
                  (p.highlight
                    ? "border-2 border-[var(--ink-red)]"
                    : "border border-[var(--hairline)]")
                }
              >
                {p.badge && (
                  <span className="absolute -top-3 left-6 bg-[var(--ink-red)] text-white text-xs uppercase tracking-widest px-2 py-1">
                    {p.badge}
                  </span>
                )}
                <p className="label uppercase tracking-widest text-[var(--ink-red)]">{p.name}</p>
                <p className="serif mt-2 text-2xl font-semibold">{p.price}</p>
                {p.note && <p className="meta mt-1 italic">{p.note}</p>}
                <p className="meta mt-3 leading-relaxed text-[var(--ink)]">{p.blurb}</p>
                <ul className="mt-4 space-y-2 text-sm">
                  {p.bullets.map((b) => (
                    <li key={b} className="flex gap-2">
                      <span aria-hidden="true" className="text-[var(--ink-red)]">+</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 pt-4 border-t border-[var(--hairline)]">
                  <a href="#enquiry-h" className="btn-primary inline-block">
                    Enquire
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-14 border-t border-[var(--hairline)] pt-8" aria-labelledby="sponsor-briefing-h">
          <p className="kicker">Newsletter</p>
          <h2 id="sponsor-briefing-h" className="h2-news mt-1">
            Sponsor the Morning Briefing
          </h2>
          <p className="dek mt-3 max-w-[60ch]">
            One sponsor per edition. A single, clearly-marked
            mention sits near the top of the briefing — read by {cityName()} locals
            over their first coffee.
          </p>

          <div className="mt-6 grid gap-8 md:grid-cols-2">
            <div className="border border-[var(--ink)] bg-[var(--surface)] p-5 font-mono text-[13px] leading-relaxed">
              <p className="text-[var(--ink-grey)]">Subject: Your Tuesday briefing</p>
              <hr className="my-3 border-[var(--hairline)]" />
              <p className="font-semibold">Good morning, {cityName()}.</p>
              <p className="mt-2">Here&apos;s what you need to know today…</p>
              <div className="mt-4 border-l-2 border-[var(--ink-red)] bg-white/40 p-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--ink-red)]">
                  Today&apos;s sponsor
                </p>
                <p className="mt-1 font-semibold">[Your brand here]</p>
                <p className="mt-1 text-[var(--ink-grey)]">
                  One-line message + call to action linking to your site.
                </p>
              </div>
              <p className="mt-4 text-[var(--ink-grey)]">— continues with today&apos;s top stories —</p>
            </div>

            <div>
              <p className="meta">Placement</p>
              <p className="mt-1">Position 2 in the briefing, above the day&apos;s top stories.</p>
              <p className="meta mt-4">Pricing</p>
              <p className="mt-1">
                From <strong>$X/week</strong> — enquire for current rates and availability.
              </p>
              <p className="meta mt-4">Audience</p>
              <p className="mt-1">{cityName()} residents, daily 6am briefing.</p>
              <div className="mt-6">
                <a
                  href={`mailto:${siteEmail("advertise")}?subject=Morning%20Briefing%20sponsorship%20enquiry`}
                  className="btn-primary inline-block"
                >
                  Enquire about sponsoring
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-14 border-t border-[var(--hairline)] pt-8" aria-labelledby="audience-h">
          <p className="kicker">Our audience</p>
          <h2 id="audience-h" className="h2-news mt-1">
            Reach engaged {cityName()} locals
          </h2>
          <dl className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { k: "Publishes", v: "Daily, 6am AEST" },
              { k: "Coverage", v: "100% local" },
              { k: "Network reach", v: "19 AU cities" },
              { k: "Primary demographic", v: "25–54, local" },
            ].map((s) => (
              <div key={s.k} className="border-t-2 border-[var(--ink)] pt-3">
                <dt className="kicker">{s.k}</dt>
                <dd className="serif text-2xl mt-1">{s.v}</dd>
              </div>
            ))}
          </dl>
          <p className="meta mt-6 italic">
            Contact us for verified current figures.
          </p>
        </section>



        <section className="mt-14 border-t border-[var(--ink)] pt-8" aria-labelledby="enquiry-h">
          <h2 id="enquiry-h" className="kicker">
            Interested? Let&apos;s talk.
          </h2>
          {done ? (
            <p className="serif mt-6 text-lg" role="status" aria-live="polite">
              Thanks! We will be in touch within one business day.
            </p>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 grid gap-4 max-w-xl">
              <label className="block">
                <span className="label">Name</span>
                <input
                  name="name"
                  required
                  maxLength={100}
                  className="field"
                  autoComplete="name"
                />
              </label>
              <label className="block">
                <span className="label">Business name</span>
                <input
                  name="business"
                  required
                  maxLength={150}
                  className="field"
                  autoComplete="organization"
                />
              </label>
              <label className="block">
                <span className="label">Email</span>
                <input
                  type="email"
                  name="email"
                  required
                  maxLength={255}
                  className="field"
                  autoComplete="email"
                />
              </label>
              <label className="block">
                <span className="label">Which package?</span>
                <select name="package" className="field" defaultValue={PACKAGE_OPTIONS[0]}>
                  {PACKAGE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="label">Message (optional)</span>
                <textarea name="message" rows={5} maxLength={2000} className="field" />
              </label>
              <div className="honeypot" aria-hidden="true">
                <label>
                  Do not fill in
                  <input type="text" name="company" tabIndex={-1} autoComplete="off" />
                </label>
              </div>
              {error && (
                <p
                  className="text-sm font-medium text-[var(--ink-red)]"
                  role="alert"
                  aria-live="assertive"
                >
                  {error}
                </p>
              )}
              <div>
                <button type="submit" className="btn-primary" disabled={busy}>
                  {busy ? "Sending" : "Send enquiry"}
                </button>
              </div>
            </form>
          )}
          <p className="meta mt-6">
            Or email directly:{" "}
            <a href={`mailto:${siteEmail("advertise")}`}>{siteEmail("advertise")}</a>
          </p>
        </section>

        <p className="meta mt-12 border-t border-[var(--hairline)] pt-6 italic">
          Advertising enquiries are handled personally. We do not use programmatic ad networks.
        </p>
      </main>
    </>
  );
}
