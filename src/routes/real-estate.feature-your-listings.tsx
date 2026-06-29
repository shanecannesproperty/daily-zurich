import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { submitEnquiry } from "@/lib/forms.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { JsonLd } from "@/components/JsonLd";
import { buildMeta, canonicalLinks, absUrl } from "@/lib/seo";
import { cityName, siteName } from "@/lib/city";

export const Route = createFileRoute("/real-estate/feature-your-listings")({
  head: () => {
    const title = `Feature your listings | ${siteName()}`;
    const description = `Agents: feature your for-sale and for-rent listings on ${siteName()} in front of ${cityName()} buyers and renters.`;
    return {
      meta: buildMeta({
        title,
        description,
        path: "/real-estate/feature-your-listings",
      }),
      links: canonicalLinks("/real-estate/feature-your-listings"),
    };
  },
  component: FeatureYourListings,
});

function FeatureYourListings() {
  const submit = useServerFn(submitEnquiry);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const started = useRef(0);
  useEffect(() => {
    started.current = Date.now();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      intent: "agent_featured",
      agency: String(fd.get("agency") ?? ""),
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      listings_count: String(fd.get("listings_count") ?? ""),
      message: String(fd.get("message") ?? ""),
    };
    try {
      await submit({
        data: {
          type: "listing",
          payload,
          company: String(fd.get("company") ?? ""),
          startedAt: started.current,
        },
      });
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SiteHeader activePath="/real-estate" />
      <main className="container-read py-12">
        <p className="kicker text-[var(--ink-red)]">For agents</p>
        <h1 className="h1-news mt-2">Feature your listings on {siteName()}</h1>
        <p className="dek mt-3">
          Put your for-sale and for-rent stock in front of {cityName()} buyers and renters reading
          the city&apos;s daily. Featured placements are clearly labelled as paid, your agency keeps
          full attribution on every card, and enquiries go straight to you. Tell us about your
          agency and we will be in touch with placement options and pricing.
        </p>

        {done ? (
          <p className="serif mt-8 text-xl" role="status">
            Thank you. We will be in touch about placement options and pricing within one business
            day.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="label">Agency name</span>
              <input name="agency" required className="field" />
            </label>
            <label className="block">
              <span className="label">Your name</span>
              <input name="name" required className="field" />
            </label>
            <label className="block">
              <span className="label">Email</span>
              <input type="email" name="email" required className="field" />
            </label>
            <label className="block">
              <span className="label">Phone</span>
              <input name="phone" className="field" />
            </label>
            <label className="block">
              <span className="label">Roughly how many listings?</span>
              <input name="listings_count" placeholder="e.g. 10 to 20" className="field" />
            </label>
            <label className="block sm:col-span-2">
              <span className="label">Anything else?</span>
              <textarea name="message" rows={4} className="field" />
            </label>
            <div className="honeypot" aria-hidden="true">
              <label>
                Do not fill in
                <input type="text" name="company" tabIndex={-1} autoComplete="off" />
              </label>
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className="btn-primary" disabled={busy}>
                {busy ? "Sending" : "Tell us about your agency"}
              </button>
              <p className="meta mt-2">
                We&apos;ll only use your details to discuss featuring your listings. See our{" "}
                <a href="/privacy">Privacy Policy</a>.
              </p>
            </div>
          </form>
        )}
      </main>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          serviceType: "Property listing advertising",
          areaServed: cityName(),
          provider: { "@type": "Organization", name: siteName(), url: absUrl("/") },
          url: absUrl("/real-estate/feature-your-listings"),
        }}
      />
    </>
  );
}
