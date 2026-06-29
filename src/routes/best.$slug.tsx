import { createFileRoute, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getGuideBySlug } from "@/lib/data.functions";
import { subscribeNewsletter } from "@/lib/forms.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { JsonLd } from "@/components/JsonLd";
import { SponsorCta } from "@/components/SponsorCta";
import { NewsletterForm } from "@/components/NewsletterForm";
import { buildMeta, canonicalLinks, absUrl } from "@/lib/seo";
import { cityName, siteName } from "@/lib/city";


function guideQ(slug: string) {
  return queryOptions({
    queryKey: ["guide", slug],
    queryFn: () => getGuideBySlug({ data: { slug } }),
  });
}

export const Route = createFileRoute("/best/$slug")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(guideQ(params.slug));
    if (!data.guide) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    const g = loaderData?.guide;
    if (!g) return { meta: [{ title: `Not found | ${siteName()}` }] };
    const entries = loaderData?.entries ?? [];
    const heroImage = entries.find((e) => e.image_url)?.image_url ?? null;
    return {
      meta: buildMeta({
        title: g.seo_title ?? `${g.title} | ${siteName()}`,
        description: g.meta_description ?? `${g.title}. Curated guide from ${siteName()}.`,
        path: `/best/${g.slug}`,
        type: "article",
        image: heroImage,
        section: `Best of ${cityName()}`,
      }),
      links: canonicalLinks(`/best/${g.slug}`),
    };
  },
  component: GuidePage,
});

function GuidePage() {
  const { guide, entries } = useSuspenseQuery(guideQ(Route.useParams().slug)).data;
  if (!guide) return null;
  return (
    <>
      <SiteHeader activePath="/best" />
      <main className="container-read py-10">
        <nav className="meta mb-4">
          <a href="/">Home</a> / <a href="/best">Best of {cityName()}</a>
        </nav>
        <p className="kicker">Best of {cityName()}</p>
        <h1 className="h1-news mt-2">{guide.title}</h1>
        {guide.intro_html && (
          <div className="prose-news mt-5" dangerouslySetInnerHTML={{ __html: guide.intro_html }} />
        )}
      </main>

      <section className="bg-[var(--ink-red)] text-white">
        <div className="container-news py-8 grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="kicker text-white/80">{siteName()} brief</p>
            <p className="h-display mt-1 text-2xl sm:text-3xl text-white">
              Love {cityName()}? Get the daily briefing — free.
            </p>
          </div>
          <GuideInlineSubscribe slug={guide.slug} />
        </div>
      </section>

      <section className="container-news py-6">

        {entries.length > 0 && <ol className="divide-y divide-[var(--hairline)] border-t border-[var(--ink)]">
          {entries.map((e, i) => (
            <li key={e.id} className="py-8 grid gap-6 md:grid-cols-12">
              <div className="md:col-span-1 serif text-3xl">{i + 1}</div>
              {e.image_url && (
                <img
                  src={e.image_url}
                  alt={e.business_name}
                  className="md:col-span-4 aspect-[3/2] w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              )}
              <div className={e.image_url ? "md:col-span-7" : "md:col-span-11"}>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="h2-news">{e.business_name}</h2>
                  {(e.is_sponsored || e.is_featured) && (
                    <span className="label-sponsored">
                      {e.is_sponsored ? "Sponsored" : "Featured"}
                    </span>
                  )}
                </div>
                {e.suburb && <p className="meta mt-1">{e.suburb}</p>}
                {e.blurb && <p className="serif mt-3">{e.blurb}</p>}
                <div className="meta mt-4 flex flex-wrap gap-4">
                  {e.website_url && (
                    <a
                      href={e.website_url}
                      target="_blank"
                      rel="noopener"
                      onClick={() => {
                        try {
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          (window as any).dataLayer?.push({
                            event: "guide_entry_outbound",
                            business: e.business_name,
                          });
                        } catch {
                          /* ignore */
                        }
                      }}
                    >
                      Website
                    </a>
                  )}
                  {e.booking_url && (
                    <a href={e.booking_url} target="_blank" rel="noopener">
                      Book
                    </a>
                  )}
                  {e.phone && <a href={`tel:${e.phone}`}>{e.phone}</a>}
                  <a href={e.source_url} target="_blank" rel="noopener nofollow ugc">
                    Source
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ol>}

        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Article",
            "@id": absUrl(`/best/${guide.slug}#article`),
            headline: guide.title,
            description:
              guide.meta_description ?? `${guide.title}. Curated guide from ${siteName()}.`,
            url: absUrl(`/best/${guide.slug}`),
            mainEntityOfPage: absUrl(`/best/${guide.slug}`),
            articleSection: `Best of ${cityName()}`,
            inLanguage: "en-AU",
            image: entries.find((e) => e.image_url)?.image_url ?? undefined,
            datePublished:
              (guide as { published_at?: string | null; created_at?: string | null }).published_at ??
              (guide as { created_at?: string | null }).created_at ??
              undefined,
            dateModified:
              (guide as { updated_at?: string | null }).updated_at ??
              (guide as { published_at?: string | null }).published_at ??
              undefined,
            author: {
              "@type": "Organization",
              name: siteName(),
              url: absUrl("/"),
            },
            isPartOf: {
              "@type": "CollectionPage",
              name: `Best of ${cityName()}`,
              url: absUrl("/best"),
            },
            publisher: {
              "@type": "NewsMediaOrganization",
              name: siteName(),
              url: absUrl("/"),
            },
          }}
        />


        <p className="meta mt-10 border-t border-[var(--hairline)] pt-6">
          This guide was compiled by AI from public sources and the listings shown, and screened
          before publishing. See our <a href="/editorial-standards">editorial standards</a>.
        </p>

        <div className="mt-10">
          <SponsorCta page={`/best/${guide.slug}`} />
        </div>

        <div className="mt-12 border-t border-[var(--ink)] pt-10">
          <NewsletterForm source={`guide:${guide.slug}`} variant="band" />
        </div>
      </section>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: guide.title,
          itemListElement: entries.map((e, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "LocalBusiness",
              name: e.business_name,
              address: e.suburb ?? undefined,
              url: e.website_url ?? undefined,
              telephone: e.phone ?? undefined,
            },
          })),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: absUrl("/") },
            {
              "@type": "ListItem",
              position: 2,
              name: `Best of ${cityName()}`,
              item: absUrl("/best"),
            },
            {
              "@type": "ListItem",
              position: 3,
              name: guide.title,
              item: absUrl(`/best/${guide.slug}`),
            },
          ],
        }}
      />
    </>
  );
}

