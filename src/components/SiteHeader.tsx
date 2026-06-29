import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Wordmark } from "./Wordmark";
import { DarkModeToggle } from "./DarkModeToggle";
import { HeaderWeatherStrip } from "./HeaderWeatherStrip";
import { SavedNavBadge } from "./SavedNavBadge";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useT, type UiKey } from "@/lib/i18n";
import { ARTICLE_CATEGORIES, CATEGORY_LABELS } from "@/lib/schema";
import { cityBcp47, cityName, citySlug, cityTimezone, siteName, siteTagline } from "@/lib/city";

function TodayLabel() {
  const [label, setLabel] = useState("");
  useEffect(() => {
    setLabel(
      new Date().toLocaleDateString(cityBcp47(), {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: cityTimezone(),
      }),
    );
  }, []);
  return <span suppressHydrationWarning>{label || "\u00a0"}</span>;
}

type NavItem = { href: string; label: string; asLink?: boolean };

// Primary nav: 7 items max — only the most-reached sections.
// Everything else lives in the "All sections" panel.
const PRIMARY: NavItem[] = [
  { href: "/", label: "Home", asLink: true },
  { href: "/today", label: "Today", asLink: true },
  { href: "/news", label: "News" },
  { href: "/sport", label: "Sport" },
  { href: "/finance", label: "Finance" },
  { href: "/property", label: "Property" },
  { href: "/events", label: "Events" },
];

// Built per render (not at module load) so cityName() resolves against the
// active request's city. A module-level constant would bake in the boot-time
// fallback (canberra) and leak "Canberra life" / "Best of Canberra" onto every
// other city's nav.
function allGroups(): { title: string; items: NavItem[] }[] {
  return [
    {
      title: "News",
      items: [
        { href: "/news", label: "News" },
        { href: "/federal", label: "Federal" },
        { href: "/world", label: "The World" },
        { href: "/finance", label: "Finance" },
        { href: "/community", label: "Community" },
        { href: "/sport", label: "Sport" },
        { href: "/live", label: "Live blog" },
      ],
    },
    {
      title: `${cityName()} life`,
      items: [
        { href: "/weather", label: "Weather" },
        { href: "/events", label: "Events" },
        { href: "/property", label: "Property" },
        { href: "/this-weekend", label: "This weekend" },
        { href: "/watch", label: "Watch" },
        { href: "/podcast", label: "Listen", asLink: true },
        { href: "/best", label: `Best of ${cityName()}` },
        { href: `/best/day-trips-from-${citySlug()}`, label: "Day trips guide" },
        { href: "/directory", label: "Directory" },
        { href: "/ask", label: `Ask ${cityName()}` },
      ],
    },
    {
      title: "Records",
      items: [
        { href: "/real-estate", label: "Real estate" },
        { href: "/property", label: "Property" },
        { href: "/jobs", label: "Jobs" },
        { href: "/obituaries", label: "Obituaries" },
        { href: "/courts", label: "Courts" },
      ],
    },
  ];
}

// Render a primary item as a Link or anchor. ARTICLE_CATEGORIES is consulted
// only to keep the lint reference live; routing is by href.
void ARTICLE_CATEGORIES;
void CATEGORY_LABELS;

const NAV_KEY: Record<string, UiKey> = {
  "/": "home", "/today": "today", "/news": "news", "/finance": "finance",
  "/property": "property", "/wellness": "wellness", "/sport": "sport",
  "/events": "events", "/subscribe": "subscribe", "/advertise": "advertise",
  "/world": "world",
};

function PrimaryItem({ item, activePath }: { item: NavItem; activePath?: string }) {
  const t = useT();
  const active = activePath === item.href;
  const label = NAV_KEY[item.href] ? t(NAV_KEY[item.href]) : item.label;
  if (item.asLink) {
    return (
      <Link to={item.href} data-active={active} className="nav-link">
        {label}
      </Link>
    );
  }
  return (
    <a href={item.href} data-active={active} className="nav-link">
      {label}
    </a>
  );
}

