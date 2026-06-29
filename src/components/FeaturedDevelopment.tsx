// Native "Featured Development" section for Daily Canberra.
//
// EDITORIAL VOICE — Canberra news / city-lifestyle angle: what the project
// means for the precinct, liveability, growth and the capital. This copy is
// written locally for THIS domain. It is NOT The Lawson's marketing copy and
// it is intentionally DISTINCT from any events-angle wording used on
// What's On Canberra (scaled/duplicated copy across the network kills SEO for
// the whole network).
//
// Hard rules enforced here:
//   - Price on application only; never a dollar value.
//   - Exactly ONE contextual outbound link to The Lawson per placement.
//   - Disclosure label from the feed shown verbatim near each placement.
//   - Render NOTHING when the feed is empty or errors.
import { useState } from "react";
import type {
  FeaturedDevelopmentPlacement,
  FeaturedDevelopmentSlot,
} from "@/lib/featured-development.functions";
import { cityName, siteName } from "@/lib/city";

type Props = {
  placements: FeaturedDevelopmentPlacement[];
};

export function FeaturedDevelopment({ placements }: Props) {
  if (!placements || placements.length === 0) return null;
  const house = placements.find((p) => p.slot_type === "house_display");
  const newsletter = placements.find((p) => p.slot_type === "newsletter_sponsor");
  if (!house && !newsletter) return null;

  return (
    <section
      aria-label="Featured development"
      className="container-news py-10 border-t border-[var(--ink)]"
    >
      {house && <HouseDisplay placement={house} />}
      {newsletter && (
        <div className="mt-10 border-t border-[var(--hairline)] pt-6">
          <NewsletterSponsor placement={newsletter} />
        </div>
      )}
    </section>
  );
}

function HouseDisplay({ placement }: { placement: FeaturedDevelopmentPlacement }) {
  const where = placement.suburb ? `${placement.suburb}, ${cityName()}` : cityName();
  // Local editorial voice — what this project means for the city. Written for
  // a Canberra news reader, not a property buyer.
  const localLede = `A new chapter for ${where}: ${placement.project_name} is taking shape, and it is the kind of project that quietly reshapes how a precinct feels day to day — the walk to the bus stop, the morning coffee queue, who shows up at the local park on a Sunday.`;
  const localContext = `Growth in ${cityName()} tends to arrive in increments. Each new build adds, or subtracts, from the texture of a neighbourhood: density, shopfronts, shade, the after-school rhythm. This is one to watch on that count.`;

  return (
    <article aria-labelledby="fd-house-heading">
      <p className="kicker">Featured Partner · Sponsored</p>
      <div className="mt-1 flex flex-col gap-6 md:flex-row md:items-start">
        {placement.image_url && (
          <div className="md:w-2/5">
            <img
              src={placement.image_url}
              alt={`${placement.project_name} in ${where}`}
              className="aspect-[3/2] w-full object-cover"
              loading="lazy"
              decoding="async"
              width={720}
              height={480}
            />
          </div>
        )}
        <div className="md:flex-1">
          <h2 id="fd-house-heading" className="h2-news">
            {placement.project_name}
          </h2>
          <p className="meta mt-1">{where}</p>
          <p className="dek mt-3" style={{ fontFamily: "Georgia, serif" }}>
            {localLede}
          </p>
          <p className="mt-3" style={{ fontFamily: "Georgia, serif" }}>
            {localContext}{" "}
            {/* Exactly ONE contextual in-content link out to The Lawson. */}
            <a
              href={placement.lawson_link_url}
              rel="sponsored noopener"
              target="_blank"
              className="underline"
            >
              Full project detail on The Lawson
            </a>
            .
          </p>
          {placement.fact_summary && (
            <p className="meta mt-3 italic">{placement.fact_summary}</p>
          )}
          <p className="mt-3 text-sm font-semibold">Price on application</p>

          <EnquiryForm
            projectId={placement.id}
            projectName={placement.project_name}
            slotType={placement.slot_type}
          />

          <p className="meta mt-4 text-xs opacity-80">{placement.disclosure_label}</p>
          {/* Canonical link to OUR self URL for this placement on this site;
              never points at The Lawson. Kept invisible — it exists only as
              a semantic signal that we are the canonical home on our domain
              for the surrounding editorial. */}
          <link rel="canonical" href={placement.self_canonical_url} />
        </div>
      </div>
    </article>
  );
}

