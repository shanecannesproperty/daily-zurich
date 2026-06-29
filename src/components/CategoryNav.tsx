import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ARTICLE_CATEGORIES, CATEGORY_LABELS, type ArticleCategory } from "@/lib/schema";

interface NavItem {
  label: string;
  href: string;
  slug: string;
}

const EXTRA_ITEMS: NavItem[] = [
  { label: "Weather", href: "/weather", slug: "weather" },
  { label: "Jobs", href: "/jobs", slug: "jobs" },
  { label: "Trending", href: "/trending", slug: "trending" },
];

const SUBURBS = [
  "Belconnen",
  "Gungahlin",
  "Woden",
  "Tuggeranong",
  "Inner North",
  "Inner South",
  "Weston Creek",
  "Molonglo",
];

const LS_KEY = "dn_suburb";

function SuburbRow() {
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(LS_KEY);
      if (v) { setActive(v); setOpen(true); }
    } catch { /* localStorage unavailable in private mode */ }
  }, []);

  useEffect(() => {
    try {
      if (active) {
        localStorage.setItem(LS_KEY, active);
        document.body.dataset.suburbActive = active;
      } else {
        localStorage.removeItem(LS_KEY);
        delete document.body.dataset.suburbActive;
      }
    } catch { /* localStorage unavailable in private mode */ }
  }, [active]);

  if (!open && !active) {
    return (
      <div className="border-t border-[var(--hairline,#d6d2c9)] bg-[var(--bg,#f5f3ee)] print:hidden">
        <div className="container-news py-1.5">
          <button
            onClick={() => setOpen(true)}
            className="text-[11px] uppercase tracking-[0.14em] text-[var(--ink-grey,#7a7570)] hover:text-[var(--ink,#2d2d2d)]"
          >
            Filter by suburb ▾
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-[var(--hairline,#d6d2c9)] bg-[var(--bg,#f5f3ee)] print:hidden">
      <div className="container-news overflow-x-auto scrollbar-none py-1.5">
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--ink-grey,#7a7570)] shrink-0 mr-1">Suburb:</span>
          <button
            onClick={() => { setActive(null); setOpen(false); }}
            className={`px-2.5 py-0.5 text-[11px] uppercase tracking-[0.14em] border transition-colors ${
              !active
                ? "border-[var(--ink,#2d2d2d)] bg-[var(--ink,#2d2d2d)] text-[var(--surface,#fff)]"
                : "border-[var(--hairline,#d6d2c9)] text-[var(--ink,#2d2d2d)] hover:border-[var(--ink,#2d2d2d)]"
            }`}
          >
            All
          </button>
          {SUBURBS.map((s) => (
            <button
              key={s}
              onClick={() => setActive(active === s ? null : s)}
              className={`px-2.5 py-0.5 text-[11px] uppercase tracking-[0.14em] border transition-colors ${
                active === s
                  ? "border-[var(--ink,#2d2d2d)] bg-[var(--ink,#2d2d2d)] text-[var(--surface,#fff)]"
                  : "border-[var(--hairline,#d6d2c9)] text-[var(--ink,#2d2d2d)] hover:border-[var(--ink,#2d2d2d)]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CategoryNav({ activeSlug, showSuburbFilter = false }: { activeSlug?: string; showSuburbFilter?: boolean }) {
  const items: NavItem[] = [
    ...ARTICLE_CATEGORIES.map((c: ArticleCategory) => ({
      label: CATEGORY_LABELS[c],
      href: `/news/${c}`,
      slug: c,
    })),
    ...EXTRA_ITEMS,
  ];

  return (
    <>
      <nav
        aria-label="News categories"
        className="relative border-b border-[var(--hairline,#d6d2c9)] bg-[var(--bg,#f5f3ee)] print:hidden"
      >
        {/* Edge fades for mobile horizontal scroll */}
        <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[var(--bg,#f5f3ee)] to-transparent sm:hidden" />
        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[var(--bg,#f5f3ee)] to-transparent sm:hidden" />
        <div className="container-news overflow-x-auto scrollbar-none">
          <ul className="flex items-center gap-2 py-2 whitespace-nowrap">
            {items.map((item) => {
              const active = activeSlug === item.slug;
              const base =
                "inline-block px-3 py-1 text-xs uppercase tracking-[0.14em] border no-underline transition-colors";
              const cls = active
                ? `${base} border-[var(--accent,#A32D2D)] bg-[var(--accent,#A32D2D)] text-white`
                : `${base} border-[var(--hairline,#d6d2c9)] text-[var(--ink,#2d2d2d)] hover:border-[var(--ink,#2d2d2d)]`;
              return (
                <li key={item.slug}>
                  <Link to={item.href} className={cls}>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
      {showSuburbFilter && <SuburbRow />}
    </>
  );
}