export function SiteHeader({ activePath }: { activePath?: string }) {
  const t = useT();
  return (
    <header className="bg-background">
      {/* Top strip: date left, weather centre, subscribe right */}
      <div className="border-b border-[var(--hairline)]">
        <div className="container-news flex items-center justify-between gap-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-grey)]">
          <div className="truncate">
            <TodayLabel />
          </div>
          <HeaderWeatherStrip />
          <div className="flex items-center gap-2">
            <DarkModeToggle />
            <LanguageSwitcher />
            <Link
              to="/subscribe"
              className="rounded-sm bg-[var(--ink-red)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white no-underline hover:opacity-90"
            >
              {t("subscribeFree")}
            </Link>
          </div>
        </div>
      </div>

      {/* Masthead */}
      <div className="container-news pt-7 pb-4 text-center">
        <Link
          to="/"
          aria-label={`${siteName()} home`}
          className="inline-block no-underline hover:no-underline"
        >
          <Wordmark className="block mx-auto text-[44px] sm:text-[72px] md:text-[96px] leading-none" />
        </Link>
        <div className="mt-4 border-y border-[var(--ink-red)] py-1.5">
          <p className="meta text-[10px] uppercase tracking-[0.32em] text-[var(--ink)]">
            {siteTagline()}
          </p>
        </div>
      </div>

      {/* Navigation: balanced single-row section bar with an All Sections panel.
          Uses native <details> so it works without JS and hydrates cleanly. */}
      <nav
        aria-label="Sections"
        className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-neutral-200"
      >
        <div className="container-news">
          {/* Desktop bar */}
          <div className="hidden lg:flex items-center justify-between gap-6 px-4 py-3">
            <details className="nav-panel group">
              <summary className="nav-trigger" aria-label="Open all sections">
                <span className="nav-burger" aria-hidden>
                  <span />
                  <span />
                  <span />
                </span>
                <span>{t("allSections")}</span>
              </summary>
              <NavPanel activePath={activePath} />
            </details>

            <ul className="flex items-center justify-center gap-x-5 xl:gap-x-7 border-l border-neutral-200 pl-6">
              {PRIMARY.map((item) => (
                <li key={item.href}>
                  <PrimaryItem item={item} activePath={activePath} />
                </li>
              ))}
            </ul>

            <a href="/search" className="nav-trigger ml-auto" aria-label={`Search ${siteName()}`}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <span>{t("search")}</span>
            </a>
            <SavedNavBadge />
          </div>

          {/* Mobile / tablet bar */}
          <div className="flex lg:hidden items-center justify-between gap-3 px-4 py-3">
            <details className="nav-panel">
              <summary className="nav-trigger" aria-label="Open menu">
                <span className="nav-burger" aria-hidden>
                  <span />
                  <span />
                  <span />
                </span>
                <span>{t("menu")}</span>
              </summary>
              <NavPanel activePath={activePath} />
            </details>
            <ul className="nav-scroll flex items-center gap-x-4 overflow-x-auto border-l border-neutral-200 pl-4">
              {PRIMARY.slice(0, 5).map((item) => (
                <li key={item.href} className="shrink-0">
                  <PrimaryItem item={item} activePath={activePath} />
                </li>
              ))}
            </ul>
            <a href="/search" className="nav-trigger ml-auto" aria-label="Search">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </a>
          </div>
        </div>
      </nav>

    </header>
  );
}

function NavPanel({ activePath }: { activePath?: string }) {
  return (
    <div className="nav-panel-body">
      <div className="container-news py-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {allGroups().map((group) => (
            <div key={group.title}>
              <h3 className="kicker text-[11px] tracking-[0.22em] text-[var(--ink-red)] mb-3">
                {group.title}
              </h3>
              <ul className="space-y-2">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      data-active={activePath === item.href}
                      className="nav-panel-link"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