function NewsletterSponsor({ placement }: { placement: FeaturedDevelopmentPlacement }) {
  const where = placement.suburb ? `${placement.suburb}` : cityName();
  return (
    <aside
      aria-label="Briefing sponsor"
      className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6"
    >
      {placement.image_url && (
        <img
          src={placement.image_url}
          alt={placement.project_name}
          className="h-24 w-32 flex-none object-cover"
          loading="lazy"
          decoding="async"
          width={256}
          height={192}
        />
      )}
      <div className="flex-1">
        <p className="kicker">Briefing sponsor · Sponsored</p>
        <p className="mt-1 text-sm" style={{ fontFamily: "Georgia, serif" }}>
          Today&apos;s {siteName()} briefing is supported by {placement.project_name} in {where}, part of the
          slow remake of how the inner city lives.
        </p>
        <p className="meta mt-2 text-xs opacity-80">{placement.disclosure_label}</p>
      </div>
    </aside>
  );
}

function EnquiryForm({
  projectId,
  projectName,
  slotType,
}: {
  projectId: string;
  projectName: string;
  slotType: FeaturedDevelopmentSlot;
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="mt-5 grid gap-3 border-t border-[var(--hairline)] pt-4 sm:max-w-lg"
      onSubmit={async (e) => {
        e.preventDefault();
        if (status === "sending") return;
        setStatus("sending");
        setError(null);
        const fd = new FormData(e.currentTarget);
        const payload = {
          name: String(fd.get("name") ?? ""),
          email: String(fd.get("email") ?? ""),
          phone: String(fd.get("phone") ?? ""),
          message: String(fd.get("message") ?? ""),
          project_id: projectId,
          slot_type: slotType,
          // honeypot
          company_website: String(fd.get("company_website") ?? ""),
        };
        try {
          const res = await fetch("/api/public/featured-development/enquiry", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
          });
          const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
          if (res.ok && json.ok) {
            setStatus("ok");
            (e.target as HTMLFormElement).reset();
          } else {
            setStatus("error");
            setError(json.error ?? "Something went wrong. Please try again.");
          }
        } catch {
          setStatus("error");
          setError("Network error. Please try again.");
        }
      }}
    >
      <p className="meta">Register your interest in {projectName}</p>
      <label className="grid gap-1 text-sm">
        <span>Name</span>
        <input
          name="name"
          required
          maxLength={120}
          className="border border-[var(--hairline)] bg-[var(--bg)] px-3 py-2"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span>Email</span>
        <input
          name="email"
          type="email"
          required
          maxLength={254}
          className="border border-[var(--hairline)] bg-[var(--bg)] px-3 py-2"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span>Phone (optional)</span>
        <input
          name="phone"
          type="tel"
          maxLength={40}
          className="border border-[var(--hairline)] bg-[var(--bg)] px-3 py-2"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span>Message</span>
        <textarea
          name="message"
          required
          maxLength={2000}
          rows={3}
          className="border border-[var(--hairline)] bg-[var(--bg)] px-3 py-2"
        />
      </label>
      {/* Honeypot field: hidden from humans, attractive to bots. */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", height: 0, overflow: "hidden" }}>
        <label>
          Company website
          <input name="company_website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="btn-primary"
          disabled={status === "sending"}
        >
          {status === "sending" ? "Sending…" : "Send enquiry"}
        </button>
        {status === "ok" && (
          <span className="meta text-sm" role="status">
            Thanks — the developer will be in touch.
          </span>
        )}
        {status === "error" && (
          <span className="meta text-sm" role="alert">
            {error ?? "Something went wrong."}
          </span>
        )}
      </div>
      <p className="meta text-xs opacity-70">
        Your enquiry is sent direct to the developer. {siteName()} does not store it.
      </p>
    </form>
  );
}
