// Sponsored "Local Business Spotlight" placement. Hard-coded sample
// businesses for now with a "your business here" fallback when no sponsor
// is configured for the slot. Premium card styling (border + tinted bg).
import { ExternalLink, Phone } from "lucide-react";
import { cityName, siteEmail } from "@/lib/city";

type Sponsor = {
  name: string;
  blurb: string;
  cta: { label: string; href: string; icon?: "external" | "phone" };
  logoText?: string;
};

const SLOTS: Record<string, Sponsor | null> = {
  homepage: null,
  events: null,
};

const FALLBACK_EMAIL = () => siteEmail("advertising");

export function LocalBusinessSpotlight({
  slot = "homepage",
  className = "",
}: {
  slot?: keyof typeof SLOTS;
  className?: string;
}) {
  const sponsor = SLOTS[slot] ?? null;
  return (
    <aside
      className={
        "relative border-2 border-[var(--ink,#2d2d2d)] bg-[var(--surface,#e8e4dd)] p-5 " +
        className
      }
      aria-label="Sponsored local business"
    >
      <span className="absolute -top-2 left-4 inline-block bg-[var(--ink,#2d2d2d)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--bg,#f5f3ee)]">
        Sponsored
      </span>

      {sponsor ? (
        <>
          <div className="mt-2 flex items-start gap-3">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center border border-[var(--hairline,#d6d2c9)] bg-[var(--bg,#f5f3ee)] text-sm font-bold uppercase"
              aria-hidden
            >
              {sponsor.logoText ?? sponsor.name.slice(0, 2)}
            </div>
            <div>
              <p className="kicker">Local Business Spotlight</p>
              <h3 className="serif text-lg mt-1">{sponsor.name}</h3>
            </div>
          </div>
          <p className="meta mt-3 leading-relaxed">{sponsor.blurb}</p>
          <a
            href={sponsor.cta.href}
            target={sponsor.cta.icon === "external" ? "_blank" : undefined}
            rel={sponsor.cta.icon === "external" ? "noopener nofollow sponsored" : undefined}
            className="mt-4 inline-flex items-center gap-1.5 bg-[var(--accent,#A32D2D)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white no-underline hover:opacity-90"
          >
            {sponsor.cta.icon === "phone" ? (
              <Phone size={13} aria-hidden />
            ) : (
              <ExternalLink size={13} aria-hidden />
            )}
            {sponsor.cta.label}
          </a>
        </>
      ) : (
        <>
          <p className="kicker mt-2">Local Business Spotlight</p>
          <h3 className="serif text-lg mt-1">Your business here?</h3>
          <p className="meta mt-2 leading-relaxed">
            Reach thousands of engaged {cityName()} readers each week. Premium placement
            in our most-read sections from $200/week.
          </p>
          <a
            href={`mailto:${FALLBACK_EMAIL()}?subject=Local%20Business%20Spotlight`}
            className="mt-4 inline-flex items-center gap-1.5 border border-[var(--ink,#2d2d2d)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] hover:bg-[var(--ink,#2d2d2d)] hover:text-[var(--bg,#f5f3ee)]"
          >
            Contact us
          </a>
        </>
      )}
    </aside>
  );
}
