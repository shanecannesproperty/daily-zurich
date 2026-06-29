import { Link } from "@tanstack/react-router";
import { cityName, siteName } from "@/lib/city";

// The revenue CTA shown on the listings index: a clearly-scoped pitch for
// agents to feature their stock, linking to the dedicated landing page where
// the enquiry is captured. Copy is from frontend-spec.json ctaCopy. No
// em-dashes or double-hyphens.
export function AgentCtaBlock() {
  return (
    <section className="mt-14 border-y-[3px] border-[var(--ink)] bg-[color-mix(in_srgb,var(--ink)_4%,transparent)] px-5 py-8 sm:px-8">
      <p className="kicker text-[var(--ink-red)]">For agents</p>
      <h2 className="h2-news mt-2 max-w-2xl">Feature your listings on {siteName()}</h2>
      <p className="serif mt-3 max-w-2xl text-lg">
        Put your for-sale and for-rent stock in front of {cityName()} buyers and renters reading the
        city&apos;s daily. Featured placements are clearly labelled as paid, your agency keeps full
        attribution on every card, and enquiries go straight to you.
      </p>
      <div className="mt-5">
        <Link to="/real-estate/feature-your-listings" className="btn-primary no-underline">
          Tell us about your agency
        </Link>
      </div>
    </section>
  );
}