function GuideInlineSubscribe({ slug }: { slug: string }) {
  const subscribe = useServerFn(subscribeNewsletter);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startRef = useRef(0);
  useEffect(() => {
    startRef.current = Date.now();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const company = (e.currentTarget.elements.namedItem("company") as HTMLInputElement)?.value ?? "";
    try {
      const res = await subscribe({
        data: { email, source: `guide-inline:${slug}`, company, startedAt: startRef.current },
      });
      if (res && res.ok === false) throw new Error(res.error ?? "Subscribe failed");
      setDone(true);
    } catch (err) {
      console.error("[guide-inline subscribe]", err);
      setError("Something went wrong — please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <p className="serif text-white text-lg" role="status" aria-live="polite">
        You&apos;re subscribed. First edition arrives tomorrow morning.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col sm:flex-row gap-2 sm:items-start">
      <label htmlFor="guide-inline-email" className="sr-only">
        Email address
      </label>
      <input
        id="guide-inline-email"
        type="email"
        required
        autoComplete="email"
        inputMode="email"
        placeholder="you@example.com.au"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="min-w-0 sm:min-w-[240px] rounded-sm border border-white/30 bg-white px-3 py-2 text-[var(--ink)] outline-none focus:border-white"
      />
      <div className="honeypot" aria-hidden="true">
        <label>
          Do not fill in
          <input type="text" name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <button
        type="submit"
        disabled={busy}
        className="rounded-sm bg-white px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-red)] hover:bg-white/90 disabled:opacity-60"
      >
        {busy ? "Subscribing" : "Subscribe Free"}
      </button>
      {error && (
        <p className="text-sm font-medium text-white sm:hidden" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

